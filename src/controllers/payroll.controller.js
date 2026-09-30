const asyncHandler = require('../utils/asyncHandler');
const payrollService = require('../services/payroll.service');

const listMyPayslips = asyncHandler(async (req, res) => {
  const { year } = req.query;
  const result = await payrollService.listMyPayslips(req.user, { year: year ? Number(year) : undefined });
  res.status(200).json(result);
});

const getMyPayslip = asyncHandler(async (req, res) => {
  const result = await payrollService.getMyPayslip(req.user, req.params.id);
  res.status(200).json(result);
});

const downloadMyPayslip = asyncHandler(async (req, res) => {
  const { filePath, fileName } = await payrollService.getMyPayslipPdf(req.user, req.params.id);
  res.download(filePath, fileName);
});

const generatePayslip = asyncHandler(async (req, res) => {
  const result = await payrollService.generatePayslip(req.user, req.body);
  res.status(201).json(result);
});

const listAllPayslips = asyncHandler(async (req, res) => {
  const { userId, month, year, page, pageSize } = req.query;
  const result = await payrollService.listAllPayslips({
    userId,
    month: month ? Number(month) : undefined,
    year: year ? Number(year) : undefined,
    page,
    pageSize,
  });
  res.status(200).json(result);
});

const markPaid = asyncHandler(async (req, res) => {
  const result = await payrollService.markPaid(req.params.id);
  res.status(200).json(result);
});

module.exports = { listMyPayslips, getMyPayslip, downloadMyPayslip, generatePayslip, listAllPayslips, markPaid };
