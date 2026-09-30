const express = require('express');
const controller = require('../controllers/meet.controller');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();
router.use(requireAuth);

router.get('/', controller.listMyMeetings);
router.get('/history', controller.getMeetingHistory);
router.post('/', controller.createMeeting);

router.get('/:id', controller.getMeeting);
router.post('/:id/start', controller.startMeeting);
router.post('/:id/end', controller.endMeeting);

router.post('/:id/join', controller.joinMeeting);
router.post('/:id/leave', controller.leaveMeeting);

router.patch('/:id/media', controller.updateMediaState);
router.post('/:id/invite', controller.inviteToMeeting);

router.get('/:id/chat', controller.getMeetingChatHistory);

module.exports = router;
