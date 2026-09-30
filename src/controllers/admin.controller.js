const asyncHandler = require('../utils/asyncHandler');
const adminService = require('../services/admin.service');
const taskService = require('../services/task.service');
const documentService = require('../services/document.service');
const attendanceService = require('../services/attendance.service');

const getDashboardSummary = asyncHandler(async (req, res) => {
  const result = await adminService.getDashboardSummary(req.user);
  res.status(200).json(result);
});

const listTasks = asyncHandler(async (req, res) => {
  const { employeeId, status, priority, dueFrom, dueTo, search, sort, page, pageSize } = req.query;
  const result = await taskService.adminListTasks({
    employeeId, status, priority, dueFrom, dueTo, search, sort, page, pageSize,
  });
  res.status(200).json(result);
});

const getTask = asyncHandler(async (req, res) => {
  const result = await taskService.adminGetTask(req.params.id);
  res.status(200).json(result);
});

const createTask = asyncHandler(async (req, res) => {
  const result = await taskService.adminCreateTask(req.user, req.body);
  res.status(201).json(result);
});

const updateTask = asyncHandler(async (req, res) => {
  const result = await taskService.adminUpdateTask(req.user, req.params.id, req.body);
  res.status(200).json(result);
});

const reassignTask = asyncHandler(async (req, res) => {
  const result = await taskService.adminReassignTask(req.user, req.params.id, req.body.assignedTo, req.body.note);
  res.status(200).json(result);
});

const removeTask = asyncHandler(async (req, res) => {
  const result = await taskService.adminRemoveTask(req.user, req.params.id, { hard: req.query.hard === 'true' });
  res.status(200).json(result);
});

const listAttendance = asyncHandler(async (req, res) => {
  const { date, from, to, employeeId, department, status, page, pageSize } = req.query;
  const result = await attendanceService.adminListAttendance({
    date, from, to, employeeId, department, status, page, pageSize,
  });
  res.status(200).json(result);
});

const getAttendanceSummary = asyncHandler(async (req, res) => {
  const result = await attendanceService.adminAttendanceSummary(req.query.date);
  res.status(200).json(result);
});

const getEmployeeAttendanceHistory = asyncHandler(async (req, res) => {
  const { from, to, month, year } = req.query;
  const result = await attendanceService.adminEmployeeHistory(req.params.userId, {
    from, to, month: month ? Number(month) : undefined, year: year ? Number(year) : undefined,
  });
  res.status(200).json(result);
});

const listDocuments = asyncHandler(async (req, res) => {
  const { employeeId, category, status, search, page, pageSize } = req.query;
  const result = await documentService.adminListDocuments({ employeeId, category, status, search, page, pageSize });
  res.status(200).json(result);
});

const getDocument = asyncHandler(async (req, res) => {
  const result = await documentService.adminGetDocument(req.params.id);
  res.status(200).json(result);
});

const downloadDocument = asyncHandler(async (req, res) => {
  const { path, fileName } = await documentService.adminGetDownloadInfo(req.params.id);
  res.download(path, fileName);
});

const previewDocument = asyncHandler(async (req, res) => {
  const { path, mimeType } = await documentService.adminGetDownloadInfo(req.params.id);
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Disposition', 'inline');
  res.sendFile(path);
});

const reviewDocument = asyncHandler(async (req, res) => {
  const result = await documentService.reviewDocument(req.user, req.params.id, req.body);
  res.status(200).json(result);
});

module.exports = {
  getDashboardSummary,
  listTasks,
  getTask,
  createTask,
  updateTask,
  reassignTask,
  removeTask,
  listAttendance,
  getAttendanceSummary,
  getEmployeeAttendanceHistory,
  listDocuments,
  getDocument,
  downloadDocument,
  previewDocument,
  reviewDocument,
};