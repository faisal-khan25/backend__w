const { Op } = require('sequelize');
const { User, Task, LeaveRequest, Attendance } = require('../models');

function todayDateOnly() {
  return new Date().toISOString().slice(0, 10);
}

async function getDashboardSummary() {
  const today = todayDateOnly();

  const [
    totalEmployees,
    activeEmployees,
    totalTasks,
    pendingTasks,
    inProgressTasks,
    completedTasks,
    overdueTasks,
    pendingLeaveRequests,
    presentToday,
  ] = await Promise.all([
    User.count(),
    User.count({ where: { isActive: true } }),
    Task.count(),
    Task.count({ where: { status: 'PENDING' } }),
    Task.count({ where: { status: 'IN_PROGRESS' } }),
    Task.count({ where: { status: 'COMPLETED' } }),
    Task.count({ where: { status: { [Op.notIn]: ['COMPLETED', 'CANCELLED'] }, dueDate: { [Op.lt]: today } } }),
    LeaveRequest.count({ where: { status: 'PENDING' } }),
    Attendance.count({ where: { date: today, punchIn: { [Op.ne]: null } } }),
  ]);

  return {
    employees: { total: totalEmployees, active: activeEmployees },
    tasks: {
      total: totalTasks,
      pending: pendingTasks,
      inProgress: inProgressTasks,
      completed: completedTasks,
      overdue: overdueTasks,
    },
    leaves: { pendingApprovals: pendingLeaveRequests },
    attendance: { presentToday },
  };
}

module.exports = { getDashboardSummary };