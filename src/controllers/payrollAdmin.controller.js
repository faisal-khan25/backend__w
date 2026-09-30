const asyncHandler = require('../utils/asyncHandler');
const payrollAdminService = require('../services/payrollAdmin.service');

const calculate = asyncHandler(async (req, res) => {
  const result = await payrollAdminService.previewCalculation(req.body);
  res.status(200).json(result);
});

const create = asyncHandler(async (req, res) => {
  const result = await payrollAdminService.createPayroll(req.user, req.body);
  res.status(201).json(result);
});

const list = asyncHandler(async (req, res) => {
  const { employeeId, month, year, department, status, paymentStatus, search, page, pageSize } = req.query;
  const result = await payrollAdminService.listAll({
    employeeId,
    month: month ? Number(month) : undefined,
    year: year ? Number(year) : undefined,
    department,
    status,
    paymentStatus,
    search,
    page,
    pageSize,
  });
  res.status(200).json(result);
});

const getOne = asyncHandler(async (req, res) => {
  const result = await payrollAdminService.getById(req.params.id);
  res.status(200).json(result);
});

const update = asyncHandler(async (req, res) => {
  const result = await payrollAdminService.updatePayroll(req.user, req.params.id, req.body);
  res.status(200).json(result);
});

const approve = asyncHandler(async (req, res) => {
  const result = await payrollAdminService.approve(req.user, req.params.id);
  res.status(200).json(result);
});

const finalizePayroll = asyncHandler(async (req, res) => {
  const result = await payrollAdminService.finalize(req.user, req.params.id);
  res.status(200).json(result);
});

const generatePayslip = asyncHandler(async (req, res) => {
  const result = await payrollAdminService.generatePayslip(req.user, req.params.id);
  res.status(200).json(result);
});

const markPaid = asyncHandler(async (req, res) => {
  const result = await payrollAdminService.markPaid(req.user, req.params.id, req.body);
  res.status(200).json(result);
});

const getPayslipMeta = asyncHandler(async (req, res) => {
  const result = await payrollAdminService.getPayslipMeta(req.params.id);
  res.status(200).json(result);
});

const downloadPayslip = asyncHandler(async (req, res) => {
  const { filePath, fileName } = await payrollAdminService.getPayslipFile(req.params.id);
  res.download(filePath, fileName);
});

module.exports = {
  calculate,
  create,
  list,
  getOne,
  update,
  approve,
  finalizePayroll,
  generatePayslip,
  markPaid,
  getPayslipMeta,
  downloadPayslip,
};
