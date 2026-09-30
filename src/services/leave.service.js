const { Op } = require('sequelize');
const { LeaveType, LeaveRequest, User } = require('../models');
const ApiError = require('../utils/ApiError');

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function inclusiveDayCount(fromDate, toDate) {
  const from = new Date(`${fromDate}T00:00:00Z`);
  const to = new Date(`${toDate}T00:00:00Z`);
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY) + 1;
}

function toLeaveTypeResponse(type) {
  return { id: type.id, name: type.name, annualQuota: type.annualQuota };
}

function toLeaveRequestResponse(request) {
  return {
    id: request.id,
    leaveType: request.leaveType ? toLeaveTypeResponse(request.leaveType) : { id: request.leaveTypeId },
    fromDate: request.fromDate,
    toDate: request.toDate,
    days: Number(request.days),
    reason: request.reason,
    status: request.status,
    appliedAt: request.appliedAt,
    decidedAt: request.decidedAt,
    decisionNote: request.decisionNote,
  };
}

async function listLeaveTypes() {
  const types = await LeaveType.findAll({ where: { isActive: true }, order: [['name', 'ASC']] });
  return types.map(toLeaveTypeResponse);
}

async function getBalance(user, { year } = {}) {
  const targetYear = year || new Date().getFullYear();
  const types = await LeaveType.findAll({ where: { isActive: true }, order: [['name', 'ASC']] });

  const approved = await LeaveRequest.findAll({
    where: {
      userId: user.id,
      status: 'APPROVED',
      fromDate: { [Op.gte]: `${targetYear}-01-01`, [Op.lte]: `${targetYear}-12-31` },
    },
  });

  const usedByType = {};
  approved.forEach((req) => {
    usedByType[req.leaveTypeId] = (usedByType[req.leaveTypeId] || 0) + Number(req.days);
  });

  return {
    year: targetYear,
    balances: types.map((type) => {
      const used = usedByType[type.id] || 0;
      return {
        leaveType: toLeaveTypeResponse(type),
        total: type.annualQuota,
        used,
        remaining: Math.max(type.annualQuota - used, 0),
      };
    }),
  };
}

async function applyLeave(user, { leaveTypeId, fromDate, toDate, reason }) {
  const leaveType = await LeaveType.findByPk(leaveTypeId);
  if (!leaveType || !leaveType.isActive) {
    throw ApiError.invalidLeaveType();
  }
  if (toDate < fromDate) {
    throw ApiError.invalidDateRange();
  }

  const days = inclusiveDayCount(fromDate, toDate);
  const year = Number(fromDate.slice(0, 4));
  const { balances } = await getBalance(user, { year });
  const balance = balances.find((b) => b.leaveType.id === leaveTypeId);

  if (balance && balance.remaining < days) {
    throw ApiError.insufficientLeaveBalance(balance.remaining);
  }

  const request = await LeaveRequest.create({
    userId: user.id,
    leaveTypeId,
    fromDate,
    toDate,
    days,
    reason: reason || null,
    status: 'PENDING',
  });

  request.leaveType = leaveType;
  return toLeaveRequestResponse(request);
}

async function listMyLeaves(user, { status } = {}) {
  const where = { userId: user.id };
  if (status) where.status = status;

  const requests = await LeaveRequest.findAll({
    where,
    include: [{ model: LeaveType, as: 'leaveType' }],
    order: [['appliedAt', 'DESC']],
  });

  return requests.map(toLeaveRequestResponse);
}

async function cancelLeave(user, requestId) {
  const request = await LeaveRequest.findOne({
    where: { id: requestId, userId: user.id },
    include: [{ model: LeaveType, as: 'leaveType' }],
  });
  if (!request) throw ApiError.leaveRequestNotFound();
  if (request.status !== 'PENDING') throw ApiError.leaveNotCancellable();

  request.status = 'CANCELLED';
  request.decidedAt = new Date();
  await request.save();

  return toLeaveRequestResponse(request);
}

async function listPendingApprovals() {
  const requests = await LeaveRequest.findAll({
    where: { status: 'PENDING' },
    include: [
      { model: LeaveType, as: 'leaveType' },
      { model: User, as: 'employee', attributes: ['id', 'firstName', 'lastName', 'department'] },
    ],
    order: [['appliedAt', 'ASC']],
  });

  return requests.map((r) => ({
    ...toLeaveRequestResponse(r),
    employee: r.employee
      ? { id: r.employee.id, name: r.employee.getFullName(), department: r.employee.department }
      : null,
  }));
}

async function decide(decidedByUser, requestId, { status, note }) {
  if (!['APPROVED', 'REJECTED'].includes(status)) {
    throw new ApiError(400, 'status must be APPROVED or REJECTED');
  }

  const request = await LeaveRequest.findByPk(requestId, {
    include: [{ model: LeaveType, as: 'leaveType' }],
  });
  if (!request) throw ApiError.leaveRequestNotFound();
  if (request.status !== 'PENDING') throw ApiError.leaveNotCancellable();

  request.status = status;
  request.decidedBy = decidedByUser.id;
  request.decisionNote = note || null;
  request.decidedAt = new Date();
  await request.save();

  return toLeaveRequestResponse(request);
}

async function listApprovedLeavesInRange({ from, to, userIds } = {}) {
  const where = { status: 'APPROVED' };
  if (userIds) where.userId = { [Op.in]: userIds.length ? userIds : [''] };
  if (from || to) {
    where[Op.and] = [];
    if (to) where[Op.and].push({ fromDate: { [Op.lte]: to } });
    if (from) where[Op.and].push({ toDate: { [Op.gte]: from } });
  }

  const requests = await LeaveRequest.findAll({
    where,
    include: [
      { model: LeaveType, as: 'leaveType' },
      { model: User, as: 'employee', attributes: ['id', 'firstName', 'lastName', 'department', 'profileImage'] },
    ],
    order: [['fromDate', 'ASC']],
  });

  return requests.map((r) => ({
    id: r.id,
    userId: r.userId,
    employee: r.employee
      ? {
          id: r.employee.id,
          name: r.employee.getFullName(),
          department: r.employee.department,
          profileImage: r.employee.profileImage,
        }
      : null,
    leaveType: r.leaveType ? toLeaveTypeResponse(r.leaveType) : { id: r.leaveTypeId },
    fromDate: r.fromDate,
    toDate: r.toDate,
    days: Number(r.days),
    status: r.status,
  }));
}

module.exports = {
  listLeaveTypes,
  getBalance,
  applyLeave,
  listMyLeaves,
  cancelLeave,
  listPendingApprovals,
  decide,
  listApprovedLeavesInRange,
};