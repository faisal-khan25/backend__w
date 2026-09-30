const { Op } = require('sequelize');
const {
  ChatMeeting,
  ChatConversation,
  ChatConversationMember,
  ChatMessage,
  MeetingParticipant,
  User,
} = require('../models');
const ApiError = require('../utils/ApiError');
const notificationService = require('./notification.service');
const { broadcastToConversation } = require('../realtime/socket');
const { emitToUsers } = require('../realtime/emit');

const USER_ATTRS = ['id', 'firstName', 'lastName', 'email', 'profileImage', 'department'];

function userBrief(u) {
  if (!u) return null;
  return {
    id: u.id,
    name: u.getFullName(),
    email: u.email,
    profileImage: u.profileImage,
    department: u.department,
  };
}

async function toMeetingResponse(meeting, viewerId) {
  const [organizer, activeParticipants] = await Promise.all([
    User.findByPk(meeting.createdBy, { attributes: USER_ATTRS }),
    MeetingParticipant.findAll({
      where: { meetingId: meeting.id, leftAt: null },
      include: [{ model: User, as: 'user', attributes: USER_ATTRS }],
    }),
  ]);

  return {
    id: meeting.id,
    conversationId: meeting.conversationId,
    title: meeting.title,
    meetingUrl: meeting.meetingUrl || `/workspace/meet/${meeting.id}`,
    roomId: meeting.id,
    scheduledAt: meeting.scheduledAt,
    status: meeting.status,
    organizer: userBrief(organizer),
    participants: activeParticipants.map((p) => ({
      id: p.id,
      user: userBrief(p.user),
      joinedAt: p.joinedAt,
      isCameraOn: p.isCameraOn,
      isMicOn: p.isMicOn,
      isScreenSharing: p.isScreenSharing,
      isMe: viewerId ? p.userId === viewerId : false,
    })),
    participantCount: activeParticipants.length,
    createdAt: meeting.createdAt,
  };
}

async function assertConversationMember(conversationId, userId) {
  const member = await ChatConversationMember.findOne({
    where: { conversationId, userId, leftAt: null },
  });
  if (!member) throw ApiError.notConversationMember();
}


async function createMeeting(user, { conversationId, title, scheduledAt } = {}) {
  if (conversationId) {
    await assertConversationMember(conversationId, user.id);
  } else {
    const conversation = await ChatConversation.create({
      type: 'GROUP',
      name: title || 'Instant Meeting',
      createdBy: user.id,
      isMeetingOnly: true,
    });
    await ChatConversationMember.create({
      conversationId: conversation.id,
      userId: user.id,
      role: 'OWNER',
    });
    conversationId = conversation.id;
  }

  const meeting = await ChatMeeting.create({
    conversationId,
    createdBy: user.id,
    title: title || 'Team Meeting',
    scheduledAt: scheduledAt || null,
    status: scheduledAt ? 'SCHEDULED' : 'ACTIVE',
  });
  meeting.meetingUrl = `/workspace/meet/${meeting.id}`;
  await meeting.save();

  
  const chatMsg = await ChatMessage.create({
    conversationId,
    senderId: user.id,
    messageType: 'MEETING',
    meetingId: meeting.id,
    content: scheduledAt
      ? `${user.getFullName()} scheduled a meeting: ${meeting.title}`
      : `${user.getFullName()} started a meeting`,
  });

  await ChatConversation.update(
    { lastMessageAt: new Date(), lastMessagePreview: `📹 ${meeting.title}` },
    { where: { id: conversationId } }
  );

  const response = await toMeetingResponse(meeting, user.id);

  
  broadcastToConversation(conversationId, 'meeting:created', {
    message: { id: chatMsg.id },
    meeting: response,
  });

  
  const members = await ChatConversationMember.findAll({
    where: { conversationId, leftAt: null },
  });
  await notificationService.notifyUsers(
    members.map((m) => m.userId).filter((id) => id !== user.id),
    {
      type: 'CHAT',
      title: scheduledAt
        ? `Meeting scheduled: ${meeting.title}`
        : `${user.getFullName()} started a meeting`,
      message: meeting.title,
      referenceId: meeting.id,
      referenceType: 'MEETING',
    }
  );

  return response;
}



async function getMeeting(user, meetingId) {
  const meeting = await ChatMeeting.findByPk(meetingId);
  if (!meeting) throw new ApiError(404, 'Meeting not found');
  
  return toMeetingResponse(meeting, user.id);
}

async function listMyMeetings(user, { status, page = 1, pageSize = 20 } = {}) {
  const memberships = await ChatConversationMember.findAll({
    where: { userId: user.id, leftAt: null },
    attributes: ['conversationId'],
  });
  const conversationIds = memberships.map((m) => m.conversationId);
  if (!conversationIds.length) return { meetings: [], pagination: buildPagination(0, page, pageSize) };

  const where = { conversationId: { [Op.in]: conversationIds } };
  if (status) {
    where.status = Array.isArray(status) ? { [Op.in]: status } : status;
  }

  const limit = Number(pageSize);
  const offset = (Number(page) - 1) * limit;

  const { rows, count } = await ChatMeeting.findAndCountAll({
    where,
    order: [
      ['status', 'ASC'],
      ['scheduled_at', 'DESC'],
      ['created_at', 'DESC'],
    ],
    limit,
    offset,
  });

  return {
    meetings: await Promise.all(rows.map((m) => toMeetingResponse(m, user.id))),
    pagination: buildPagination(count, page, pageSize),
  };
}

async function getMeetingHistory(user, { page = 1, pageSize = 20 } = {}) {
  const participations = await MeetingParticipant.findAll({
    where: { userId: user.id },
    attributes: ['meetingId'],
    group: ['meetingId'],
  });
  const meetingIds = participations.map((p) => p.meetingId);
  if (!meetingIds.length) return { meetings: [], pagination: buildPagination(0, page, pageSize) };

  const limit = Number(pageSize);
  const offset = (Number(page) - 1) * limit;

  const { rows, count } = await ChatMeeting.findAndCountAll({
    where: { id: { [Op.in]: meetingIds }, status: 'ENDED' },
    order: [['created_at', 'DESC']],
    limit,
    offset,
  });

  return {
    meetings: await Promise.all(rows.map((m) => toMeetingResponse(m, user.id))),
    pagination: buildPagination(count, page, pageSize),
  };
}



async function startMeeting(user, meetingId) {
  const meeting = await ChatMeeting.findByPk(meetingId);
  if (!meeting) throw new ApiError(404, 'Meeting not found');
  if (meeting.status === 'ENDED') throw new ApiError(409, 'Meeting has already ended');

  meeting.status = 'ACTIVE';
  await meeting.save();

  const response = await toMeetingResponse(meeting, user.id);
  broadcastToConversation(meeting.conversationId, 'meeting:started', response);
  return response;
}

async function endMeeting(user, meetingId) {
  const meeting = await ChatMeeting.findByPk(meetingId);
  if (!meeting) throw new ApiError(404, 'Meeting not found');
  if (meeting.createdBy !== user.id) {
    throw new ApiError(403, 'Only the meeting organizer can end the meeting for everyone');
  }

  meeting.status = 'ENDED';
  await meeting.save();

  await MeetingParticipant.update(
    { leftAt: new Date() },
    { where: { meetingId, leftAt: null } }
  );

  broadcastToConversation(meeting.conversationId, 'meeting:ended', {
    meetingId,
    endedBy: user.id,
  });
  return { success: true };
}

async function joinMeeting(user, meetingId) {
  const meeting = await ChatMeeting.findByPk(meetingId);
  if (!meeting) throw new ApiError(404, 'Meeting not found');
  if (meeting.status === 'ENDED') throw new ApiError(409, 'Meeting has already ended');

  
  if (meeting.status === 'SCHEDULED') {
    meeting.status = 'ACTIVE';
    await meeting.save();
  }

  
  await MeetingParticipant.update(
    { leftAt: new Date() },
    { where: { meetingId, userId: user.id, leftAt: null } }
  );

  const participant = await MeetingParticipant.create({
    meetingId,
    userId: user.id,
    isCameraOn: false,
    isMicOn: false,
    isScreenSharing: false,
  });

  const response = await toMeetingResponse(meeting, user.id);

  
  const activeParticipantIds = response.participants.map((p) => p.user?.id).filter(Boolean);
  emitToUsers(
    activeParticipantIds.filter((id) => id !== user.id),
    'meet:participant-joined',
    {
      meetingId,
      participant: {
        id: participant.id,
        user: userBrief(user),
        isCameraOn: false,
        isMicOn: false,
        isScreenSharing: false,
      },
    }
  );

  return response;
}

async function leaveMeeting(user, meetingId) {
  const meeting = await ChatMeeting.findByPk(meetingId);
  if (!meeting) throw new ApiError(404, 'Meeting not found');

  await MeetingParticipant.update(
    { leftAt: new Date() },
    { where: { meetingId, userId: user.id, leftAt: null } }
  );

  
  const remaining = await MeetingParticipant.findAll({
    where: { meetingId, leftAt: null },
    attributes: ['userId'],
  });
  emitToUsers(
    remaining.map((p) => p.userId),
    'meet:participant-left',
    { meetingId, userId: user.id }
  );

  return { success: true };
}


async function updateMediaState(user, meetingId, { isCameraOn, isMicOn, isScreenSharing }) {
  const [updated] = await MeetingParticipant.update(
    {
      ...(isCameraOn !== undefined && { isCameraOn }),
      ...(isMicOn !== undefined && { isMicOn }),
      ...(isScreenSharing !== undefined && { isScreenSharing }),
    },
    { where: { meetingId, userId: user.id, leftAt: null } }
  );

  if (!updated) throw new ApiError(404, 'You are not an active participant in this meeting');

  const participants = await MeetingParticipant.findAll({
    where: { meetingId, leftAt: null },
    attributes: ['userId'],
  });

  emitToUsers(
    participants.map((p) => p.userId),
    'meet:media-state',
    {
      meetingId,
      userId: user.id,
      isCameraOn,
      isMicOn,
      isScreenSharing,
    }
  );

  return { success: true };
}


async function getParticipants(meetingId) {
  return MeetingParticipant.findAll({
    where: { meetingId, leftAt: null },
    include: [{ model: User, as: 'user', attributes: USER_ATTRS }],
    order: [['joinedAt', 'ASC']],
  });
}


async function inviteToMeeting(user, meetingId, { userIds = [] }) {
  const meeting = await ChatMeeting.findByPk(meetingId);
  if (!meeting) throw new ApiError(404, 'Meeting not found');

  await notificationService.notifyUsers(userIds, {
    type: 'CHAT',
    title: `${user.getFullName()} invited you to a meeting`,
    message: meeting.title,
    referenceId: meeting.id,
    referenceType: 'MEETING',
  });

  return {
    meetingUrl: `/workspace/meet/${meeting.id}`,
    invitedCount: userIds.length,
  };
}



function buildPagination(count, page, pageSize) {
  const limit = Number(pageSize);
  return {
    page: Number(page),
    pageSize: limit,
    total: count,
    totalPages: Math.ceil(count / limit) || 0,
  };
}

module.exports = {
  createMeeting,
  getMeeting,
  listMyMeetings,
  getMeetingHistory,
  startMeeting,
  endMeeting,
  joinMeeting,
  leaveMeeting,
  updateMediaState,
  getParticipants,
  inviteToMeeting,
};
