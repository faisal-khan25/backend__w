process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-test-secret-test-secret-32b';
process.env.UPLOAD_ROOT = process.env.UPLOAD_ROOT || require('os').tmpdir() + '/salary-slip-test-uploads';

const { DB_NAME } = process.env;
if (!DB_NAME || !DB_NAME.endsWith('_test')) {
  console.error('Refusing to run: DB_NAME must be set and end with "_test" (this suite wipes all tables).');
  process.exit(1);
}

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const app = require('../src/app');
const sequelize = require('../src/config/db');
const { User, EmployeeProfile, EmployeeSalaryStructure, Attendance, SalarySlip } = require('../src/models');
const { generateAccessToken } = require('../src/utils/jwt');

const MONTH = 9;
const YEAR = 2026;

let server;
let base;
const ctx = {};

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

async function api(method, url, { token, body } = {}) {
  const res = await fetch(`${base}/api${url}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res;
}

async function makeUser(firstName, role, department) {
  const u = await User.create({ firstName, lastName: 'Tester', email: `${firstName.toLowerCase()}@test.local`, role, department });
  return { user: u, token: generateAccessToken(u.id, u.email, role) };
}

function weekdaysOf(month, year) {
  const out = [];
  const last = new Date(year, month, 0).getDate();
  for (let d = 1; d <= last; d += 1) {
    const dow = new Date(year, month - 1, d).getDay();
    if (dow !== 0 && dow !== 6) out.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  return out;
}

async function createFinalizedPayroll(adminToken, employeeId, payload) {
  const created = await api('POST', '/v1/admin/payroll', { token: adminToken, body: { employeeId, month: MONTH, year: YEAR, ...payload } });
  assert.equal(created.status, 201, await created.clone().text());
  const payroll = await created.json();
  assert.equal((await api('POST', `/v1/admin/payroll/${payroll.id}/approve`, { token: adminToken })).status, 200);
  assert.equal((await api('POST', `/v1/admin/payroll/${payroll.id}/finalize`, { token: adminToken })).status, 200);
  return payroll;
}

test.before(async () => {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });

  server = http.createServer(app).listen(0);
  base = `http://127.0.0.1:${server.address().port}`;

  ctx.admin = await makeUser('Admin', 'ADMIN', 'Management');
  ctx.hr = await makeUser('Hr', 'HR', 'Human Resources');
  ctx.emp = await makeUser('Asha', 'EMPLOYEE', 'Engineering');
  ctx.other = await makeUser('Ravi', 'EMPLOYEE', 'Sales');
  ctx.mgr = await makeUser('Mgr', 'MANAGER', 'Engineering');

  await EmployeeProfile.create({ userId: ctx.emp.user.id, employeeCode: 'EMP-00042', designation: 'Senior Software Engineer' });
  await EmployeeProfile.create({ userId: ctx.other.user.id, employeeCode: 'EMP-00043', designation: 'Sales Executive' });

  for (const u of [ctx.emp.user, ctx.other.user]) {
    await EmployeeSalaryStructure.create({
      userId: u.id, basicSalary: 50000, hra: 20000, otherAllowances: 10000, grossSalary: 80000, effectiveFrom: '2026-01-01',
    });
  }

  const days = weekdaysOf(MONTH, YEAR);
  assert.equal(days.length, 22);
  for (const date of days.slice(0, 20)) await Attendance.create({ userId: ctx.emp.user.id, date, status: 'PRESENT' });
  for (const date of days) await Attendance.create({ userId: ctx.other.user.id, date, status: 'PRESENT' });

  ctx.payrollInput = {
    otherEarnings: 5000,
    deductions: { pf: 6000, insurance: 800, professionalTax: 200, tds: 2500, loanRecovery: 1000, otherDeductions: 500 },
  };
  ctx.payroll = await createFinalizedPayroll(ctx.admin.token, ctx.emp.user.id, ctx.payrollInput);
  ctx.payrollOther = await createFinalizedPayroll(ctx.admin.token, ctx.other.user.id, {});

});

test.after(async () => {
  if (server) await new Promise((r) => server.close(r));
  await sequelize.close();
});

const expected = (() => {
  const gross = 50000 + 20000 + 10000 + 5000;
  const lop = round2((80000 / 22) * 2);
  const ded = round2(6000 + 800 + 200 + 2500 + lop + 1000 + 500);
  return { gross, lop, ded, net: round2(gross - ded) };
})();

test('1. generates a salary slip (HR/Admin and the employee themself)', async () => {
  for (const who of [ctx.admin, ctx.hr, ctx.emp]) {
    const res = await api('GET', `/v1/payroll/${ctx.payroll.id}/salary-slip`, { token: who.token });
    assert.equal(res.status, 200);
    const slip = await res.json();
    assert.equal(slip.payrollId, ctx.payroll.id);
  }
});

test('2. employee details are correct', async () => {
  const slip = await (await api('GET', `/v1/payroll/${ctx.payroll.id}/salary-slip`, { token: ctx.emp.token })).json();
  assert.equal(slip.employee.name, 'Asha Tester');
  assert.equal(slip.employee.employeeId, 'EMP-00042');
  assert.equal(slip.employee.department, 'Engineering');
  assert.equal(slip.employee.designation, 'Senior Software Engineer');
  assert.deepEqual([slip.payPeriod.month, slip.payPeriod.year, slip.payPeriod.label], [9, 2026, 'September 2026']);
  assert.equal(slip.attendance.workingDays, 22);
  assert.equal(slip.attendance.lopDays, 2);
});

test('3-4. earnings and gross salary come from payroll data', async () => {
  const { earnings } = await (await api('GET', `/v1/payroll/${ctx.payroll.id}/salary-slip`, { token: ctx.emp.token })).json();
  assert.equal(earnings.basicSalary, 50000);
  assert.equal(earnings.hra, 20000);
  assert.equal(earnings.allowances, 10000);
  assert.equal(earnings.bonusOtherEarnings, 5000);
  assert.equal(earnings.grossSalary, expected.gross);
  assert.equal(earnings.grossSalary, earnings.basicSalary + earnings.hra + earnings.allowances + earnings.bonusOtherEarnings);
});

test('5. deductions are correct (incl. LOP from attendance)', async () => {
  const { deductions: d } = await (await api('GET', `/v1/payroll/${ctx.payroll.id}/salary-slip`, { token: ctx.emp.token })).json();
  assert.equal(d.pf, 6000);
  assert.equal(d.esi, 800);
  assert.equal(d.professionalTax, 200);
  assert.equal(d.tds, 2500);
  assert.equal(d.lossOfPay, expected.lop);
  assert.equal(d.other, 1500);
  assert.equal(d.totalDeductions, expected.ded);
});

test('6. net salary = gross - total deductions, and matches the stored payroll', async () => {
  const slip = await (await api('GET', `/v1/payroll/${ctx.payroll.id}/salary-slip`, { token: ctx.emp.token })).json();
  assert.equal(slip.netSalary, expected.net);
  assert.equal(slip.netSalary, round2(slip.earnings.grossSalary - slip.deductions.totalDeductions));
  assert.equal(slip.netSalary, ctx.payroll.netSalary, 'slip net must equal admin payroll net');
  assert.equal(slip.deductions.totalDeductions, ctx.payroll.totalDeductions);
});

test('slip number: SAL-YYYY-MM-NNNNNN, stable across calls, unique per payroll', async () => {
  const a1 = await (await api('GET', `/v1/payroll/${ctx.payroll.id}/salary-slip`, { token: ctx.emp.token })).json();
  const a2 = await (await api('GET', `/v1/payroll/${ctx.payroll.id}/salary-slip`, { token: ctx.hr.token })).json();
  const b = await (await api('GET', `/v1/payroll/${ctx.payrollOther.id}/salary-slip`, { token: ctx.hr.token })).json();
  assert.match(a1.slipNumber, /^SAL-2026-09-\d{6}$/);
  assert.equal(a1.slipNumber, a2.slipNumber);
  assert.notEqual(a1.slipNumber, b.slipNumber);
  assert.equal(await SalarySlip.count({ where: { payrollId: ctx.payroll.id } }), 1);
});

test('concurrent first requests still yield exactly one slip number', async () => {
  const fresh = await makeUser('Concur', 'EMPLOYEE', 'QA');
  await EmployeeSalaryStructure.create({ userId: fresh.user.id, basicSalary: 30000, hra: 0, otherAllowances: 0, grossSalary: 30000, effectiveFrom: '2026-01-01' });
  const p = await createFinalizedPayroll(ctx.admin.token, fresh.user.id, {});
  const results = await Promise.all(
    Array.from({ length: 6 }, () => api('GET', `/v1/payroll/${p.id}/salary-slip`, { token: fresh.token }).then((r) => r.json()))
  );
  assert.equal(new Set(results.map((r) => r.slipNumber)).size, 1);
  assert.equal(await SalarySlip.count({ where: { payrollId: p.id } }), 1);
});

test('7-8. generates and downloads a valid PDF with the right content', async () => {
  const res = await api('GET', `/v1/payroll/${ctx.payroll.id}/salary-slip/pdf`, { token: ctx.emp.token });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'application/pdf');
  const slip = await (await api('GET', `/v1/payroll/${ctx.payroll.id}/salary-slip`, { token: ctx.emp.token })).json();
  assert.equal(res.headers.get('content-disposition'), `attachment; filename="${slip.slipNumber}.pdf"`);

  const buf = Buffer.from(await res.arrayBuffer());
  assert.equal(buf.subarray(0, 5).toString(), '%PDF-');
  assert.ok(buf.length > 2000);

  const file = path.join(os.tmpdir(), `${slip.slipNumber}.pdf`);
  fs.writeFileSync(file, buf);
  ctx.pdfFile = file;
  assert.equal(execFileSync('pdfinfo', [file]).toString().match(/Pages:\s+(\d+)/)[1], '1');
  const text = execFileSync('pdftotext', ['-layout', file, '-']).toString();
  for (const needle of [
    slip.slipNumber, 'SALARY SLIP', 'September 2026', 'Asha Tester', 'EMP-00042', 'Engineering', 'Senior Software Engineer',
    'Gross Salary', 'Total Deductions', 'NET SALARY', 'Rs. 85,000.00', 'Rs. 66,727.27', 'Working Days', 'LOP Days',
    'Union Workspace', 'Generated On', 'Sixty Six Thousand Seven Hundred Twenty Seven',
  ]) {
    assert.ok(text.includes(needle), `PDF is missing "${needle}"`);
  }
});

test('9. invalid / unknown payroll id -> 404 (json and pdf)', async () => {
  for (const suffix of ['', '/pdf']) {
    const res = await api('GET', `/v1/payroll/does-not-exist/salary-slip${suffix}`, { token: ctx.admin.token });
    assert.equal(res.status, 404);
    assert.equal((await res.json()).error, 'Payroll record not found');
  }
});

test('10. unauthorized access is blocked', async () => {
  assert.equal((await api('GET', `/v1/payroll/${ctx.payroll.id}/salary-slip`)).status, 401);
  assert.equal((await api('GET', `/v1/payroll/${ctx.payroll.id}/salary-slip/pdf`)).status, 401);
  for (const who of [ctx.other, ctx.mgr]) {
    for (const suffix of ['', '/pdf']) {
      const res = await api('GET', `/v1/payroll/${ctx.payroll.id}/salary-slip${suffix}`, { token: who.token });
      assert.equal(res.status, 403);
      const text = await res.text();
      assert.ok(!text.includes('50000') && !text.includes('Asha'), 'a 403 must not leak salary data');
    }
  }
  assert.equal((await api('GET', `/v1/payroll/${ctx.payrollOther.id}/salary-slip`, { token: ctx.other.token })).status, 200);
});

test('slip is refused until payroll is finalized (missing/incomplete data handled)', async () => {
  const fresh = await makeUser('Draft', 'EMPLOYEE', 'Ops');
  await EmployeeSalaryStructure.create({ userId: fresh.user.id, basicSalary: 20000, hra: 0, otherAllowances: 0, grossSalary: 20000, effectiveFrom: '2026-01-01' });
  const created = await (await api('POST', '/v1/admin/payroll', { token: ctx.admin.token, body: { employeeId: fresh.user.id, month: MONTH, year: YEAR } })).json();
  for (const who of [ctx.admin, fresh]) {
    const res = await api('GET', `/v1/payroll/${created.id}/salary-slip`, { token: who.token });
    assert.equal(res.status, 409);
    assert.match((await res.json()).error, /finalized/);
  }
  assert.equal(await SalarySlip.count({ where: { payrollId: created.id } }), 0, 'no slip number is burned for unfinalized payroll');
});

test('regression: existing payslip flow still works after salary-slip was used', async () => {
  const gen = await api('POST', `/v1/admin/payroll/${ctx.payroll.id}/generate-payslip`, { token: ctx.admin.token });
  assert.equal(gen.status, 200);
  const dl = await api('GET', `/v1/admin/payroll/${ctx.payroll.id}/payslip/download`, { token: ctx.admin.token });
  assert.equal(dl.status, 200);
  assert.equal((await api('GET', `/v1/employee/payroll/${ctx.payroll.id}`, { token: ctx.emp.token })).status, 200);
  assert.equal((await api('GET', `/v1/employee/payroll/${ctx.payrollOther.id}`, { token: ctx.emp.token })).status, 404);
  const mine = await (await api('GET', '/v1/payroll/my', { token: ctx.emp.token })).json();
  assert.equal(mine.find((m) => m.month === MONTH && m.year === YEAR).payrollId, ctx.payroll.id);
  assert.equal((await api('GET', `/v1/payroll/${ctx.payroll.id}/salary-slip`, { token: ctx.emp.token })).status, 200);
});
