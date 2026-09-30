const { Op } = require('sequelize');
const { ChatMeeting, ChatConversation, ChatConversationMember, ChatMessage, User, CalendarEvent, CalendarEventAttendee } = require('../models');
const ApiError = require('../utils/ApiError');
const notificationService = require('./notification.service');
const { broadcastToConversation, broadcastToUser } = require('../realtime/socket');

function userBrief(u) {
  if (!u) return null;
  return { id: u.id, name: u.getFullName(), email: u.email };
}

async function toMeetingResponse(meeting) {
  const organizer = await User.findByPk(meeting.createdBy);
  return {
    id: meeting.id,
    conversationId: meeting.conversationId,
    title: meeting.title,
    meetingUrl: meeting.meetingUrl,
    roomId: meeting.id,
    scheduledAt: meeting.scheduledAt,
    status: meeting.status,
    organizer: userBrief(organizer),
    createdAt: meeting.createdAt,
  };
}

async function assertConversationMember(conversationId, userId) {
  const member = await ChatConversationMember.findOne({ where: { conversationId, userId, leftAt: null } });
  if (!member) throw ApiError.notConversationMember();
}

async function createMeeting(user, { conversationId, title, scheduledAt } = {}) {
  await assertConversationMember(conversationId, user.id);

  const meeting = await ChatMeeting.create({
    conversationId,
    createdBy: user.id,
    title: title || 'Team Meeting',
    scheduledAt: scheduledAt || null,
    status: scheduledAt ? 'SCHEDULED' : 'ACTIVE',
  });
  meeting.meetingUrl = `/meetings/${meeting.id}`;
  await meeting.save();

  const message = await ChatMessage.create({
    conversationId,
    senderId: user.id,
    messageType: 'MEETING',
    meetingId: meeting.id,
    content: scheduledAt ? `${user.getFullName()} scheduled a meeting: ${meeting.title}` : `${user.getFullName()} started a meeting`,
  });
  await ChatConversation.update(
    { lastMessageAt: new Date(), lastMessagePreview: `📹 ${meeting.title}` },
    { where: { id: conversationId } }
  );

  const response = await toMeetingResponse(meeting);
  broadcastToConversation(conversationId, 'meeting:created', { message: { id: message.id }, meeting: response });

  const members = await ChatConversationMember.findAll({ where: { conversationId, leftAt: null } });
  await notificationService.notifyUsers(
    members.map((m) => m.userId).filter((id) => id !== user.id),
    {
      type: 'CHAT',
      title: response.status === 'ACTIVE' ? `${user.getFullName()} started a meeting` : `Meeting scheduled: ${meeting.title}`,
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
  await assertConversationMember(meeting.conversationId, user.id);
  return toMeetingResponse(meeting);
}

async function startMeeting(user, meetingId) {
  const meeting = await ChatMeeting.findByPk(meetingId);
  if (!meeting) throw new ApiError(404, 'Meeting not found');
  await assertConversationMember(meeting.conversationId, user.id);

  meeting.status = 'ACTIVE';
  await meeting.save();
  const response = await toMeetingResponse(meeting);
  broadcastToConversation(meeting.conversationId, 'meeting:started', response);
  return response;
}

async function endMeeting(user, meetingId) {
  const meeting = await ChatMeeting.findByPk(meetingId);
  if (!meeting) throw new ApiError(404, 'Meeting not found');
  await assertConversationMember(meeting.conversationId, user.id);

  meeting.status = 'ENDED';
  await meeting.save();
  broadcastToConversation(meeting.conversationId, 'meeting:ended', { id: meeting.id });
  return { success: true };
}

async function listMyMeetings(user) {
  const memberships = await ChatConversationMember.findAll({ where: { userId: user.id, leftAt: null } });
  const conversationIds = memberships.map((m) => m.conversationId);
  if (conversationIds.length === 0) return [];

  const meetings = await ChatMeeting.findAll({
    where: {
      conversationId: { [Op.in]: conversationIds },
      status: { [Op.in]: ['SCHEDULED', 'ACTIVE'] },
    },
    order: [['scheduledAt', 'ASC']],
  });
  return Promise.all(meetings.map(toMeetingResponse));
}

async function scheduleMeetingWithCalendarEvent(user, { conversationId, title, startsAt, endsAt, attendeeIds = [] }) {
  await assertConversationMember(conversationId, user.id);

  const meeting = await ChatMeeting.create({
    conversationId,
    createdBy: user.id,
    title: title || 'Team Meeting',
    scheduledAt: startsAt,
    status: 'SCHEDULED',
    meetingUrl: null,
  });
  meeting.meetingUrl = `/meetings/${meeting.id}`;
  await meeting.save();

  const event = await CalendarEvent.create({
    organizerId: user.id,
    title: title || 'Team Meeting',
    startsAt,
    endsAt,
    meetingId: meeting.id,
  });

  const uniqueAttendeeIds = [...new Set(attendeeIds)].filter((id) => id !== user.id);
  if (uniqueAttendeeIds.length) {
    await CalendarEventAttendee.bulkCreate(
      uniqueAttendeeIds.map((userId) => ({ eventId: event.id, userId }))
    );
    await notificationService.notifyUsers(uniqueAttendeeIds, {
      type: 'CALENDAR',
      title: 'New event invitation',
      message: `${user.getFullName()} invited you to "${event.title}"`,
      referenceId: event.id,
      referenceType: 'CALENDAR_EVENT',
    });
  }

  return { meeting: await toMeetingResponse(meeting), eventId: event.id };
}

module.exports = {
  createMeeting,
  getMeeting,
  startMeeting,
  endMeeting,
  listMyMeetings,
  scheduleMeetingWithCalendarEvent,
};