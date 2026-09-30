const { ChatPresence } = require('../models');

const socketsByUser = new Map();

function addSocket(userId, socketId) {
  const wasOffline = !isOnline(userId);
  if (!socketsByUser.has(userId)) socketsByUser.set(userId, new Set());
  socketsByUser.get(userId).add(socketId);
  return wasOffline;
}

function removeSocket(userId, socketId) {
  const set = socketsByUser.get(userId);
  if (!set) return true;
  set.delete(socketId);
  if (set.size === 0) {
    socketsByUser.delete(userId);
    return true;
  }
  return false;
}

function isOnline(userId) {
  return (socketsByUser.get(userId)?.size || 0) > 0;
}

function onlineUserIds() {
  return [...socketsByUser.keys()];
}

async function getEffectiveStatus(userId) {
  if (!isOnline(userId)) return 'OFFLINE';
  const presence = await ChatPresence.findByPk(userId);
  return presence?.status && presence.status !== 'OFFLINE' ? presence.status : 'ONLINE';
}

async function getEffectiveStatuses(userIds) {
  const uniqueIds = [...new Set(userIds)];
  const online = uniqueIds.filter(isOnline);
  const rows = online.length
    ? await ChatPresence.findAll({ where: { userId: online } })
    : [];
  const byId = new Map(rows.map((r) => [r.userId, r.status]));

  const result = {};
  uniqueIds.forEach((id) => {
    if (!isOnline(id)) {
      result[id] = 'OFFLINE';
    } else {
      const stored = byId.get(id);
      result[id] = stored && stored !== 'OFFLINE' ? stored : 'ONLINE';
    }
  });
  return result;
}

module.exports = {
  addSocket,
  removeSocket,
  isOnline,
  onlineUserIds,
  getEffectiveStatus,
  getEffectiveStatuses,
};