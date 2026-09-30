const asyncHandler = require('../utils/asyncHandler');
const meetingService = require('../services/meeting.service');

const listMyMeetings = asyncHandler(async (req, res) => {
  const result = await meetingService.listMyMeetings(req.user);
  res.status(200).json({ meetings: result });
});

const createMeeting = asyncHandler(async (req, res) => {
  const { conversationId, title, scheduledAt } = req.body;
  const result = await meetingService.createMeeting(req.user, { conversationId, title, scheduledAt });
  res.status(201).json(result);
});

const scheduleMeetingWithCalendarEvent = asyncHandler(async (req, res) => {
  const { conversationId, title, startsAt, endsAt, attendeeIds } = req.body;
  const result = await meetingService.scheduleMeetingWithCalendarEvent(req.user, {
    conversationId,
    title,
    startsAt,
    endsAt,
    attendeeIds,
  });
  res.status(201).json(result);
});

const getMeeting = asyncHandler(async (req, res) => {
  const result = await meetingService.getMeeting(req.user, req.params.id);
  res.status(200).json(result);
});

const startMeeting = asyncHandler(async (req, res) => {
  const result = await meetingService.startMeeting(req.user, req.params.id);
  res.status(200).json(result);
});

const endMeeting = asyncHandler(async (req, res) => {
  const result = await meetingService.endMeeting(req.user, req.params.id);
  res.status(200).json(result);
});

module.exports = {
  listMyMeetings,
  createMeeting,
  scheduleMeetingWithCalendarEvent,
  getMeeting,
  startMeeting,
  endMeeting,
};
