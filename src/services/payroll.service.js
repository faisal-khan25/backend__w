const { Payslip, User } = require('../models');
const ApiError = require('../utils/ApiError');

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

function toPayslipResponse(slip) {
  return {
    id: slip.id,
    month: slip.month,
    year: slip.year,
    basicSalary: Number(slip.basicSalary),
    allowances: Number(slip.allowances),
    deductions: Number(slip.deductions),
    netPay: Number(slip.netPay),
    currency: slip.currency,
    status: slip.status,
    notes: slip.notes,
    generatedAt: slip.generatedAt,
    payslipNumber: slip.payslipNumber || null,
    payrollId: slip.payrollId || null,
    hasPdf: !!slip.pdfPath,
    employee: slip.employee
      ? { id: slip.employee.id, name: slip.employee.getFullName(), department: slip.employee.department }
      : undefined,
  };
}

async function listMyPayslips(user, { year } = {}) {
  const where = { userId: user.id };
  if (year) where.year = year;

  const slips = await Payslip.findAll({
    where,
    order: [
      ['year', 'DESC'],
      ['month', 'DESC'],
    ],
  });

  return slips.map(toPayslipResponse);
}

async function getMyPayslip(user, id) {
  const slip = await Payslip.findOne({ where: { id, userId: user.id } });
  if (!slip) throw ApiError.payslipNotFound();
  return toPayslipResponse(slip);
}

async function getMyPayslipPdf(user, id) {
  const slip = await Payslip.findOne({ where: { id, userId: user.id } });
  if (!slip) throw ApiError.payslipNotFound();
  if (!slip.pdfPath) throw ApiError.payslipNotYetGenerated();
  return { filePath: slip.pdfPath, fileName: `${slip.payslipNumber || 'payslip'}.pdf` };
}

async function generatePayslip(actingUser, { userId, month, year, basicSalary, allowances, deductions, notes }) {
  const employee = await User.findByPk(userId);
  if (!employee) throw ApiError.employeeNotFound();

  const existing = await Payslip.findOne({ where: { userId, month, year } });
  if (existing) throw ApiError.payslipAlreadyExists();

  const netPay = round2(Number(basicSalary) + Number(allowances || 0) - Number(deductions || 0));

  const slip = await Payslip.create({
    userId,
    month,
    year,
    basicSalary,
    allowances: allowances || 0,
    deductions: deductions || 0,
    netPay,
    notes: notes || null,
    generatedBy: actingUser.id,
    status: 'GENERATED',
  });

  slip.employee = employee;
  return toPayslipResponse(slip);
}

async function listAllPayslips({ userId, month, year, page = 1, pageSize = 20 } = {}) {
  const where = {};
  if (userId) where.userId = userId;
  if (month) where.month = month;
  if (year) where.year = year;

  const limit = Number(pageSize);
  const offset = (Number(page) - 1) * limit;

  const { rows, count } = await Payslip.findAndCountAll({
    where,
    include: [{ model: User, as: 'employee', attributes: ['id', 'firstName', 'lastName', 'department'] }],
    order: [
      ['year', 'DESC'],
      ['month', 'DESC'],
    ],
    limit,
    offset,
  });

  return {
    payslips: rows.map(toPayslipResponse),
    pagination: { page: Number(page), pageSize: limit, total: count, totalPages: Math.ceil(count / limit) },
  };
}

async function markPaid(id) {
  const slip = await Payslip.findByPk(id, {
    include: [{ model: User, as: 'employee', attributes: ['id', 'firstName', 'lastName', 'department'] }],
  });
  if (!slip) throw ApiError.payslipNotFound();

  slip.status = 'PAID';
  await slip.save();
  return toPayslipResponse(slip);
}

module.exports = { listMyPayslips, getMyPayslip, getMyPayslipPdf, generatePayslip, listAllPayslips, markPaid };
