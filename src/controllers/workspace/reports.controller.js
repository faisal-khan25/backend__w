const asyncHandler = require('../../utils/asyncHandler');
const reportsService = require('../../services/workspace/reports.service');
const { toCsv } = require('../../utils/csv');

const getDashboard = asyncHandler(async (req, res) => {
  const result = await reportsService.getDashboardSummary(req.user);
  res.status(200).json(result);
});

const getEmployeeReport = asyncHandler(async (req, res) => {
  const result = await reportsService.getEmployeeReport(req.user, req.query);
  res.status(200).json(result);
});

const getAttendanceReport = asyncHandler(async (req, res) => {
  const result = await reportsService.getAttendanceReport(req.user, req.query);
  res.status(200).json(result);
});

const getLeaveReport = asyncHandler(async (req, res) => {
  const result = await reportsService.getLeaveReport(req.user, req.query);
  res.status(200).json(result);
});

const getTaskReport = asyncHandler(async (req, res) => {
  const result = await reportsService.getTaskReport(req.user, req.query);
  res.status(200).json(result);
});

const getPayrollReport = asyncHandler(async (req, res) => {
  const result = await reportsService.getPayrollReport(req.user, req.query);
  res.status(200).json(result);
});

const getDepartmentReport = asyncHandler(async (req, res) => {
  const result = await reportsService.getDepartmentReport(req.user, req.query);
  res.status(200).json(result);
});

const getDocumentReport = asyncHandler(async (req, res) => {
  const result = await reportsService.getDocumentReport(req.user, req.query);
  res.status(200).json(result);
});

const getCustomReportMeta = asyncHandler(async (req, res) => {
  const result = reportsService.getCustomReportMeta(req.user);
  res.status(200).json(result);
});

const runCustomReport = asyncHandler(async (req, res) => {
  const { category, fields, filters, page, pageSize } = req.body;
  const result = await reportsService.getCustomReport(req.user, { category, fields, filters, page, pageSize });
  res.status(200).json(result);
});

const exportReport = asyncHandler(async (req, res) => {
  const { type, ...filters } = req.query;
  const { columns, rows } = await reportsService.exportReport(req.user, { type, ...filters });

  const csv = toCsv(columns, rows);
  const fileName = `${type || 'report'}-${new Date().toISOString().slice(0, 10)}.csv`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.status(200).send(csv);
});

module.exports = {
  getDashboard,
  getEmployeeReport,
  getAttendanceReport,
  getLeaveReport,
  getTaskReport,
  getPayrollReport,
  getDepartmentReport,
  getDocumentReport,
  getCustomReportMeta,
  runCustomReport,
  exportReport,
};
