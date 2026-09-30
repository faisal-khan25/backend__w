const asyncHandler = require('../utils/asyncHandler');
const meetService = require('../services/meet.service');
const { Op } = require('sequelize');
const { ChatMeeting, ChatMessage, User } = require('../models');



const listMyMeetings = asyncHandler(async (req, res) => {
  const { status, page, pageSize } = req.query;
  const result = await meetService.listMyMeetings(req.user, { status, page, pageSize });
  res.status(200).json(result);
});

const getMeetingHistory = asyncHandler(async (req, res) => {
  const { page, pageSize } = req.query;
  const result = await meetService.getMeetingHistory(req.user, { page, pageSize });
  res.status(200).json(result);
});

const createMeeting = asyncHandler(async (req, res) => {
  const { conversationId, title, scheduledAt } = req.body;
  const result = await meetService.createMeeting(req.user, { conversationId, title, scheduledAt });
  res.status(201).json(result);
});

const getMeeting = asyncHandler(async (req, res) => {
  const result = await meetService.getMeeting(req.user, req.params.id);
  res.status(200).json(result);
});



const startMeeting = asyncHandler(async (req, res) => {
  const result = await meetService.startMeeting(req.user, req.params.id);
  res.status(200).json(result);
});

const endMeeting = asyncHandler(async (req, res) => {
  const result = await meetService.endMeeting(req.user, req.params.id);
  res.status(200).json(result);
});



const joinMeeting = asyncHandler(async (req, res) => {
  const result = await meetService.joinMeeting(req.user, req.params.id);
  res.status(200).json(result);
});

const leaveMeeting = asyncHandler(async (req, res) => {
  const result = await meetService.leaveMeeting(req.user, req.params.id);
  res.status(200).json(result);
});



const updateMediaState = asyncHandler(async (req, res) => {
  const { isCameraOn, isMicOn, isScreenSharing } = req.body;
  const result = await meetService.updateMediaState(req.user, req.params.id, {
    isCameraOn,
    isMicOn,
    isScreenSharing,
  });
  res.status(200).json(result);
});



const inviteToMeeting = asyncHandler(async (req, res) => {
  const { userIds } = req.body;
  const result = await meetService.inviteToMeeting(req.user, req.params.id, { userIds });
  res.status(200).json(result);
});

const getMeetingChatHistory = asyncHandler(async (req, res) => {
  const { id: meetingId } = req.params;
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const before = req.query.before ? new Date(req.query.before) : null;

  const meeting = await ChatMeeting.findByPk(meetingId);
  if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

  const where = {
    meetingId,
    messageType: 'TEXT',
    isDeleted: false,
  };
  if (before && !isNaN(before.getTime())) {
    where.createdAt = { [Op.lt]: before };
  }

  const messages = await ChatMessage.findAll({
    where,
    include: [
      {
        model: User,
        as: 'sender',
        attributes: ['id', 'firstName', 'lastName', 'profileImage'],
      },
    ],
    order: [['createdAt', 'ASC']],
    limit,
  });

  res.status(200).json({
    meetingId,
    messages: messages.map((m) => ({
      id: m.id,
      message: m.content,
      sentAt: m.createdAt,
      from: m.sender
        ? {
            userId: m.sender.id,
            name: `${m.sender.firstName} ${m.sender.lastName || ''}`.trim(),
            profileImage: m.sender.profileImage || null,
          }
        : null,
    })),
  });
});

module.exports = {
  listMyMeetings,
  getMeetingHistory,
  createMeeting,
  getMeeting,
  startMeeting,
  endMeeting,
  joinMeeting,
  leaveMeeting,
  updateMediaState,
  inviteToMeeting,
  getMeetingChatHistory,
};
