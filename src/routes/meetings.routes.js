const express = require('express');
const controller = require('../controllers/meetings.controller');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();
router.use(requireAuth);

router.get('/',              controller.listMeetings);
router.post('/',             controller.createMeeting);
router.get('/:id',           controller.getMeeting);
router.put('/:id/content',   controller.updateMeetingContent);
router.patch('/:id/content', controller.updateMeetingContent);
router.put('/:id/rename',    controller.renameMeeting);
router.delete('/:id',        controller.deleteMeeting);

module.exports = router;
