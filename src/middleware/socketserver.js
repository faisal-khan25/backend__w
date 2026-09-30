const { Server } = require('socket.io');
const { Op } = require('sequelize');
const { parseClaims, isTokenType, TokenType } = require('../utils/jwt');
const {
  User,
  ChatConversationMember,
  ChatPresence,
  MeetingParticipant,
  ChatMeeting,
  ChatMessage,
} = require('../models');
const corsOptions = require('../config/cors');
const presence = require('./presence');
const { emitToUsers } = require('./emit');
const { setIO } = require('./io');
const callService = require('../services/call.service');
const { registerGroupHandlers } = require('../realtime/groupSocket');

async function authenticateSocket(socket, next) {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');

    if (!token) return next(new Error('Authentication required'));

    const claims = parseClaims(token);
    if (!isTokenType(claims, TokenType.ACCESS)) {
      return next(new Error('Invalid token'));
    }

    const user = await User.findOne({ where: { email: claims.email } });
    if (!user || !user.isActive) return next(new Error('Account is deactivated'));

    socket.user = user;
    next();
  } catch {
    next(new Error('Authentication required'));
  }
}

async function getMemberConversationIds(userId) {
  const memberships = await ChatConversationMember.findAll({
    where: { userId, leftAt: null },
    attributes: ['conversationId'],
  });
  return memberships.map((m) => m.conversationId);
}

async function persistMeetChatMessage(meetingId, senderId, content) {
  try {
    const meeting = await ChatMeeting.findByPk(meetingId, {
      attributes: ['conversationId'],
    });
    if (!meeting) return null;

    return await ChatMessage.create({
      conversationId: meeting.conversationId,
      senderId,
      messageType: 'TEXT',
      content,
      meetingId,
    });
  } catch (err) {
    console.error('[meet:chat] persist failed:', err.message);
    return null;
  }
}

async function ensureInMeetingRoom(socket, meetingId) {
  const room = `meet:${meetingId}`;

  if (socket.rooms.has(room)) return true;

  let meeting = null;
  try {
    meeting = await ChatMeeting.findByPk(meetingId);
  } catch {
    return false;
  }

  if (!meeting || meeting.status === 'ENDED') return false;

  socket._meetingRooms.add(room);
  socket.join(room);
  return true;
}

function initSocketServer(httpServer) {
  const io = new Server(httpServer, {
    path: '/socket.io',
    cors: {
      origin: corsOptions.origin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  setIO(io);
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    const { user } = socket;

    socket.join(`user:${user.id}`);

    socket._meetingRooms = new Set();

    registerGroupHandlers(io, socket);

    const wasOffline = presence.addSocket(user.id, socket.id);
    if (wasOffline) {
      (async () => {
        try {
          await ChatPresence.upsert({ userId: user.id, status: 'ONLINE', lastActiveAt: new Date() });
          const conversationIds = await getMemberConversationIds(user.id);
          if (conversationIds.length) {
            const peers = await ChatConversationMember.findAll({
              where: { conversationId: conversationIds, userId: { [Op.ne]: user.id } },
              attributes: ['userId'],
            });
            emitToUsers(peers.map((p) => p.userId), 'user:online', {
              userId: user.id,
              status: 'ONLINE',
            });
          }
        } catch {
        }
      })();
    }

    socket.on('typing:start', ({ conversationId, memberUserIds } = {}) => {
      if (!conversationId || !Array.isArray(memberUserIds)) return;
      emitToUsers(
        memberUserIds.filter((id) => id !== user.id),
        'typing:start',
        { conversationId, userId: user.id, name: user.getFullName() }
      );
    });

    socket.on('typing:stop', ({ conversationId, memberUserIds } = {}) => {
      if (!conversationId || !Array.isArray(memberUserIds)) return;
      emitToUsers(
        memberUserIds.filter((id) => id !== user.id),
        'typing:stop',
        { conversationId, userId: user.id }
      );
    });

    socket.on('presence:set', async ({ status } = {}) => {
      if (!ChatPresence.STATUSES.includes(status)) return;
      await ChatPresence.upsert({ userId: user.id, status, lastActiveAt: new Date() });
      const conversationIds = await getMemberConversationIds(user.id);
      const peers = await ChatConversationMember.findAll({
        where: { conversationId: conversationIds, userId: { [Op.ne]: user.id } },
        attributes: ['userId'],
      });
      emitToUsers(peers.map((p) => p.userId), 'user:online', { userId: user.id, status });
    });

    socket.on('meet:join', async ({ meetingId } = {}) => {
      if (!meetingId) return;

      let meeting = null;
      try {
        meeting = await ChatMeeting.findByPk(meetingId);
      } catch {
        socket.emit('meet:error', { meetingId, error: 'Server error joining meeting' });
        return;
      }

      if (!meeting) {
        socket.emit('meet:error', { meetingId, error: 'Meeting not found' });
        return;
      }

      if (meeting.status === 'ENDED') {
        socket.emit('meet:error', { meetingId, error: 'Meeting has ended' });
        return;
      }

      const room = `meet:${meetingId}`;
      socket._meetingRooms.add(room);
      socket.join(room);

      socket.emit('meet:joined', {
        meetingId,
        socketId: socket.id,
        userId: user.id,
      });

      socket.to(room).emit('meet:peer-joined', {
        meetingId,
        userId: user.id,
        name: user.getFullName(),
        profileImage: user.profileImage || null,
        socketId: socket.id,
      });
    });

    socket.on('meet:leave', ({ meetingId } = {}) => {
      if (!meetingId) return;
      const room = `meet:${meetingId}`;
      socket._meetingRooms.delete(room);
      socket.leave(room);
      socket.to(room).emit('meet:peer-left', {
        meetingId,
        userId: user.id,
        socketId: socket.id,
        reason: 'left',
      });
    });

    socket.on('meet:offer', ({ meetingId, targetSocketId, sdp } = {}) => {
      if (!meetingId || !targetSocketId || !sdp) return;
      io.to(targetSocketId).emit('meet:offer', {
        meetingId,
        fromSocketId: socket.id,
        fromUserId: user.id,
        fromName: user.getFullName(),
        sdp,
      });
    });

    socket.on('meet:answer', ({ meetingId, targetSocketId, sdp } = {}) => {
      if (!meetingId || !targetSocketId || !sdp) return;
      io.to(targetSocketId).emit('meet:answer', {
        meetingId,
        fromSocketId: socket.id,
        fromUserId: user.id,
        sdp,
      });
    });

    socket.on('meet:ice-candidate', ({ meetingId, targetSocketId, candidate } = {}) => {
      if (!meetingId || !targetSocketId || !candidate) return;
      io.to(targetSocketId).emit('meet:ice-candidate', {
        meetingId,
        fromSocketId: socket.id,
        candidate,
      });
    });

    socket.on('meet:media-state', ({ meetingId, isCameraOn, isMicOn, isScreenSharing } = {}) => {
      if (!meetingId) return;
      socket.to(`meet:${meetingId}`).emit('meet:media-state', {
        meetingId,
        userId: user.id,
        socketId: socket.id,
        isCameraOn,
        isMicOn,
        isScreenSharing,
      });
    });

    socket.on('meet:chat', async ({ meetingId, message } = {}) => {
      if (!meetingId || !message || typeof message !== 'string' || !message.trim()) return;

      const trimmedMessage = message.trim();

      const joinedRoom = await ensureInMeetingRoom(socket, meetingId);
      if (!joinedRoom) {
        socket.emit('meet:error', {
          meetingId,
          error: 'meeting_ended_or_not_found',
          hint: 'This meeting has ended or does not exist.',
        });
        return;
      }

      const room = `meet:${meetingId}`;

      persistMeetChatMessage(meetingId, user.id, trimmedMessage).then((saved) => {
        if (saved) {
          socket.emit('meet:chat:saved', { meetingId, messageId: saved.id });
        }
      });

      const payload = {
        meetingId,
        messageId: null,
        from: {
          userId: user.id,
          name: user.getFullName(),
          profileImage: user.profileImage || null,
        },
        message: trimmedMessage,
        sentAt: new Date().toISOString(),
      };

      io.to(room).emit('meet:chat', payload);
    });

    socket.on('meet:hand-raise', ({ meetingId, raised } = {}) => {
      if (!meetingId) return;
      socket.to(`meet:${meetingId}`).emit('meet:hand-raise', {
        meetingId,
        userId: user.id,
        name: user.getFullName(),
        raised: Boolean(raised),
      });
    });

    socket.on('call:invite', async ({ callId, meetingId, targetUserId, type } = {}) => {
      if (!callId || !meetingId || !targetUserId) return;

      let callData;
      try {
        callData = await callService.getCall(callId, user.id);
      } catch {
        socket.emit('call:error', { callId, error: 'Invalid call' });
        return;
      }

      if (callData.caller.id !== user.id) {
        socket.emit('call:error', { callId, error: 'Unauthorized' });
        return;
      }

      if (callData.status !== 'ringing') {
        socket.emit('call:error', { callId, error: `Call is already ${callData.status}` });
        return;
      }

      const meetRoom = `meet:${meetingId}`;
      socket._meetingRooms.add(meetRoom);
      socket.join(meetRoom);

      io.to(`user:${targetUserId}`).emit('call:incoming', {
        callId,
        meetingId,
        callerId:    user.id,
        callerName:  user.getFullName(),
        callerImage: user.profileImage || null,
        type:        type || callData.callType || 'video',
      });
    });

    socket.on('call:accepted', async ({ callId, meetingId } = {}) => {
      if (!callId || !meetingId) return;

      let result;
      try {
        result = await callService.acceptCall(callId, user.id);
      } catch (err) {
        socket.emit('call:error', { callId, error: err.message });
        return;
      }

      const meetRoom = `meet:${meetingId}`;
      socket._meetingRooms.add(meetRoom);
      socket.join(meetRoom);

      socket.to(meetRoom).emit('call:accepted', {
        callId,
        meetingId: result.meetingId,
        acceptedBy: user.id,
      });
    });

    socket.on('call:rejected', async ({ callId, meetingId } = {}) => {
      if (!callId) return;

      try {
        await callService.rejectCall(callId, user.id);
      } catch {
      }

      if (meetingId) {
        socket.to(`meet:${meetingId}`).emit('call:rejected', {
          callId,
          rejectedBy: user.id,
        });
      }
    });

    socket.on('call:cancel', async ({ callId, meetingId, targetUserId } = {}) => {
      if (!callId) return;

      let result;
      try {
        result = await callService.cancelCall(callId, user.id);
      } catch {
        result = { callId, meetingId, receiverId: targetUserId };
      }

      const receiverId = result.receiverId || targetUserId;
      if (receiverId) {
        io.to(`user:${receiverId}`).emit('call:ended', { callId, reason: 'cancelled' });
      }

      if (meetingId) {
        const meetRoom = `meet:${meetingId}`;
        socket.to(meetRoom).emit('call:ended', { callId, reason: 'cancelled' });
        socket._meetingRooms.delete(meetRoom);
        socket.leave(meetRoom);
      }
    });

    socket.on('call:end', async ({ callId, meetingId } = {}) => {
      if (!callId) return;

      let result;
      try {
        result = await callService.endCall(callId, user.id);
      } catch {
        result = { callId, meetingId };
      }

      const room = meetingId ? `meet:${meetingId}` : null;

      if (room) {
        io.to(room).emit('call:ended', {
          callId,
          endedBy: user.id,
          reason: 'ended',
        });
      }

      if (result.callerId && result.callerId !== user.id) {
        io.to(`user:${result.callerId}`).emit('call:ended', { callId, reason: 'ended' });
      }
      if (result.receiverId && result.receiverId !== user.id) {
        io.to(`user:${result.receiverId}`).emit('call:ended', { callId, reason: 'ended' });
      }

      if (room) {
        socket._meetingRooms.delete(room);
        socket.leave(room);
      }
    });

    socket.on('disconnect', async () => {
      socket._meetingRooms.forEach((room) => {
        const meetingId = room.replace('meet:', '');
        socket.to(room).emit('meet:peer-left', {
          meetingId,
          userId: user.id,
          socketId: socket.id,
          reason: 'disconnect',
        });
      });
      socket._meetingRooms.clear();

      const wentOffline = presence.removeSocket(user.id, socket.id);
      if (!wentOffline) return;

      try {
        await ChatPresence.upsert({ userId: user.id, status: 'OFFLINE', lastActiveAt: new Date() });
        const conversationIds = await getMemberConversationIds(user.id);
        if (conversationIds.length) {
          const peers = await ChatConversationMember.findAll({
            where: { conversationId: conversationIds, userId: { [Op.ne]: user.id } },
            attributes: ['userId'],
          });
          emitToUsers(peers.map((p) => p.userId), 'user:offline', {
            userId: user.id,
            status: 'OFFLINE',
          });
        }
      } catch {
      }
    });
  });

  return io;
}

module.exports = { initSocketServer };
