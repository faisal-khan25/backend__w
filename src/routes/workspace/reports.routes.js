const express = require('express');
const controller = require('../../controllers/workspace/reports.controller');
const { requireAuth, requireRole } = require('../../middleware/requireAuth');
const {
  employeeReportValidators,
  attendanceReportValidators,
  leaveReportValidators,
  taskReportValidators,
  payrollReportValidators,
  departmentReportValidators,
  documentReportValidators,
  customReportValidators,
  exportValidators,
} = require('../../validators/reports.validators');

const router = express.Router();


router.use(requireAuth, requireRole('ADMIN', 'HR', 'MANAGER'));

router.get('/dashboard', controller.getDashboard);

router.get('/employees', employeeReportValidators, controller.getEmployeeReport);
router.get('/attendance', attendanceReportValidators, controller.getAttendanceReport);
router.get('/leave', leaveReportValidators, controller.getLeaveReport);
router.get('/tasks', taskReportValidators, controller.getTaskReport);


router.get('/payroll', requireRole('ADMIN', 'HR'), payrollReportValidators, controller.getPayrollReport);

router.get('/departments', departmentReportValidators, controller.getDepartmentReport);
router.get('/documents', documentReportValidators, controller.getDocumentReport);

router.get('/custom/meta', controller.getCustomReportMeta);
router.post('/custom', customReportValidators, controller.runCustomReport);

router.get('/export', exportValidators, controller.exportReport);

module.exports = router;
