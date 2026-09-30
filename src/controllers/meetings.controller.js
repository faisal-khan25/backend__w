const asyncHandler = require('../utils/asyncHandler');
const meetingsService = require('../services/meetings.service');

const listMeetings = asyncHandler(async (req, res) => {
  const result = await meetingsService.listMeetings(req.user);
  res.status(200).json({ meetings: result });
});

const createMeeting = asyncHandler(async (req, res) => {
  const { name, parentId } = req.body;
  const result = await meetingsService.createMeeting(req.user, { name, parentId });
  res.status(201).json(result);
});

const getMeeting = asyncHandler(async (req, res) => {
  const result = await meetingsService.getMeeting(req.user, req.params.id);
  res.status(200).json(result);
});

const updateMeetingContent = asyncHandler(async (req, res) => {
  const result = await meetingsService.updateMeetingContent(req.user, req.params.id, req.body.slides);
  res.status(200).json(result);
});

const renameMeeting = asyncHandler(async (req, res) => {
  const result = await meetingsService.renameMeeting(req.user, req.params.id, req.body.name);
  res.status(200).json(result);
});

const deleteMeeting = asyncHandler(async (req, res) => {
  await meetingsService.deleteMeeting(req.user, req.params.id);
  res.status(204).send();
});

module.exports = {
  listMeetings,
  createMeeting,
  getMeeting,
  updateMeetingContent,
  renameMeeting,
  deleteMeeting,
};
