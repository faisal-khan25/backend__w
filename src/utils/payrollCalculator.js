const { Op } = require('sequelize');
const { Attendance, Holiday, LeaveRequest, LeaveType, EmployeeProfile } = require('../models');

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function monthRange(month, year) {
  const start = `${year}-${pad2(month)}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${pad2(month)}-${pad2(lastDay)}`;
  return { start, end, lastDay };
}

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

async function computeAttendanceMetrics(employeeId, month, year) {
  const { start, end, lastDay } = monthRange(month, year);

  const holidays = await Holiday.findAll({ where: { date: { [Op.between]: [start, end] } } });
  const holidayDates = new Set(holidays.map((h) => h.date));

  let workingDays = 0;
  const workingDateSet = new Set();
  for (let d = 1; d <= lastDay; d += 1) {
    const dateStr = `${year}-${pad2(month)}-${pad2(d)}`;
    const jsDate = new Date(year, month - 1, d);
    if (isWeekend(jsDate) || holidayDates.has(dateStr)) continue;
    workingDays += 1;
    workingDateSet.add(dateStr);
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  let joiningDate = null;
  try {
    const profile = await EmployeeProfile.findOne({ where: { userId: employeeId }, attributes: ['dateOfJoining'] });
    joiningDate = profile && profile.dateOfJoining ? String(profile.dateOfJoining).slice(0, 10) : null;
  } catch (e) {
    joiningDate = null;
  }
  const assessableDateSet = new Set(
    [...workingDateSet].filter((ds) => ds <= todayStr && (!joiningDate || ds >= joiningDate))
  );

  const attendanceRows = await Attendance.findAll({
    where: { userId: employeeId, date: { [Op.between]: [start, end] } },
  });
  const attendanceByDate = new Map(attendanceRows.map((r) => [r.date, r.status]));

  let presentDays = 0;
  attendanceByDate.forEach((status, dateStr) => {
    if (!workingDateSet.has(dateStr)) return;
    if (status === 'HALF_DAY') presentDays += 0.5;
    else if (['PRESENT', 'LATE', 'WORK_FROM_HOME'].includes(status)) presentDays += 1;
  });

  const leaveRequests = await LeaveRequest.findAll({
    where: {
      userId: employeeId,
      status: 'APPROVED',
      fromDate: { [Op.lte]: end },
      toDate: { [Op.gte]: start },
    },
    include: [{ model: LeaveType, as: 'leaveType' }],
  });

  let paidLeaveDays = 0;
  let unpaidLeaveDays = 0;
  for (const leave of leaveRequests) {
    const isPaid = leave.leaveType ? leave.leaveType.isPaid !== false : true;
    const from = leave.fromDate < start ? start : leave.fromDate;
    const to = leave.toDate > end ? end : leave.toDate;
    const [fy, fm, fd] = from.split('-').map(Number);
    const [ty, tm, td] = to.split('-').map(Number);
    const fromDate = new Date(fy, fm - 1, fd);
    const toDate = new Date(ty, tm - 1, td);
    for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
      const dateStr = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
      if (!workingDateSet.has(dateStr)) continue;
      if (attendanceByDate.has(dateStr) && ['PRESENT', 'LATE'].includes(attendanceByDate.get(dateStr))) continue;
      if (isPaid) paidLeaveDays += 1;
      else unpaidLeaveDays += 1;
    }
  }

  const accountedDays = presentDays + paidLeaveDays + unpaidLeaveDays;
  const absentDays = Math.max(round2(assessableDateSet.size - accountedDays), 0);

  const lopDays = round2(unpaidLeaveDays + absentDays);

  return {
    workingDays,
    presentDays: round2(presentDays),
    paidLeaveDays: round2(paidLeaveDays),
    unpaidLeaveDays: round2(unpaidLeaveDays),
    absentDays,
    lopDays,
  };
}

async function calculatePayroll({ employeeId, month, year, structure, overrideGrossSalary, otherEarnings, deductionInputs }) {
  const structureGross = round2(structure.basicSalary) + round2(structure.hra) + round2(structure.otherAllowances);

  let basic = Number(structure.basicSalary);
  let hra = Number(structure.hra);
  let otherAllowances = Number(structure.otherAllowances);
  let grossSalary = structureGross;
  let manualOverride = false;

  if (overrideGrossSalary !== undefined && overrideGrossSalary !== null && Number(overrideGrossSalary) !== structureGross) {
    manualOverride = true;
    const ratio = structureGross > 0 ? Number(overrideGrossSalary) / structureGross : 1;
    basic = round2(basic * ratio);
    hra = round2(hra * ratio);
    otherAllowances = round2(Number(overrideGrossSalary) - basic - hra);
    grossSalary = round2(Number(overrideGrossSalary));
  }

  const extraEarnings = round2(Number(otherEarnings || 0));
  const totalEarnings = round2(basic + hra + otherAllowances + extraEarnings);

  const attendance = await computeAttendanceMetrics(employeeId, month, year);
  const perDayGross = attendance.workingDays > 0 ? grossSalary / attendance.workingDays : 0;
  const lopAmount = round2(perDayGross * attendance.lopDays);

  const d = deductionInputs || {};
  const pf = round2(Number(d.pf || 0));
  const professionalTax = round2(Number(d.professionalTax || 0));
  const tds = round2(Number(d.tds || 0));
  const insurance = round2(Number(d.insurance || 0));
  const loanRecovery = round2(Number(d.loanRecovery || 0));
  const salaryAdvance = round2(Number(d.salaryAdvance || 0));
  const otherDeductions = round2(Number(d.otherDeductions || 0));

  const totalDeductions = round2(
    pf + professionalTax + tds + lopAmount + insurance + loanRecovery + salaryAdvance + otherDeductions
  );
  const netSalary = round2(Math.max(totalEarnings - totalDeductions, 0));

  return {
    basicSalary: basic,
    hra,
    otherAllowances,
    otherEarnings: extraEarnings,
    grossSalary,
    totalEarnings,
    manualOverride,
    originalGrossSalary: manualOverride ? structureGross : null,
    ...attendance,
    lopAmount,
    pf,
    professionalTax,
    tds,
    insurance,
    loanRecovery,
    salaryAdvance,
    otherDeductions,
    totalDeductions,
    netSalary,
  };
}

module.exports = { round2, monthRange, computeAttendanceMetrics, calculatePayroll };
