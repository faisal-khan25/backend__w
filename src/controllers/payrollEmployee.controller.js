const asyncHandler = require('../utils/asyncHandler');
const payrollEmployeeService = require('../services/payrollEmployee.service');

const listMine = asyncHandler(async (req, res) => {
  const { year } = req.query;
  const result = await payrollEmployeeService.listMine(req.user, { year: year ? Number(year) : undefined });
  res.status(200).json(result);
});

const getMine = asyncHandler(async (req, res) => {
  const result = await payrollEmployeeService.getMine(req.user, req.params.id);
  res.status(200).json(result);
});

const getMyPayslipMeta = asyncHandler(async (req, res) => {
  const result = await payrollEmployeeService.getMyPayslipMeta(req.user, req.params.id);
  res.status(200).json(result);
});

const downloadMyPayslip = asyncHandler(async (req, res) => {
  const { filePath, fileName } = await payrollEmployeeService.getMyPayslipFile(req.user, req.params.id);
  res.download(filePath, fileName);
});

module.exports = { listMine, getMine, getMyPayslipMeta, downloadMyPayslip };
