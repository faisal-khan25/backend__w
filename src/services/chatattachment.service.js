const fs = require('fs');
const { ChatMessage, ChatMessageAttachment, ChatConversationMember, ChatConversation } = require('../models');
const ApiError = require('../utils/ApiError');
const chatService = require('./chat.service');
const { emitToUsers } = require('../realtime/emit');

function inferMessageType(mimeType) {
  if (mimeType.startsWith('image/')) return 'IMAGE';
  if (mimeType.startsWith('video/')) return 'VIDEO';
  if (mimeType.startsWith('audio/')) return 'AUDIO';
  return 'FILE';
}

async function sendAttachmentMessage(user, conversationId, file, { caption } = {}) {
  if (!file) throw ApiError.fileRequired();
  await chatService.requireMembership(conversationId, user.id);

  const message = await ChatMessage.create({
    conversationId,
    senderId: user.id,
    messageType: inferMessageType(file.mimetype),
    content: caption || null,
  });

  await ChatMessageAttachment.create({
    messageId: message.id,
    originalName: file.originalname,
    storedName: file.filename,
    mimeType: file.mimetype,
    size: file.size,
    storagePath: file.path,
  });

  const preview = `[${inferMessageType(file.mimetype).toLowerCase()}] ${file.originalname}`;
  await ChatConversation.update(
    { lastMessageAt: message.createdAt, lastMessagePreview: preview },
    { where: { id: conversationId } }
  );

  const full = await ChatMessage.findByPk(message.id, { include: chatService.MESSAGE_INCLUDE });
  const response = await chatService.toMessageResponse(full, user.id);

  const memberIds = await chatService.activeMemberIds(conversationId);
  emitToUsers(memberIds, 'message:new', response);

  return response;
}

async function getDownloadInfo(user, attachmentId) {
  const attachment = await ChatMessageAttachment.findByPk(attachmentId, {
    include: [{ model: ChatMessage, as: 'message' }],
  });
  if (!attachment) throw ApiError.attachmentNotFound();

  await ChatConversationMember.findOne({
    where: { conversationId: attachment.message.conversationId, userId: user.id, leftAt: null },
  }).then((member) => {
    if (!member) throw ApiError.notConversationMember();
  });

  if (!fs.existsSync(attachment.storagePath)) throw ApiError.attachmentNotFound();

  return { path: attachment.storagePath, fileName: attachment.originalName, mimeType: attachment.mimeType };
}

module.exports = { sendAttachmentMessage, getDownloadInfo };