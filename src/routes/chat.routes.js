const express = require('express');
const controller = require('../controllers/chat.controller');
const { requireAuth } = require('../middleware/requireAuth');
const { handleChatAttachmentUpload } = require('../middleware/chatupload');

const router = express.Router();

router.use(requireAuth);

router.get('/conversations', controller.listConversations);
router.get('/conversations/starred-messages', controller.listStarredMessages);
router.get('/conversations/search', controller.searchMessages);
router.get('/search', controller.searchContacts);
router.post('/conversations/direct', controller.createDirectConversation);
router.post('/conversations/group', controller.createGroupConversation);
router.get('/conversations/:id', controller.getConversation);
router.put('/conversations/:id', controller.updateConversation);
router.delete('/conversations/:id', controller.leaveConversation);

router.get('/conversations/:conversationId/messages', controller.listMessages);
router.post('/conversations/:conversationId/messages', controller.sendMessage);
router.post('/conversations/:conversationId/messages/attachment', handleChatAttachmentUpload, controller.sendAttachmentMessage);
router.post('/conversations/:conversationId/read', controller.markConversationRead);
router.get('/conversations/:conversationId/pinned', controller.listPinnedMessages);
router.post('/conversations/:conversationId/pinned/:messageId', controller.pinMessage);
router.delete('/conversations/:conversationId/pinned/:messageId', controller.unpinMessage);

router.put('/messages/:messageId', controller.editMessage);
router.delete('/messages/:messageId', controller.deleteMessage);
router.post('/messages/:messageId/reactions', controller.addReaction);
router.delete('/messages/:messageId/reactions/:reactionId', controller.removeReaction);
router.post('/messages/:messageId/star', controller.starMessage);
router.delete('/messages/:messageId/star', controller.unstarMessage);

router.get('/attachments/:attachmentId/download', controller.downloadAttachment);

module.exports = router;