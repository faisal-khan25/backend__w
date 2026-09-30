const asyncHandler = require('../utils/asyncHandler');
const chatService = require('../services/chat.service');
const chatAttachmentService = require('../services/chatattachment.service');

const listConversations = asyncHandler(async (req, res) => {
  const { type, search } = req.query;
  const result = await chatService.listConversations(req.user, { type, search });
  res.status(200).json({ conversations: result });
});

const getConversation = asyncHandler(async (req, res) => {
  const result = await chatService.getConversation(req.user, req.params.id);
  res.status(200).json(result);
});

const createDirectConversation = asyncHandler(async (req, res) => {
  const result = await chatService.createDirectConversation(req.user, req.body.userId);
  res.status(201).json(result);
});

const createGroupConversation = asyncHandler(async (req, res) => {
  const { name, memberIds } = req.body;
  const result = await chatService.createGroupConversation(req.user, { name, memberIds });
  res.status(201).json(result);
});

const updateConversation = asyncHandler(async (req, res) => {
  const result = await chatService.updateConversation(req.user, req.params.id, req.body);
  res.status(200).json(result);
});

const leaveConversation = asyncHandler(async (req, res) => {
  const result = await chatService.leaveConversation(req.user, req.params.id);
  res.status(200).json(result);
});

const listMessages = asyncHandler(async (req, res) => {
  const { before, limit } = req.query;
  const result = await chatService.listMessages(req.user, req.params.conversationId, { before, limit });
  res.status(200).json(result);
});

const sendMessage = asyncHandler(async (req, res) => {
  const { content, replyToMessageId, mentionedUserIds } = req.body;
  const result = await chatService.sendMessage(req.user, req.params.conversationId, {
    content,
    replyToMessageId,
    mentionedUserIds,
  });
  res.status(201).json(result);
});

const sendAttachmentMessage = asyncHandler(async (req, res) => {
  const result = await chatAttachmentService.sendAttachmentMessage(req.user, req.params.conversationId, req.file, {
    caption: req.body.caption,
  });
  res.status(201).json(result);
});

const downloadAttachment = asyncHandler(async (req, res) => {
  const { path, fileName } = await chatAttachmentService.getDownloadInfo(req.user, req.params.attachmentId);
  res.download(path, fileName);
});

const editMessage = asyncHandler(async (req, res) => {
  const result = await chatService.editMessage(req.user, req.params.messageId, req.body.content);
  res.status(200).json(result);
});

const deleteMessage = asyncHandler(async (req, res) => {
  await chatService.deleteMessage(req.user, req.params.messageId);
  res.status(204).send();
});

const markConversationRead = asyncHandler(async (req, res) => {
  const result = await chatService.markConversationRead(req.user, req.params.conversationId, req.body.messageId);
  res.status(200).json(result);
});

const addReaction = asyncHandler(async (req, res) => {
  const result = await chatService.addReaction(req.user, req.params.messageId, req.body.emoji);
  res.status(201).json(result);
});

const removeReaction = asyncHandler(async (req, res) => {
  await chatService.removeReaction(req.user, req.params.messageId, req.params.reactionId);
  res.status(204).send();
});

const starMessage = asyncHandler(async (req, res) => {
  const result = await chatService.starMessage(req.user, req.params.messageId);
  res.status(200).json(result);
});

const unstarMessage = asyncHandler(async (req, res) => {
  const result = await chatService.unstarMessage(req.user, req.params.messageId);
  res.status(200).json(result);
});

const listStarredMessages = asyncHandler(async (req, res) => {
  const result = await chatService.listStarredMessages(req.user);
  res.status(200).json({ messages: result });
});

const pinMessage = asyncHandler(async (req, res) => {
  const result = await chatService.pinMessage(req.user, req.params.conversationId, req.params.messageId);
  res.status(200).json(result);
});

const unpinMessage = asyncHandler(async (req, res) => {
  const result = await chatService.unpinMessage(req.user, req.params.conversationId, req.params.messageId);
  res.status(200).json(result);
});

const listPinnedMessages = asyncHandler(async (req, res) => {
  const result = await chatService.listPinnedMessages(req.user, req.params.conversationId);
  res.status(200).json({ messages: result });
});

const searchMessages = asyncHandler(async (req, res) => {
  const result = await chatService.searchMessages(req.user, req.query.q);
  res.status(200).json({ messages: result });
});

const searchContacts = asyncHandler(async (req, res) => {
  const result = await chatService.searchChatContacts(req.user, req.query.q);
  res.status(200).json(result);
});

module.exports = {
  listConversations,
  getConversation,
  createDirectConversation,
  createGroupConversation,
  updateConversation,
  leaveConversation,
  listMessages,
  sendMessage,
  sendAttachmentMessage,
  downloadAttachment,
  editMessage,
  deleteMessage,
  markConversationRead,
  addReaction,
  removeReaction,
  starMessage,
  unstarMessage,
  listStarredMessages,
  pinMessage,
  unpinMessage,
  listPinnedMessages,
  searchMessages,
  searchContacts,
};