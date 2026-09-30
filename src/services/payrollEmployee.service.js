const { PayrollRecord, Payslip, User, EmployeeProfile } = require('../models');
const ApiError = require('../utils/ApiError');
const { toResponse } = require('./payrollAdmin.service');

const INCLUDES = [
  { model: User, as: 'employee', attributes: ['id', 'firstName', 'lastName', 'department'], include: [{ model: EmployeeProfile }] },
  { model: Payslip, as: 'payslip' },
];

async function listMine(user, { year } = {}) {
  const where = { employeeId: user.id };
  if (year) where.year = year;

  const records = await PayrollRecord.findAll({
    where,
    include: INCLUDES,
    order: [
      ['year', 'DESC'],
      ['month', 'DESC'],
    ],
  });
  return records.map((r) => toResponse(r));
}

async function getMine(user, id) {
  const record = await PayrollRecord.findOne({ where: { id, employeeId: user.id }, include: INCLUDES });
  if (!record) throw ApiError.payrollNotFound();
  return toResponse(record);
}

async function getMyPayslipMeta(user, id) {
  const record = await PayrollRecord.findOne({ where: { id, employeeId: user.id }, include: [{ model: Payslip, as: 'payslip' }] });
  if (!record) throw ApiError.payrollNotFound();
  if (!record.payslip) throw ApiError.payslipNotYetGenerated();
  return {
    payrollId: record.id,
    payslipId: record.payslip.id,
    payslipNumber: record.payslip.payslipNumber,
    generatedAt: record.payslip.generatedAt,
    paymentStatus: record.paymentStatus,
  };
}

async function getMyPayslipFile(user, id) {
  const record = await PayrollRecord.findOne({ where: { id, employeeId: user.id }, include: [{ model: Payslip, as: 'payslip' }] });
  if (!record) throw ApiError.payrollNotFound();
  if (!record.payslip || !record.payslip.pdfPath) throw ApiError.payslipNotYetGenerated();
  return { filePath: record.payslip.pdfPath, fileName: `${record.payslip.payslipNumber || 'payslip'}.pdf` };
}

module.exports = { listMine, getMine, getMyPayslipMeta, getMyPayslipFile };
