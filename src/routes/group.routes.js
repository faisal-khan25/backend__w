const express = require('express');
const controller = require('../controllers/group.controller');
const { requireAuth, requireRole } = require('../middleware/requireAuth');
const {
  handleGroupIconUpload,
  handleGroupAttachmentUpload,
} = require('../middleware/groupupload');
const { GROUP_CREATE_ROLES } = require('../services/group.service');
const {
  createGroupValidators,
  updateGroupValidators,
  groupIdValidators,
  addMembersValidators,
  memberParamValidators,
  changeRoleValidators,
  sendMessageValidators,
  listMessagesValidators,
  attachmentValidators,
  messageParamValidators,
  searchPeopleValidators,
  listMembersValidators,
} = require('../validators/group.validators');

const router = express.Router();


router.use(requireAuth);


router.get('/people', searchPeopleValidators, controller.searchPeople);


router.get('/messages/search', controller.searchMessages);
router.delete('/messages/:messageId', controller.deleteMessage);


router.get('/', controller.listMyGroups);
router.post(
  '/',
  requireRole(...GROUP_CREATE_ROLES),
  createGroupValidators,
  controller.createGroup
);
router.get('/:groupId', groupIdValidators, controller.getGroup);
router.put('/:groupId', updateGroupValidators, controller.updateGroup);
router.delete('/:groupId', groupIdValidators, controller.deleteGroup);
router.post('/:groupId/icon', groupIdValidators, handleGroupIconUpload, controller.uploadGroupIcon);


router.get('/:groupId/members', listMembersValidators, controller.listMembers);
router.post('/:groupId/members', addMembersValidators, controller.addMembers);
router.delete('/:groupId/members/:userId', memberParamValidators, controller.removeMember);
router.put('/:groupId/members/:userId/role', changeRoleValidators, controller.changeMemberRole);
router.post('/:groupId/leave', groupIdValidators, controller.leaveGroup);


router.get('/:groupId/messages', listMessagesValidators, controller.listMessages);
router.post('/:groupId/messages', sendMessageValidators, controller.sendMessage);

router.post(
  '/:groupId/messages/attachment',
  groupIdValidators,
  handleGroupAttachmentUpload,
  attachmentValidators,
  controller.sendAttachmentMessage
);
router.get(
  '/:groupId/messages/:messageId/attachment',
  messageParamValidators,
  controller.downloadAttachment
);
router.post('/:groupId/read', groupIdValidators, controller.markGroupRead);

module.exports = router;
