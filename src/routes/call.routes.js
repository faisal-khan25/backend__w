const express = require('express');
const controller = require('../controllers/call.controller');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();
router.use(requireAuth);

router.get('/', controller.getCallHistory);

router.post('/', controller.initiateCall);

router.get('/:callId', controller.getCall);

router.post('/:callId/accept', controller.acceptCall);

router.post('/:callId/reject', controller.rejectCall);

router.post('/:callId/cancel', controller.cancelCall);

router.post('/:callId/end', controller.endCall);

module.exports = router;
