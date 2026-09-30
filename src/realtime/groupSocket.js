const groupService = require('../services/group.service');
const { GroupMember } = require('../models');

const { groupRoom } = groupService;

async function canAccess(userId, groupId) {
  if (!groupId || typeof groupId !== 'string') return false;
  const membership = await GroupMember.findOne({
    where: { groupId, userId, leftAt: null },
  });
  return Boolean(membership);
}

function registerGroupHandlers(io, socket) {
  const { user } = socket;

  socket._groupRooms = new Set();

  socket.on('join_group', async ({ groupId } = {}) => {
    try {
      if (!(await canAccess(user.id, groupId))) {
        socket.emit('group:error', {
          groupId: groupId || null,
          error: 'You are not a member of this group',
        });
        return;
      }

      const room = groupRoom(groupId);
      socket._groupRooms.add(room);
      socket.join(room);

      socket.emit('group:joined', { groupId, socketId: socket.id, userId: user.id });

      socket.to(room).emit('group:member_online', {
        groupId,
        userId: user.id,
        name: user.getFullName(),
        profileImage: user.profileImage || null,
      });
    } catch (err) {
      socket.emit('group:error', {
        groupId: groupId || null,
        error: 'Could not join the group',
      });
      console.error('[group:join] failed:', err.message);
    }
  });

  socket.on('leave_group', ({ groupId } = {}) => {
    if (!groupId) return;
    const room = groupRoom(groupId);
    socket._groupRooms.delete(room);
    socket.leave(room);
    socket.to(room).emit('group:member_offline', { groupId, userId: user.id });
  });

  socket.on('send_message', async ({ groupId, message, messageType } = {}) => {
    try {
      const saved = await groupService.sendMessage(user, groupId, {
        message,
        messageType,
      });
      socket.emit('group:message_sent', saved);
    } catch (err) {
      socket.emit('group:error', {
        groupId: groupId || null,
        error: err.message || 'Could not send the message',
      });
    }
  });

  socket.on('user_typing', ({ groupId } = {}) => {
    if (!groupId || !socket._groupRooms.has(groupRoom(groupId))) return;
    socket.to(groupRoom(groupId)).emit('user_typing', {
      groupId,
      userId: user.id,
      name: user.getFullName(),
    });
  });

  socket.on('user_stopped_typing', ({ groupId } = {}) => {
    if (!groupId || !socket._groupRooms.has(groupRoom(groupId))) return;
    socket.to(groupRoom(groupId)).emit('user_stopped_typing', {
      groupId,
      userId: user.id,
    });
  });

  socket.on('disconnect', () => {
    socket._groupRooms.forEach((room) => {
      socket.to(room).emit('group:member_offline', {
        groupId: room.replace('group_', ''),
        userId: user.id,
      });
    });
    socket._groupRooms.clear();
  });
}

module.exports = { registerGroupHandlers };
