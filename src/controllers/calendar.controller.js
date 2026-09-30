const asyncHandler = require('../utils/asyncHandler');
const calendarService = require('../services/calendar.service');

const listEvents = asyncHandler(async (req, res) => {
  const { from, to, eventType, employeeId, department, scope } = req.query;
  const events = await calendarService.listEvents(req.user, { from, to, eventType, employeeId, department, scope });
  res.status(200).json({ events });
});

const listMyEvents = asyncHandler(async (req, res) => {
  const { from, to, eventType } = req.query;
  const events = await calendarService.listEvents(req.user, { from, to, eventType, scope: 'mine' });
  res.status(200).json({ events });
});

const listTeamEvents = asyncHandler(async (req, res) => {
  const { from, to, eventType } = req.query;
  const events = await calendarService.listEvents(req.user, { from, to, eventType, scope: 'team' });
  res.status(200).json({ events });
});

const getEvent = asyncHandler(async (req, res) => {
  const event = await calendarService.getEvent(req.user, req.params.id);
  res.status(200).json(event);
});

const createEvent = asyncHandler(async (req, res) => {
  const event = await calendarService.createEvent(req.user, req.body);
  res.status(201).json(event);
});

const updateEvent = asyncHandler(async (req, res) => {
  const event = await calendarService.updateEvent(req.user, req.params.id, req.body);
  res.status(200).json(event);
});

const deleteEvent = asyncHandler(async (req, res) => {
  await calendarService.deleteEvent(req.user, req.params.id);
  res.status(204).send();
});

const addParticipants = asyncHandler(async (req, res) => {
  const event = await calendarService.addParticipants(req.user, req.params.id, req.body.participantIds || []);
  res.status(200).json(event);
});

const updateParticipant = asyncHandler(async (req, res) => {
  const event = await calendarService.updateParticipant(
    req.user,
    req.params.id,
    req.params.participantId,
    req.body
  );
  res.status(200).json(event);
});

const listHolidays = asyncHandler(async (req, res) => {
  const { year, type } = req.query;
  const holidays = await calendarService.listHolidays({ year, type });
  res.status(200).json({ holidays });
});

const listLeaves = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const leaves = await calendarService.listLeaves(req.user, { from, to });
  res.status(200).json({ leaves });
});

const listBirthdays = asyncHandler(async (req, res) => {
  const { month } = req.query;
  const birthdays = await calendarService.listBirthdays({ month });
  res.status(200).json({ birthdays });
});

module.exports = {
  listEvents,
  listMyEvents,
  listTeamEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  addParticipants,
  updateParticipant,
  listHolidays,
  listLeaves,
  listBirthdays,
};