const { Op } = require('sequelize');
const {
  PayrollRecord,
  PayrollEarning,
  PayrollDeduction,
  PayrollAudit,
  Payslip,
  User,
  EmployeeProfile,
} = require('../models');
const ApiError = require('../utils/ApiError');
const { calculatePayroll, monthRange } = require('../utils/payrollCalculator');
const { getActiveStructureAsOf } = require('./salaryStructure.service');
const { generatePayslipPdf } = require('../utils/payslipPdf');
const { notifyUser } = require('./notification.service');

const STATUS_ORDER = PayrollRecord.STATUSES;

function toResponse(p, { includeLines = false } = {}) {
  const base = {
    id: p.id,
    employeeId: p.employeeId,
    employee: p.employee
      ? {
          id: p.employee.id,
          name: p.employee.getFullName ? p.employee.getFullName() : p.employee.firstName,
          department: p.employee.department,
          employeeCode: p.employee.EmployeeProfile?.employeeCode,
          designation: p.employee.EmployeeProfile?.designation,
        }
      : undefined,
    month: p.month,
    year: p.year,
    salaryStructureId: p.salaryStructureId,
    basicSalary: Number(p.basicSalary),
    hra: Number(p.hra),
    otherAllowances: Number(p.otherAllowances),
    otherEarnings: Number(p.otherEarnings),
    grossSalary: Number(p.grossSalary),
    totalEarnings: Number(p.totalEarnings),
    manualOverride: p.manualOverride,
    originalGrossSalary: p.originalGrossSalary !== null ? Number(p.originalGrossSalary) : null,
    overrideReason: p.overrideReason,
    overriddenBy: p.overriddenBy,
    overriddenAt: p.overriddenAt,
    workingDays: Number(p.workingDays),
    presentDays: Number(p.presentDays),
    paidLeaveDays: Number(p.paidLeaveDays),
    unpaidLeaveDays: Number(p.unpaidLeaveDays),
    absentDays: Number(p.absentDays),
    lopDays: Number(p.lopDays),
    lopAmount: Number(p.lopAmount),
    pf: Number(p.pf),
    professionalTax: Number(p.professionalTax),
    tds: Number(p.tds),
    insurance: Number(p.insurance),
    loanRecovery: Number(p.loanRecovery),
    salaryAdvance: Number(p.salaryAdvance),
    otherDeductions: Number(p.otherDeductions),
    totalDeductions: Number(p.totalDeductions),
    netSalary: Number(p.netSalary),
    status: p.status,
    paymentStatus: p.paymentStatus,
    paymentDate: p.paymentDate,
    paymentReference: p.paymentReference,
    createdBy: p.createdBy,
    approvedBy: p.approvedBy,
    approvedAt: p.approvedAt,
    finalizedBy: p.finalizedBy,
    finalizedAt: p.finalizedAt,
    paidBy: p.paidBy,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    hasPayslip: !!p.payslip,
    payslipId: p.payslip ? p.payslip.id : null,
  };
  if (includeLines) {
    base.earningLines = (p.earningLines || []).map((l) => ({ type: l.type, label: l.label, amount: Number(l.amount) }));
    base.deductionLines = (p.deductionLines || []).map((l) => ({ type: l.type, label: l.label, amount: Number(l.amount) }));
    base.auditTrail = (p.auditTrail || [])
      .slice()
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .map((a) => ({
        action: a.action,
        fromStatus: a.fromStatus,
        toStatus: a.toStatus,
        performedBy: a.performedBy,
        remarks: a.remarks,
        createdAt: a.createdAt,
      }));
  }
  return base;
}

const DEFAULT_INCLUDES = [
  { model: User, as: 'employee', attributes: ['id', 'firstName', 'lastName', 'department'], include: [{ model: EmployeeProfile }] },
  { model: Payslip, as: 'payslip' },
];

const FULL_INCLUDES = [
  ...DEFAULT_INCLUDES,
  { model: PayrollEarning, as: 'earningLines' },
  { model: PayrollDeduction, as: 'deductionLines' },
  { model: PayrollAudit, as: 'auditTrail' },
];

async function writeAudit(payrollId, action, performedBy, fromStatus, toStatus, remarks) {
  await PayrollAudit.create({ payrollId, action, performedBy, fromStatus, toStatus, remarks: remarks || null });
}

async function saveLines(payrollId, calc) {
  await PayrollEarning.destroy({ where: { payrollId } });
  await PayrollDeduction.destroy({ where: { payrollId } });

  const earningRows = [
    { payrollId, type: 'BASIC', label: 'Basic Salary', amount: calc.basicSalary },
    { payrollId, type: 'HRA', label: 'HRA', amount: calc.hra },
    { payrollId, type: 'ALLOWANCE', label: 'Other Allowances', amount: calc.otherAllowances },
  ];
  if (Number(calc.otherEarnings) > 0) {
    earningRows.push({ payrollId, type: 'OTHER', label: 'Other Earnings', amount: calc.otherEarnings });
  }
  await PayrollEarning.bulkCreate(earningRows);

  const deductionRows = [
    { payrollId, type: 'PF', label: 'Provident Fund', amount: calc.pf },
    { payrollId, type: 'PROFESSIONAL_TAX', label: 'Professional Tax', amount: calc.professionalTax },
    { payrollId, type: 'TDS', label: 'TDS', amount: calc.tds },
    { payrollId, type: 'LOP', label: 'Loss of Pay', amount: calc.lopAmount },
    { payrollId, type: 'INSURANCE', label: 'Insurance', amount: calc.insurance },
    { payrollId, type: 'LOAN_RECOVERY', label: 'Loan Recovery', amount: calc.loanRecovery },
    { payrollId, type: 'SALARY_ADVANCE', label: 'Salary Advance', amount: calc.salaryAdvance },
    { payrollId, type: 'OTHER', label: 'Other Deductions', amount: calc.otherDeductions },
  ];
  await PayrollDeduction.bulkCreate(deductionRows);
}

async function previewCalculation({ employeeId, month, year, overrideGrossSalary, otherEarnings, deductions }) {
  const employee = await User.findByPk(employeeId);
  if (!employee) throw ApiError.employeeNotFound();

  const { end } = monthRange(month, year);
  const structure = await getActiveStructureAsOf(employeeId, end);
  if (!structure) throw ApiError.salaryStructureRequired();

  const calc = await calculatePayroll({
    employeeId,
    month,
    year,
    structure,
    overrideGrossSalary,
    otherEarnings,
    deductionInputs: deductions,
  });

  return { employeeId, month, year, salaryStructureId: structure.id, ...calc };
}

async function createPayroll(actingUser, payload) {
  const { employeeId, month, year, overrideGrossSalary, overrideReason, otherEarnings, deductions } = payload;

  const existing = await PayrollRecord.findOne({ where: { employeeId, month, year } });
  if (existing) throw ApiError.payrollAlreadyExists();

  if (overrideGrossSalary !== undefined && overrideGrossSalary !== null && !overrideReason) {
    throw ApiError.overrideReasonRequired();
  }

  const preview = await previewCalculation({ employeeId, month, year, overrideGrossSalary, otherEarnings, deductions });

  const record = await PayrollRecord.create({
    employeeId,
    month,
    year,
    salaryStructureId: preview.salaryStructureId,
    basicSalary: preview.basicSalary,
    hra: preview.hra,
    otherAllowances: preview.otherAllowances,
    otherEarnings: preview.otherEarnings,
    grossSalary: preview.grossSalary,
    totalEarnings: preview.totalEarnings,
    manualOverride: preview.manualOverride,
    originalGrossSalary: preview.originalGrossSalary,
    overrideReason: preview.manualOverride ? overrideReason : null,
    overriddenBy: preview.manualOverride ? actingUser.id : null,
    overriddenAt: preview.manualOverride ? new Date() : null,
    workingDays: preview.workingDays,
    presentDays: preview.presentDays,
    paidLeaveDays: preview.paidLeaveDays,
    unpaidLeaveDays: preview.unpaidLeaveDays,
    absentDays: preview.absentDays,
    lopDays: preview.lopDays,
    lopAmount: preview.lopAmount,
    pf: preview.pf,
    professionalTax: preview.professionalTax,
    tds: preview.tds,
    insurance: preview.insurance,
    loanRecovery: preview.loanRecovery,
    salaryAdvance: preview.salaryAdvance,
    otherDeductions: preview.otherDeductions,
    totalDeductions: preview.totalDeductions,
    netSalary: preview.netSalary,
    status: 'CALCULATED',
    createdBy: actingUser.id,
  });

  await saveLines(record.id, preview);
  await writeAudit(
    record.id,
    'CALCULATED',
    actingUser.id,
    null,
    'CALCULATED',
    preview.manualOverride ? `Manual override applied: ${overrideReason}` : null
  );

  return getById(record.id);
}

async function recalculate(actingUser, id, payload = {}) {
  const record = await PayrollRecord.findByPk(id);
  if (!record) throw ApiError.payrollNotFound();
  if (PayrollRecord.LOCKED_STATUSES.includes(record.status)) throw ApiError.payrollLocked();

  const { overrideGrossSalary, overrideReason, otherEarnings, deductions } = payload;
  if (overrideGrossSalary !== undefined && overrideGrossSalary !== null && !overrideReason) {
    throw ApiError.overrideReasonRequired();
  }

  const { end } = monthRange(record.month, record.year);
  const structure = await getActiveStructureAsOf(record.employeeId, end);
  if (!structure) throw ApiError.salaryStructureRequired();

  const calc = await calculatePayroll({
    employeeId: record.employeeId,
    month: record.month,
    year: record.year,
    structure,
    overrideGrossSalary,
    otherEarnings: otherEarnings !== undefined ? otherEarnings : record.otherEarnings,
    deductionInputs:
      deductions || {
        pf: record.pf,
        professionalTax: record.professionalTax,
        tds: record.tds,
        insurance: record.insurance,
        loanRecovery: record.loanRecovery,
        salaryAdvance: record.salaryAdvance,
        otherDeductions: record.otherDeductions,
      },
  });

  const fromStatus = record.status;
  Object.assign(record, {
    salaryStructureId: structure.id,
    basicSalary: calc.basicSalary,
    hra: calc.hra,
    otherAllowances: calc.otherAllowances,
    otherEarnings: calc.otherEarnings,
    grossSalary: calc.grossSalary,
    totalEarnings: calc.totalEarnings,
    manualOverride: calc.manualOverride,
    originalGrossSalary: calc.originalGrossSalary,
    overrideReason: calc.manualOverride ? overrideReason || record.overrideReason : null,
    overriddenBy: calc.manualOverride ? actingUser.id : null,
    overriddenAt: calc.manualOverride ? new Date() : null,
    workingDays: calc.workingDays,
    presentDays: calc.presentDays,
    paidLeaveDays: calc.paidLeaveDays,
    unpaidLeaveDays: calc.unpaidLeaveDays,
    absentDays: calc.absentDays,
    lopDays: calc.lopDays,
    lopAmount: calc.lopAmount,
    pf: calc.pf,
    professionalTax: calc.professionalTax,
    tds: calc.tds,
    insurance: calc.insurance,
    loanRecovery: calc.loanRecovery,
    salaryAdvance: calc.salaryAdvance,
    otherDeductions: calc.otherDeductions,
    totalDeductions: calc.totalDeductions,
    netSalary: calc.netSalary,
    status: 'CALCULATED',
  });
  await record.save();
  await saveLines(record.id, calc);
  await writeAudit(
    record.id,
    calc.manualOverride ? 'OVERRIDDEN' : 'RECALCULATED',
    actingUser.id,
    fromStatus,
    'CALCULATED',
    calc.manualOverride ? `Manual override applied: ${overrideReason || record.overrideReason}` : null
  );

  return getById(record.id);
}

async function listAll({ employeeId, month, year, department, status, paymentStatus, search, page = 1, pageSize = 20 } = {}) {
  const where = {};
  if (employeeId) where.employeeId = employeeId;
  if (month) where.month = month;
  if (year) where.year = year;
  if (status) where.status = status;
  if (paymentStatus) where.paymentStatus = paymentStatus;

  const employeeWhere = {};
  if (department) employeeWhere.department = department;
  if (search) {
    employeeWhere[Op.or] = [{ firstName: { [Op.like]: `%${search}%` } }, { lastName: { [Op.like]: `%${search}%` } }];
  }

  const limit = Number(pageSize);
  const offset = (Number(page) - 1) * limit;

  const { rows, count } = await PayrollRecord.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: 'employee',
        attributes: ['id', 'firstName', 'lastName', 'department'],
        where: Object.keys(employeeWhere).length ? employeeWhere : undefined,
        include: [{ model: EmployeeProfile }],
      },
      { model: Payslip, as: 'payslip' },
    ],
    order: [
      ['year', 'DESC'],
      ['month', 'DESC'],
      ['createdAt', 'DESC'],
    ],
    limit,
    offset,
    distinct: true,
  });

  return {
    payrolls: rows.map((r) => toResponse(r)),
    pagination: { page: Number(page), pageSize: limit, total: count, totalPages: Math.ceil(count / limit) },
  };
}

async function getRecordOrThrow(id, includes) {
  const record = await PayrollRecord.findByPk(id, { include: includes });
  if (!record) throw ApiError.payrollNotFound();
  return record;
}

async function getById(id) {
  const record = await getRecordOrThrow(id, FULL_INCLUDES);
  return toResponse(record, { includeLines: true });
}

async function updatePayroll(actingUser, id, payload) {
  const record = await PayrollRecord.findByPk(id);
  if (!record) throw ApiError.payrollNotFound();
  if (PayrollRecord.LOCKED_STATUSES.includes(record.status)) throw ApiError.payrollLocked();
  return recalculate(actingUser, id, payload);
}

function assertTransition(record, expectedCurrent, next) {
  if (record.status !== expectedCurrent) {
    throw ApiError.invalidPayrollTransition(record.status, next);
  }
}

async function approve(actingUser, id) {
  const record = await getRecordOrThrow(id);
  assertTransition(record, 'CALCULATED', 'APPROVED');
  record.status = 'APPROVED';
  record.approvedBy = actingUser.id;
  record.approvedAt = new Date();
  await record.save();
  await writeAudit(record.id, 'APPROVED', actingUser.id, 'CALCULATED', 'APPROVED');
  return getById(id);
}

async function finalize(actingUser, id) {
  const record = await getRecordOrThrow(id);
  assertTransition(record, 'APPROVED', 'FINALIZED');
  record.status = 'FINALIZED';
  record.finalizedBy = actingUser.id;
  record.finalizedAt = new Date();
  await record.save();
  await writeAudit(record.id, 'FINALIZED', actingUser.id, 'APPROVED', 'FINALIZED');
  return getById(id);
}

function monthLabel(month, year) {
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

async function generatePayslip(actingUser, id) {
  const record = await getRecordOrThrow(id, [
    { model: User, as: 'employee', include: [{ model: EmployeeProfile }] },
    { model: PayrollEarning, as: 'earningLines' },
    { model: PayrollDeduction, as: 'deductionLines' },
  ]);
  if (!['FINALIZED', 'PAYSLIP_GENERATED'].includes(record.status)) {
    throw ApiError.invalidPayrollTransition(record.status, 'PAYSLIP_GENERATED');
  }

  const payslipNumber = `PSL-${record.year}${String(record.month).padStart(2, '0')}-${record.employeeId.slice(0, 8).toUpperCase()}`;
  const pdfPath = await generatePayslipPdf({ payroll: record, employee: record.employee, payslipNumber });

  const [slip] = await Payslip.findOrCreate({
    where: { userId: record.employeeId, month: record.month, year: record.year },
    defaults: {
      userId: record.employeeId,
      month: record.month,
      year: record.year,
      basicSalary: record.basicSalary,
      allowances: Number(record.hra) + Number(record.otherAllowances) + Number(record.otherEarnings),
      deductions: record.totalDeductions,
      netPay: record.netSalary,
      generatedBy: actingUser.id,
      payrollId: record.id,
      payslipNumber,
      pdfPath,
      status: record.paymentStatus === 'PAID' ? 'PAID' : 'GENERATED',
    },
  });

  slip.payrollId = record.id;
  slip.payslipNumber = payslipNumber;
  slip.pdfPath = pdfPath;
  slip.basicSalary = record.basicSalary;
  slip.allowances = Number(record.hra) + Number(record.otherAllowances) + Number(record.otherEarnings);
  slip.deductions = record.totalDeductions;
  slip.netPay = record.netSalary;
  await slip.save();

  const fromStatus = record.status;
  record.status = 'PAYSLIP_GENERATED';
  await record.save();
  await writeAudit(record.id, 'PAYSLIP_GENERATED', actingUser.id, fromStatus, 'PAYSLIP_GENERATED');

  await notifyUser(record.employeeId, {
    type: 'PAYROLL',
    title: 'Payslip available',
    message: `Your salary slip for ${monthLabel(record.month, record.year)} is available.`,
    referenceId: record.id,
    referenceType: 'PAYROLL',
  });

  return getById(id);
}

async function markPaid(actingUser, id, { paymentDate, paymentReference } = {}) {
  const record = await getRecordOrThrow(id, [{ model: Payslip, as: 'payslip' }]);
  if (record.status !== 'PAYSLIP_GENERATED') {
    throw ApiError.invalidPayrollTransition(record.status, 'PAID');
  }

  record.status = 'PAID';
  record.paymentStatus = 'PAID';
  record.paymentDate = paymentDate || new Date().toISOString().slice(0, 10);
  record.paymentReference = paymentReference || null;
  record.paidBy = actingUser.id;
  await record.save();

  if (record.payslip) {
    record.payslip.status = 'PAID';
    record.payslip.paymentReference = paymentReference || null;
    await record.payslip.save();
  }

  await writeAudit(
    record.id,
    'MARKED_PAID',
    actingUser.id,
    'PAYSLIP_GENERATED',
    'PAID',
    paymentReference ? `Reference: ${paymentReference}` : null
  );

  return getById(id);
}

async function getPayslipMeta(id) {
  const record = await getRecordOrThrow(id, [{ model: Payslip, as: 'payslip' }]);
  if (!record.payslip) throw ApiError.payslipNotYetGenerated();
  return {
    payrollId: record.id,
    payslipId: record.payslip.id,
    payslipNumber: record.payslip.payslipNumber,
    generatedAt: record.payslip.generatedAt,
    paymentStatus: record.paymentStatus,
  };
}

async function getPayslipFile(id) {
  const record = await getRecordOrThrow(id, [{ model: Payslip, as: 'payslip' }]);
  if (!record.payslip || !record.payslip.pdfPath) throw ApiError.payslipNotYetGenerated();
  return { filePath: record.payslip.pdfPath, fileName: `${record.payslip.payslipNumber || 'payslip'}.pdf` };
}

module.exports = {
  toResponse,
  previewCalculation,
  createPayroll,
  recalculate,
  updatePayroll,
  listAll,
  getById,
  approve,
  finalize,
  generatePayslip,
  markPaid,
  getPayslipMeta,
  getPayslipFile,
};
