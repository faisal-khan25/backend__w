const { Op } = require('sequelize');
const { Attendance, User, LeaveRequest, Holiday } = require('../models');
const ApiError = require('../utils/ApiError');

function todayDateOnly(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function toRecordResponse(record) {
  if (!record) return null;
  return {
    id: record.id,
    date: record.date,
    punchIn: record.punchIn,
    punchOut: record.punchOut,
    totalHours: record.totalHours !== null ? Number(record.totalHours) : null,
    status: record.status,
  };
}

async function punchIn(user, { ipAddress, location, deviceInfo } = {}) {
  const date = todayDateOnly();
  const existing = await Attendance.findOne({ where: { userId: user.id, date } });
  if (existing) {
    throw ApiError.alreadyPunchedIn();
  }

  const now = new Date();
  const isLate =
    now.getHours() > Attendance.LATE_AFTER_HOUR ||
    (now.getHours() === Attendance.LATE_AFTER_HOUR && now.getMinutes() > Attendance.LATE_AFTER_MINUTE);

  const record = await Attendance.create({
    userId: user.id,
    date,
    punchIn: now,
    status: isLate ? 'LATE' : 'PRESENT',
    ipAddress: ipAddress || null,
    location: location || null,
    deviceInfo: deviceInfo || null,
  });

  return toRecordResponse(record);
}

async function punchOut(user) {
  const date = todayDateOnly();
  const record = await Attendance.findOne({ where: { userId: user.id, date } });

  if (!record) {
    throw ApiError.notPunchedIn();
  }
  if (record.punchOut) {
    throw ApiError.alreadyPunchedOut();
  }

  const now = new Date();
  const hours = (now.getTime() - new Date(record.punchIn).getTime()) / (1000 * 60 * 60);

  record.punchOut = now;
  record.totalHours = Math.round(hours * 100) / 100;
  if (hours < 4 && record.status !== 'LATE') {
    record.status = 'HALF_DAY';
  }
  await record.save();

  return toRecordResponse(record);
}

async function getToday(user) {
  const record = await Attendance.findOne({ where: { userId: user.id, date: todayDateOnly() } });
  return toRecordResponse(record);
}

async function getHistory(user, { from, to } = {}) {
  const where = { userId: user.id };
  if (from || to) {
    where.date = {};
    if (from) where.date[Op.gte] = from;
    if (to) where.date[Op.lte] = to;
  } else {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    where.date = { [Op.gte]: todayDateOnly(since) };
  }

  const records = await Attendance.findAll({ where, order: [['date', 'DESC']] });
  return records.map(toRecordResponse);
}

async function getMonthlySummary(user, { month, year } = {}) {
  const now = new Date();
  const targetYear = year || now.getFullYear();
  const targetMonth = month || now.getMonth() + 1;

  const start = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
  const endDate = new Date(targetYear, targetMonth, 0);
  const end = todayDateOnly(endDate);

  const records = await Attendance.findAll({
    where: { userId: user.id, date: { [Op.between]: [start, end] } },
    order: [['date', 'ASC']],
  });

  const counts = { PRESENT: 0, LATE: 0, HALF_DAY: 0, WORK_FROM_HOME: 0, ABSENT: 0 };
  records.forEach((r) => {
    counts[r.status] = (counts[r.status] || 0) + 1;
  });

  return {
    month: targetMonth,
    year: targetYear,
    counts,
    daysRecorded: records.length,
    records: records.map(toRecordResponse),
  };
}

function isWeekend(dateStr) {
  const day = new Date(`${dateStr}T00:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
}

function toEmployeeRecordResponse(record, employee) {
  return {
    id: record ? record.id : null,
    employee: employee
      ? { id: employee.id, name: employee.getFullName(), department: employee.department, email: employee.email }
      : undefined,
    date: record ? record.date : undefined,
    punchIn: record ? record.punchIn : null,
    punchOut: record ? record.punchOut : null,
    totalHours: record && record.totalHours !== null ? Number(record.totalHours) : null,
    status: record ? record.status : undefined,
    isLate: record ? record.status === 'LATE' : false,
  };
}

async function adminDailyAttendance(date, filters = {}) {
  const userWhere = { isActive: true, role: { [Op.ne]: 'ADMIN' } };
  if (filters.employeeId) userWhere.id = filters.employeeId;
  if (filters.department) userWhere.department = filters.department;

  const employees = await User.findAll({ where: userWhere, order: [['firstName', 'ASC']] });
  if (employees.length === 0) return [];
  const employeeIds = employees.map((e) => e.id);

  const [records, holiday, leaves] = await Promise.all([
    Attendance.findAll({ where: { userId: { [Op.in]: employeeIds }, date } }),
    Holiday.findOne({ where: { date } }),
    LeaveRequest.findAll({
      where: {
        userId: { [Op.in]: employeeIds },
        status: 'APPROVED',
        fromDate: { [Op.lte]: date },
        toDate: { [Op.gte]: date },
      },
    }),
  ]);

  const recordByUser = new Map(records.map((r) => [r.userId, r]));
  const onLeaveUsers = new Set(leaves.map((l) => l.userId));
  const weekend = isWeekend(date);

  const rows = employees.map((employee) => {
    const record = recordByUser.get(employee.id);
    if (record) return toEmployeeRecordResponse(record, employee);

    let status = 'ABSENT';
    if (onLeaveUsers.has(employee.id)) status = 'ON_LEAVE';
    else if (holiday) status = 'HOLIDAY';
    else if (weekend) status = 'WEEKEND';

    return { ...toEmployeeRecordResponse(null, employee), date, status };
  });

  if (filters.status) return rows.filter((r) => r.status === filters.status);
  return rows;
}

async function adminListAttendance({ date, from, to, employeeId, department, status, page = 1, pageSize = 50 } = {}) {
  const targetDate = date || todayDateOnly();
  if (!from && !to) {
    const rows = await adminDailyAttendance(targetDate, { employeeId, department, status });
    const limit = Number(pageSize);
    const offset = (Number(page) - 1) * limit;
    return {
      records: rows.slice(offset, offset + limit),
      pagination: { page: Number(page), pageSize: limit, total: rows.length, totalPages: Math.ceil(rows.length / limit) },
    };
  }

  const where = {};
  if (from || to) {
    where.date = {};
    if (from) where.date[Op.gte] = from;
    if (to) where.date[Op.lte] = to;
  }
  if (employeeId) where.userId = employeeId;
  if (status) where.status = status;

  const userWhere = { isActive: true };
  if (department) userWhere.department = department;

  const limit = Number(pageSize);
  const offset = (Number(page) - 1) * limit;

  const { rows, count } = await Attendance.findAndCountAll({
    where,
    include: [{ model: User, as: 'employee', attributes: ['id', 'firstName', 'lastName', 'department', 'email'], where: userWhere }],
    order: [['date', 'DESC']],
    limit,
    offset,
    distinct: true,
  });

  return {
    records: rows.map((r) => toEmployeeRecordResponse(r, r.employee)),
    pagination: { page: Number(page), pageSize: limit, total: count, totalPages: Math.ceil(count / limit) },
  };
}

async function adminAttendanceSummary(date) {
  const targetDate = date || todayDateOnly();
  const rows = await adminDailyAttendance(targetDate);

  const totalEmployees = rows.length;
  const presentToday = rows.filter((r) => ['PRESENT', 'LATE', 'HALF_DAY', 'WORK_FROM_HOME'].includes(r.status)).length;
  const absentToday = rows.filter((r) => r.status === 'ABSENT').length;
  const onLeave = rows.filter((r) => r.status === 'ON_LEAVE').length;
  const lateEmployees = rows.filter((r) => r.status === 'LATE').length;
  const attendancePercentage = totalEmployees > 0 ? Math.round((presentToday / totalEmployees) * 1000) / 10 : 0;

  return { date: targetDate, totalEmployees, presentToday, absentToday, onLeave, lateEmployees, attendancePercentage };
}

async function adminEmployeeHistory(userId, { from, to, month, year } = {}) {
  const employee = await User.findByPk(userId);
  if (!employee) throw ApiError.employeeNotFound();

  const where = { userId };
  if (month && year) {
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const end = todayDateOnly(new Date(year, month, 0));
    where.date = { [Op.between]: [start, end] };
  } else if (from || to) {
    where.date = {};
    if (from) where.date[Op.gte] = from;
    if (to) where.date[Op.lte] = to;
  } else {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    where.date = { [Op.gte]: todayDateOnly(since) };
  }

  const records = await Attendance.findAll({ where, order: [['date', 'DESC']] });
  return {
    employee: { id: employee.id, name: employee.getFullName(), department: employee.department },
    records: records.map((r) => toEmployeeRecordResponse(r, employee)),
  };
}

module.exports = {
  punchIn,
  punchOut,
  getToday,
  getHistory,
  getMonthlySummary,
  adminListAttendance,
  adminAttendanceSummary,
  adminEmployeeHistory,
};