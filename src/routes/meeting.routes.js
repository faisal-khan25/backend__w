const express = require('express');
const controller = require('../controllers/meeting.controller');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();
router.use(requireAuth);

router.get('/', controller.listMyMeetings);
router.post('/', controller.createMeeting);
router.post('/scheduled', controller.scheduleMeetingWithCalendarEvent);
router.get('/:id', controller.getMeeting);
router.post('/:id/start', controller.startMeeting);
router.post('/:id/end', controller.endMeeting);

module.exports = router;
