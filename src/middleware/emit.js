const { getIO } = require('./io');

function emitToUser(userId, event, payload) {
  const io = getIO();
  if (!io) return;
  io.to(`user:${userId}`).emit(event, payload);
}

function emitToUsers(userIds, event, payload) {
  const io = getIO();
  if (!io) return;
  const unique = [...new Set(userIds)];
  if (unique.length === 0) return;
  io.to(unique.map((id) => `user:${id}`)).emit(event, payload);
}

function emitToAll(event, payload) {
  const io = getIO();
  if (!io) return;
  io.emit(event, payload);
}

module.exports = { emitToUser, emitToUsers, emitToAll };