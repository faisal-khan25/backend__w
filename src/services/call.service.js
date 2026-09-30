const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const { CallRecord, ChatMeeting, ChatConversation, ChatConversationMember, User } = require('../models');
const ApiError = require('../utils/ApiError');

const USER_ATTRS = ['id', 'firstName', 'lastName', 'email', 'profileImage'];

function toCallResponse(record, caller, receiver) {
  return {
    callId: record.id,
    meetingId: record.meetingId,
    callType: record.callType,
    status: record.status,
    conversationId: record.conversationId,
    caller: caller
      ? { id: caller.id, name: caller.getFullName(), profileImage: caller.profileImage }
      : { id: record.callerId },
    receiver: receiver
      ? { id: receiver.id, name: receiver.getFullName(), profileImage: receiver.profileImage }
      : { id: record.receiverId },
    startedAt: record.startedAt,
    acceptedAt: record.acceptedAt,
    endedAt: record.endedAt,
  };
}

async function isUserBusy(userId) {
  const active = await CallRecord.findOne({
    where: {
      [Op.or]: [{ callerId: userId }, { receiverId: userId }],
      status: { [Op.in]: ['ringing', 'active'] },
    },
  });
  return Boolean(active);
}

async function initiateCall(callerId, { targetUserId, callType = 'video', conversationId } = {}) {
  if (!targetUserId) throw new ApiError(400, 'targetUserId is required');
  if (targetUserId === callerId) throw new ApiError(400, 'You cannot call yourself');

  const [caller, receiver] = await Promise.all([
    User.findByPk(callerId, { attributes: USER_ATTRS }),
    User.findByPk(targetUserId, { attributes: USER_ATTRS }),
  ]);

  if (!caller) throw new ApiError(401, 'Caller not found');
  if (!receiver || !receiver.isActive) {
    throw new ApiError(404, 'The user you are trying to call does not exist or is inactive');
  }

  if (!CallRecord.TYPES.includes(callType)) {
    throw new ApiError(400, `callType must be one of: ${CallRecord.TYPES.join(', ')}`);
  }

  const [callerBusy, receiverBusy] = await Promise.all([
    isUserBusy(callerId),
    isUserBusy(targetUserId),
  ]);

  if (callerBusy) throw new ApiError(409, 'You are already in a call');
  if (receiverBusy) throw new ApiError(409, `${receiver.getFullName()} is already in another call`);

  if (conversationId) {
    const [callerMember, receiverMember] = await Promise.all([
      ChatConversationMember.findOne({ where: { conversationId, userId: callerId, leftAt: null } }),
      ChatConversationMember.findOne({ where: { conversationId, userId: targetUserId, leftAt: null } }),
    ]);
    if (!callerMember) throw new ApiError(403, 'You are not a member of this conversation');
    if (!receiverMember) throw new ApiError(403, 'The recipient is not a member of this conversation');
  }

  let resolvedConversationId = conversationId;
  if (!resolvedConversationId) {
    const conv = await ChatConversation.create({
      type: 'DIRECT',
      directKey: [callerId, targetUserId].sort().join(':'),
      createdBy: callerId,
    });
    await ChatConversationMember.bulkCreate([
      { conversationId: conv.id, userId: callerId, role: 'OWNER' },
      { conversationId: conv.id, userId: targetUserId, role: 'OWNER' },
    ]);
    resolvedConversationId = conv.id;
  }

  const meeting = await ChatMeeting.create({
    conversationId: resolvedConversationId,
    createdBy: callerId,
    title: `${callType === 'audio' ? 'Audio' : 'Video'} call`,
    status: 'ACTIVE',
  });
  meeting.meetingUrl = `/workspace/meet/${meeting.id}`;
  await meeting.save();

  const record = await CallRecord.create({
    meetingId: meeting.id,
    callerId,
    receiverId: targetUserId,
    conversationId: resolvedConversationId,
    callType,
    status: 'ringing',
  });

  return toCallResponse(record, caller, receiver);
}

async function acceptCall(callId, acceptingUserId) {
  const record = await CallRecord.findByPk(callId);
  if (!record) throw new ApiError(404, 'Call not found');
  if (record.receiverId !== acceptingUserId) {
    throw new ApiError(403, 'Only the call recipient can accept this call');
  }
  if (record.status !== 'ringing') {
    throw new ApiError(409, `Cannot accept a call that is already ${record.status}`);
  }

  record.status = 'active';
  record.acceptedAt = new Date();
  await record.save();

  return { callId: record.id, meetingId: record.meetingId, status: record.status };
}

async function rejectCall(callId, rejectingUserId) {
  const record = await CallRecord.findByPk(callId);
  if (!record) throw new ApiError(404, 'Call not found');
  if (record.receiverId !== rejectingUserId) {
    throw new ApiError(403, 'Only the call recipient can reject this call');
  }
  if (record.status !== 'ringing') {
    throw new ApiError(409, `Cannot reject a call that is already ${record.status}`);
  }

  record.status = 'rejected';
  record.endedAt = new Date();
  await record.save();

  return { callId: record.id, meetingId: record.meetingId };
}

async function cancelCall(callId, cancellingUserId) {
  const record = await CallRecord.findByPk(callId);
  if (!record) throw new ApiError(404, 'Call not found');
  if (record.callerId !== cancellingUserId) {
    throw new ApiError(403, 'Only the caller can cancel this call');
  }
  if (!['ringing', 'active'].includes(record.status)) {
    return { callId: record.id, meetingId: record.meetingId, status: record.status };
  }

  record.status = 'cancelled';
  record.endedAt = new Date();
  await record.save();

  await ChatMeeting.update({ status: 'ENDED' }, { where: { id: record.meetingId } });

  return { callId: record.id, meetingId: record.meetingId, receiverId: record.receiverId };
}

async function endCall(callId, endingUserId) {
  const record = await CallRecord.findByPk(callId);
  if (!record) throw new ApiError(404, 'Call not found');
  if (record.callerId !== endingUserId && record.receiverId !== endingUserId) {
    throw new ApiError(403, 'You are not a participant in this call');
  }
  if (record.status === 'ended') {
    return { callId: record.id, meetingId: record.meetingId, status: 'ended' };
  }

  record.status = 'ended';
  record.endedAt = new Date();
  await record.save();

  await ChatMeeting.update({ status: 'ENDED' }, { where: { id: record.meetingId } });

  return {
    callId: record.id,
    meetingId: record.meetingId,
    callerId: record.callerId,
    receiverId: record.receiverId,
  };
}

async function markMissed(callId) {
  const record = await CallRecord.findByPk(callId);
  if (!record || record.status !== 'ringing') return;
  record.status = 'missed';
  record.endedAt = new Date();
  await record.save();
}

async function getCall(callId, userId) {
  const record = await CallRecord.findByPk(callId, {
    include: [
      { model: User, as: 'caller', attributes: USER_ATTRS },
      { model: User, as: 'receiver', attributes: USER_ATTRS },
    ],
  });
  if (!record) throw new ApiError(404, 'Call not found');
  if (record.callerId !== userId && record.receiverId !== userId) {
    throw new ApiError(403, 'You are not a participant in this call');
  }
  return toCallResponse(record, record.caller, record.receiver);
}

async function getCallHistory(userId, { page = 1, pageSize = 20 } = {}) {
  const limit = Number(pageSize);
  const offset = (Number(page) - 1) * limit;

  const { rows, count } = await CallRecord.findAndCountAll({
    where: {
      [Op.or]: [{ callerId: userId }, { receiverId: userId }],
      status: { [Op.in]: ['ended', 'rejected', 'cancelled', 'missed'] },
    },
    include: [
      { model: User, as: 'caller', attributes: USER_ATTRS },
      { model: User, as: 'receiver', attributes: USER_ATTRS },
    ],
    order: [['started_at', 'DESC']],
    limit,
    offset,
  });

  return {
    calls: rows.map((r) => toCallResponse(r, r.caller, r.receiver)),
    pagination: {
      page: Number(page),
      pageSize: limit,
      total: count,
      totalPages: Math.ceil(count / limit) || 0,
    },
  };
}

module.exports = {
  initiateCall,
  acceptCall,
  rejectCall,
  cancelCall,
  endCall,
  markMissed,
  getCall,
  getCallHistory,
  isUserBusy,
};
