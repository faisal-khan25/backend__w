const { PayrollRecord, SalarySlip, User, EmployeeProfile } = require('../models');
const sequelize = require('../config/db');
const ApiError = require('../utils/ApiError');
const { round2 } = require('../utils/payrollCalculator');
const { generateSalarySlipPdf } = require('../utils/salarySlipPdf');

const COMPANY = {
  name: process.env.COMPANY_NAME || 'Union Workspace Pvt. Ltd.',
  address: process.env.COMPANY_ADDRESS || '4th Floor, Union Business Park, Bengaluru, Karnataka, India',
};

const PRIVILEGED_ROLES = ['ADMIN', 'HR'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const num = (v) => Number(v || 0);

function assertCanView(user, record) {
  if (PRIVILEGED_ROLES.includes(user.role)) return;
  if (record.employeeId !== user.id) throw ApiError.salarySlipForbidden();
}

async function loadPayroll(id) {
  const record = await PayrollRecord.findByPk(id, {
    include: [{ model: User, as: 'employee', include: [{ model: EmployeeProfile }] }],
  });
  if (!record) throw ApiError.payrollNotFound();
  if (!record.employee) throw ApiError.employeeNotFound();
  return record;
}

function formatSlipNumber(record, seq) {
  return `SAL-${record.year}-${String(record.month).padStart(2, '0')}-${String(seq).padStart(6, '0')}`;
}

async function getOrCreateSlip(record, actingUser) {
  const existing = await SalarySlip.findOne({ where: { payrollId: record.id } });
  if (existing) return existing;

  try {
    return await sequelize.transaction(async (transaction) => {
      const slip = await SalarySlip.create(
        { payrollId: record.id, generatedBy: actingUser.id, generatedAt: new Date() },
        { transaction }
      );
      slip.slipNumber = formatSlipNumber(record, slip.id);
      await slip.save({ transaction });
      return slip;
    });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      const winner = await SalarySlip.findOne({ where: { payrollId: record.id } });
      if (winner) return winner;
    }
    throw err;
  }
}

function computeFigures(record) {
  const basicSalary = round2(num(record.basicSalary));
  const hra = round2(num(record.hra));
  const allowances = round2(num(record.otherAllowances));
  const bonusOtherEarnings = round2(num(record.otherEarnings));
  const grossSalary = round2(basicSalary + hra + allowances + bonusOtherEarnings);

  const pf = round2(num(record.pf));
  const esi = round2(num(record.insurance));
  const professionalTax = round2(num(record.professionalTax));
  const tds = round2(num(record.tds));
  const lop = round2(num(record.lopAmount));
  const loanRecovery = round2(num(record.loanRecovery));
  const salaryAdvance = round2(num(record.salaryAdvance));
  const otherDeductionsEntered = round2(num(record.otherDeductions));
  const other = round2(loanRecovery + salaryAdvance + otherDeductionsEntered);

  const totalDeductions = round2(pf + esi + professionalTax + tds + lop + other);
  const netSalary = round2(Math.max(grossSalary - totalDeductions, 0));

  const drift =
    Math.abs(grossSalary - num(record.totalEarnings)) > 0.01 ||
    Math.abs(totalDeductions - num(record.totalDeductions)) > 0.01 ||
    Math.abs(netSalary - num(record.netSalary)) > 0.01;
  if (drift) {
    console.warn(`[salary-slip] Derived figures differ from stored payroll totals for payroll ${record.id}`);
  }

  return {
    earnings: { basicSalary, hra, allowances, bonusOtherEarnings, grossSalary },
    deductions: {
      pf,
      esi,
      professionalTax,
      tds,
      lossOfPay: lop,
      other,
      otherBreakdown: { loanRecovery, salaryAdvance, otherDeductions: otherDeductionsEntered },
      totalDeductions,
    },
    netSalary,
  };
}

function buildSalarySlip(record, slip) {
  const employee = record.employee;
  const profile = employee.EmployeeProfile || {};
  const { earnings, deductions, netSalary } = computeFigures(record);

  return {
    slipNumber: slip.slipNumber,
    generatedAt: slip.generatedAt,
    payrollId: record.id,
    payPeriod: {
      month: record.month,
      year: record.year,
      label: `${MONTH_NAMES[record.month - 1]} ${record.year}`,
    },
    company: { ...COMPANY },
    employee: {
      id: employee.id,
      employeeId: profile.employeeCode || employee.id,
      name: employee.getFullName(),
      department: employee.department || null,
      designation: profile.designation || null,
      dateOfJoining: profile.dateOfJoining || null,
    },
    attendance: {
      workingDays: num(record.workingDays),
      presentDays: num(record.presentDays),
      paidLeaveDays: num(record.paidLeaveDays),
      unpaidLeaveDays: num(record.unpaidLeaveDays),
      absentDays: num(record.absentDays),
      lopDays: num(record.lopDays),
    },
    earnings,
    deductions,
    netSalary,
    calculation: {
      grossSalary: earnings.grossSalary,
      totalDeductions: deductions.totalDeductions,
      netSalary,
      formula: 'Net Salary = Gross Salary - Total Deductions',
    },
    payment: {
      status: record.paymentStatus,
      date: record.paymentDate || null,
      reference: record.paymentReference || null,
    },
  };
}

async function resolveSalarySlip(actingUser, payrollId) {
  const record = await loadPayroll(payrollId);
  assertCanView(actingUser, record);

  if (!PayrollRecord.LOCKED_STATUSES.includes(record.status)) {
    throw ApiError.salarySlipNotAvailable(record.status);
  }
  if (num(record.totalEarnings) <= 0 && num(record.basicSalary) <= 0) {
    throw ApiError.salaryDataMissing();
  }

  const slip = await getOrCreateSlip(record, actingUser);
  return buildSalarySlip(record, slip);
}

async function getSalarySlip(actingUser, payrollId) {
  return resolveSalarySlip(actingUser, payrollId);
}

async function getSalarySlipPdf(actingUser, payrollId) {
  const slipData = await resolveSalarySlip(actingUser, payrollId);
  const buffer = await generateSalarySlipPdf(slipData);
  return { buffer, fileName: `${slipData.slipNumber}.pdf` };
}

module.exports = { getSalarySlip, getSalarySlipPdf, computeFigures, formatSlipNumber };
