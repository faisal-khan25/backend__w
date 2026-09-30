const { Op } = require('sequelize');
const { EmployeeStatus } = require('../models');
const ApiError = require('../utils/ApiError');
const { emitToAll } = require('../realtime/emit');

function toStatusResponse(status) {
  if (!status) return null;
  const now = new Date();
  const start = new Date(status.startTime);
  const end = new Date(status.endTime);
  const isActive = !status.isCleared && start <= now && now < end;

  return {
    id: status.id,
    userId: status.userId,
    statusType: status.statusType,
    label: (status.message && status.message.trim()) || EmployeeStatus.DEFAULT_LABELS[status.statusType] || '',
    message: status.message || null,
    startTime: status.startTime,
    endTime: status.endTime,
    isActive,
  };
}

async function getMyStatus(user) {
  const row = await EmployeeStatus.findOne({
    where: { userId: user.id, isCleared: false, endTime: { [Op.gt]: new Date() } },
    order: [['createdAt', 'DESC']],
  });
  return toStatusResponse(row);
}

async function getActiveStatus(userId) {
  const now = new Date();
  const row = await EmployeeStatus.findOne({
    where: {
      userId,
      isCleared: false,
      startTime: { [Op.lte]: now },
      endTime: { [Op.gt]: now },
    },
    order: [['createdAt', 'DESC']],
  });
  return row ? toStatusResponse(row) : null;
}

async function getActiveStatuses(userIds) {
  const ids = [...new Set((userIds || []).filter(Boolean))];
  if (!ids.length) return {};

  const now = new Date();
  const rows = await EmployeeStatus.findAll({
    where: {
      userId: { [Op.in]: ids },
      isCleared: false,
      startTime: { [Op.lte]: now },
      endTime: { [Op.gt]: now },
    },
  });

  const map = {};
  rows.forEach((row) => {
    map[row.userId] = toStatusResponse(row);
  });
  return map;
}

async function setStatus(user, { statusType, message, startTime, endTime }) {
  if (!EmployeeStatus.STATUS_TYPES.includes(statusType)) {
    throw ApiError.invalidStatusTimeRange();
  }
  if (statusType === 'CUSTOM' && !(message && message.trim())) {
    throw ApiError.statusCustomMessageRequired();
  }

  const start = new Date(startTime);
  const end = new Date(endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    throw ApiError.invalidStatusTimeRange();
  }

  const now = new Date();
  if (end <= now) {
    throw ApiError.statusEndTimeInPast();
  }

  await EmployeeStatus.update(
    { isCleared: true },
    { where: { userId: user.id, isCleared: false, endTime: { [Op.gt]: now } } }
  );

  const created = await EmployeeStatus.create({
    userId: user.id,
    statusType,
    message: message && message.trim() ? message.trim() : null,
    startTime: start,
    endTime: end,
    activationNotified: start <= now,
  });

  const response = toStatusResponse(created);
  emitToAll('status:updated', { userId: user.id, status: response });
  return response;
}

async function clearStatus(user) {
  const row = await EmployeeStatus.findOne({
    where: { userId: user.id, isCleared: false, endTime: { [Op.gt]: new Date() } },
    order: [['createdAt', 'DESC']],
  });
  if (!row) throw ApiError.statusNotFound();

  row.isCleared = true;
  await row.save();

  emitToAll('status:cleared', { userId: user.id });
  return { success: true };
}

async function sweepExpiredStatuses() {
  const now = new Date();

  const toActivate = await EmployeeStatus.findAll({
    where: {
      isCleared: false,
      activationNotified: false,
      startTime: { [Op.lte]: now },
      endTime: { [Op.gt]: now },
    },
  });
  for (const row of toActivate) {
    row.activationNotified = true;
    await row.save();
    emitToAll('status:updated', { userId: row.userId, status: toStatusResponse(row) });
  }

  const toExpire = await EmployeeStatus.findAll({
    where: {
      isCleared: false,
      expiryNotified: false,
      endTime: { [Op.lte]: now },
    },
  });
  for (const row of toExpire) {
    row.expiryNotified = true;
    await row.save();
    emitToAll('status:expired', { userId: row.userId });
  }
}

let sweepTimer = null;

function startExpirySweep({ intervalMs = 30 * 1000 } = {}) {
  if (sweepTimer) return sweepTimer;

  const tick = () => {
    sweepExpiredStatuses().catch((err) => {
      console.error('[employeeStatus] sweep error:', err.message);
    });
  };

  tick();
  sweepTimer = setInterval(tick, intervalMs);
  if (sweepTimer.unref) sweepTimer.unref();
  return sweepTimer;
}

function stopExpirySweep() {
  if (sweepTimer) {
    clearInterval(sweepTimer);
    sweepTimer = null;
  }
}

module.exports = {
  toStatusResponse,
  getMyStatus,
  getActiveStatus,
  getActiveStatuses,
  setStatus,
  clearStatus,
  sweepExpiredStatuses,
  startExpirySweep,
  stopExpirySweep,
};