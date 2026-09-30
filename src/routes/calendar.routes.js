const express = require('express');
const controller = require('../controllers/calendar.controller');
const { requireAuth, requireRole } = require('../middleware/requireAuth');
const {
  listEventsValidators,
  createEventValidators,
  updateEventValidators,
  addParticipantsValidators,
  updateParticipantValidators,
  listHolidaysValidators,
  listLeavesValidators,
  listBirthdaysValidators,
} = require('../validators/hrmsCalender.validators');

const router = express.Router();

router.use(requireAuth);

router.get('/holidays', listHolidaysValidators, controller.listHolidays);
router.get('/leaves', listLeavesValidators, controller.listLeaves);
router.get('/birthdays', listBirthdaysValidators, controller.listBirthdays);

router.get('/events', listEventsValidators, controller.listEvents);
router.get('/my-events', controller.listMyEvents);
router.get('/team', requireRole('MANAGER', 'HR', 'ADMIN'), controller.listTeamEvents);

router.post('/events', createEventValidators, controller.createEvent);
router.get('/events/:id', controller.getEvent);
router.patch('/events/:id', updateEventValidators, controller.updateEvent);
router.delete('/events/:id', controller.deleteEvent);

router.post('/events/:id/participants', addParticipantsValidators, controller.addParticipants);
router.patch('/events/:id/participants/:participantId', updateParticipantValidators, controller.updateParticipant);

module.exports = router;