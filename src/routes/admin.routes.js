const express = require('express');
const controller = require('../controllers/admin.controller');
const { requireAuth, requireRole } = require('../middleware/requireAuth');
const {
  adminListTasksValidators,
  adminCreateTaskValidators,
  adminUpdateTaskValidators,
  adminReassignTaskValidators,
  adminListAttendanceValidators,
  adminAttendanceSummaryValidators,
  adminEmployeeHistoryValidators,
  adminListDocumentsValidators,
  reviewDocumentValidators,
} = require('../validators/admin.validators');

const router = express.Router();

router.use(requireAuth, requireRole('ADMIN', 'HR'));

router.get('/dashboard', controller.getDashboardSummary);

router.get('/tasks', adminListTasksValidators, controller.listTasks);
router.post('/tasks', adminCreateTaskValidators, controller.createTask);
router.get('/tasks/:id', controller.getTask);
router.put('/tasks/:id', adminUpdateTaskValidators, controller.updateTask);
router.patch('/tasks/:id', adminUpdateTaskValidators, controller.updateTask);
router.patch('/tasks/:id/reassign', adminReassignTaskValidators, controller.reassignTask);
router.delete('/tasks/:id', controller.removeTask);

router.get('/attendance', adminListAttendanceValidators, controller.listAttendance);
router.get('/attendance/summary', adminAttendanceSummaryValidators, controller.getAttendanceSummary);
router.get('/attendance/employee/:userId', adminEmployeeHistoryValidators, controller.getEmployeeAttendanceHistory);

router.get('/documents', adminListDocumentsValidators, controller.listDocuments);
router.get('/documents/:id', controller.getDocument);
router.get('/documents/:id/download', controller.downloadDocument);
router.get('/documents/:id/preview', controller.previewDocument);
router.patch('/documents/:id/review', reviewDocumentValidators, controller.reviewDocument);

module.exports = router;