const express = require('express');
const controller = require('../controllers/chatspace.controller');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();
router.use(requireAuth);

router.get('/', controller.listMySpaces);
router.post('/', controller.createSpace);
router.get('/:id', controller.getSpace);
router.put('/:id', controller.updateSpace);
router.post('/:id/members', controller.addSpaceMembers);
router.delete('/:id/members/:userId', controller.removeSpaceMember);
router.post('/:id/archive', controller.archiveSpace);

module.exports = router;