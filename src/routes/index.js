const express = require('express');
const authRoutes = require('./auth.routes');
const demoRequestRoutes = require('./demoRequest.routes');
const attendanceRoutes = require('./attendance.routes');
const leaveRoutes = require('./leave.routes');
const holidayRoutes = require('./holiday.routes');
const employeeRoutes = require('./employee.routes');
const profileRoutes = require('./profile.routes');
const taskRoutes = require('./task.routes');
const documentRoutes = require('./document.routes');
const payrollRoutes = require('./payroll.routes');
const notificationRoutes = require('./notification.routes');
const adminRoutes = require('./admin.routes');
const chatRoutes = require('./chat.routes');
const chatSpaceRoutes = require('./chatspace.routes');
const groupRoutes = require('./group.routes');
const meetingRoutes = require('./meeting.routes');
const calendarRoutes = require('./calendar.routes');
const driveRoutes = require('./drive.routes');
const docsRoutes = require('./docs.routes');
const sheetsRoutes = require('./sheets.routes');
const meetRoutes = require('./meet.routes');
const meetingsRoutes = require('./meetings.routes');
const dashboardRoutes = require('./dashboard.routes');
const mailRoutes = require('./mail.routes');
const callRoutes = require('./call.routes');
const searchRoutes = require('./search.routes');
const statusRoutes = require('./employeeStatus.routes');
const reportsRoutes = require('./workspace/reports.routes');
const salaryStructureRoutes = require('./salaryStructure.routes');
const payrollAdminRoutes = require('./payrollAdmin.routes');
const employeePayrollRoutes = require('./employeePayroll.routes');
const salarySlipRoutes = require('./salarySlip.routes');

const router = express.Router();

router.use('/v1/auth', authRoutes);
router.use('/v1/leads', demoRequestRoutes);
router.use('/v1/attendance', attendanceRoutes);
router.use('/v1/leaves', leaveRoutes);
router.use('/v1/holidays', holidayRoutes);
router.use('/v1/employees', employeeRoutes);
router.use('/v1/profile', profileRoutes);
router.use('/v1/tasks', taskRoutes);
router.use('/v1/documents', documentRoutes);
router.use('/v1/payroll', payrollRoutes);
router.use('/v1/payroll', salarySlipRoutes);
router.use('/v1/notifications', notificationRoutes);


router.use('/v1/admin', adminRoutes);


router.use('/v1/admin/salary-structures', salaryStructureRoutes);
router.use('/v1/admin/payroll', payrollAdminRoutes);
router.use('/v1/employee/payroll', employeePayrollRoutes);


router.use('/v1/chat', chatRoutes);
router.use('/v1/chat/spaces', chatSpaceRoutes);


router.use('/v1/groups', groupRoutes);
router.use('/v1/chat/meetings', meetingRoutes);
router.use('/v1/calendar', calendarRoutes);
router.use('/v1/drive', driveRoutes);
router.use('/v1/docs', docsRoutes);
router.use('/v1/sheets', sheetsRoutes);
router.use('/v1/meet', meetRoutes);        
router.use('/v1/meetings', meetingsRoutes);
router.use('/v1/calls', callRoutes);         
router.use('/v1/dashboard', dashboardRoutes);
router.use('/v1/mail', mailRoutes);


router.use('/v1/workspace/reports', reportsRoutes);


router.use('/v1/status', statusRoutes);


router.use('/v1/search', searchRoutes);

module.exports = router;