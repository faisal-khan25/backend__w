const { Op } = require('sequelize');
const {
  ChatConversation,
  ChatConversationMember,
  ChatMessage,
  ChatMessageAttachment,
  ChatMessageReaction,
  ChatMessageRead,
  ChatMessageStar,
  ChatPinnedMessage,
  ChatMeeting,
  User,
} = require('../models');
const ApiError = require('../utils/ApiError');
const notificationService = require('./notification.service');
const statusService = require('./employeeStatus.service');
const { searchEmployees } = require('./search.service');
const { emitToUsers } = require('../realtime/emit');

const USER_BRIEF_ATTRS = ['id', 'firstName', 'lastName', 'email', 'profileImage', 'department', 'role'];

function escapeLike(q) {
  return String(q).replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

function userBrief(u) {
  if (!u) return null;
  return { id: u.id, name: u.getFullName(), email: u.email, department: u.department, role: u.role, profileImage: u.profileImage };
}

const MESSAGE_INCLUDE = [
  { model: User, as: 'sender', attributes: USER_BRIEF_ATTRS },
  { model: ChatMessageAttachment, as: 'attachments' },
  { model: ChatMessageReaction, as: 'reactions' },
  { model: ChatMessage, as: 'replyToMessage', attributes: ['id', 'content', 'senderId', 'messageType'] },
];

async function toMessageResponse(message, viewerId) {
  const reactionSummary = {};
  (message.reactions || []).forEach((r) => {
    if (!reactionSummary[r.emoji]) reactionSummary[r.emoji] = { emoji: r.emoji, count: 0, reactedByMe: false, userIds: [] };
    reactionSummary[r.emoji].count += 1;
    reactionSummary[r.emoji].userIds.push(r.userId);
    if (r.userId === viewerId) reactionSummary[r.emoji].reactedByMe = true;
  });

  const [starred, readCount] = await Promise.all([
    ChatMessageStar.findOne({ where: { messageId: message.id, userId: viewerId } }),
    ChatMessageRead.count({ where: { messageId: message.id } }),
  ]);

  return {
    id: message.id,
    conversationId: message.conversationId,
    sender: userBrief(message.sender),
    isMine: message.senderId === viewerId,
    messageType: message.messageType,
    content: message.isDeleted ? null : message.content,
    replyToMessage: message.replyToMessage
      ? { id: message.replyToMessage.id, content: message.replyToMessage.content, senderId: message.replyToMessage.senderId, messageType: message.replyToMessage.messageType }
      : null,
    meetingId: message.meetingId,
    mentionedUserIds: message.mentionedUserIds || [],
    attachments: (message.attachments || []).map((a) => ({
      id: a.id,
      fileName: a.originalName,
      mimeType: a.mimeType,
      size: a.size,
      width: a.width,
      height: a.height,
    })),
    reactions: Object.values(reactionSummary),
    isStarred: Boolean(starred),
    isEdited: message.isEdited,
    isDeleted: message.isDeleted,
    readCount,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
  };
}

async function requireMembership(conversationId, userId) {
  const member = await ChatConversationMember.findOne({ where: { conversationId, userId, leftAt: null } });
  if (!member) throw ApiError.notConversationMember();
  return member;
}

async function activeMemberIds(conversationId) {
  const members = await ChatConversationMember.findAll({ where: { conversationId, leftAt: null }, attributes: ['userId'] });
  return members.map((m) => m.userId);
}

async function toConversationResponse(conversation, viewerId) {
  const [members, myMembership, unreadCount] = await Promise.all([
    ChatConversationMember.findAll({ where: { conversationId: conversation.id, leftAt: null }, include: [{ model: User, as: 'user', attributes: USER_BRIEF_ATTRS }] }),
    ChatConversationMember.findOne({ where: { conversationId: conversation.id, userId: viewerId } }),
    countUnread(conversation.id, viewerId),
  ]);

  const statusByUser = await statusService.getActiveStatuses(members.map((m) => m.userId));

  const otherMember = conversation.type === 'DIRECT' ? members.find((m) => m.userId !== viewerId) : null;

  return {
    id: conversation.id,
    type: conversation.type,
    name: conversation.type === 'DIRECT' ? otherMember?.user?.getFullName() : conversation.name,
    avatar: conversation.type === 'DIRECT' ? otherMember?.user?.profileImage : conversation.avatar,
    status: conversation.type === 'DIRECT' ? statusByUser[otherMember?.userId] || null : null,
    spaceId: conversation.spaceId,
    members: members.map((m) => ({ ...userBrief(m.user), role: m.role, status: statusByUser[m.userId] || null })),
    lastMessageAt: conversation.lastMessageAt,
    lastMessagePreview: conversation.lastMessagePreview,
    isMuted: Boolean(myMembership?.isMuted),
    isPinned: Boolean(myMembership?.isPinned),
    isArchived: Boolean(myMembership?.isArchived),
    unreadCount,
    createdAt: conversation.createdAt,
  };
}

async function countUnread(conversationId, userId) {
  const membership = await ChatConversationMember.findOne({ where: { conversationId, userId } });
  if (!membership) return 0;
  const where = { conversationId, isDeleted: false };
  if (membership.lastReadAt) where.createdAt = { [Op.gt]: membership.lastReadAt };
  return ChatMessage.count({ where });
}

async function listConversations(user, { type, search } = {}) {
  const memberships = await ChatConversationMember.findAll({ where: { userId: user.id, leftAt: null } });
  const conversationIds = memberships.map((m) => m.conversationId);
  if (!conversationIds.length) return [];

  const where = { id: { [Op.in]: conversationIds }, isMeetingOnly: false };
  if (type) where.type = type;
  if (search) where.name = { [Op.like]: `%${search}%` };

  const conversations = await ChatConversation.findAll({ where, order: [['lastMessageAt', 'DESC']] });
  return Promise.all(conversations.map((c) => toConversationResponse(c, user.id)));
}

async function getConversation(user, conversationId) {
  await requireMembership(conversationId, user.id);
  const conversation = await ChatConversation.findByPk(conversationId);
  if (!conversation) throw ApiError.conversationNotFound();
  return toConversationResponse(conversation, user.id);
}

async function createDirectConversation(user, otherUserId) {
  if (!otherUserId || otherUserId === user.id) throw ApiError.chatUserNotFound();
  const otherUser = await User.findOne({ where: { id: otherUserId, isActive: true } });
  if (!otherUser) throw ApiError.chatUserNotFound();

  const directKey = ChatConversation.buildDirectKey(user.id, otherUserId);
  let conversation = await ChatConversation.findOne({ where: { directKey } });

  if (!conversation) {
    conversation = await ChatConversation.create({ type: 'DIRECT', directKey, createdBy: user.id });
    await ChatConversationMember.bulkCreate([
      { conversationId: conversation.id, userId: user.id, role: 'OWNER' },
      { conversationId: conversation.id, userId: otherUserId, role: 'OWNER' },
    ]);
  }

  return toConversationResponse(conversation, user.id);
}

async function createGroupConversation(user, { name, memberIds = [] }) {
  if (!name) throw ApiError.groupNameRequired();
  const uniqueIds = [...new Set([...memberIds, user.id])];
  const activeUsers = await User.findAll({ where: { id: { [Op.in]: uniqueIds }, isActive: true } });
  if (activeUsers.length !== uniqueIds.length) throw ApiError.chatUserNotFound();

  const conversation = await ChatConversation.create({ type: 'GROUP', name, createdBy: user.id });
  await ChatConversationMember.bulkCreate(
    uniqueIds.map((id) => ({ conversationId: conversation.id, userId: id, role: id === user.id ? 'OWNER' : 'MEMBER' }))
  );

  emitToUsers(uniqueIds.filter((id) => id !== user.id), 'conversation:created', { conversationId: conversation.id });
  await notificationService.notifyUsers(uniqueIds.filter((id) => id !== user.id), {
    type: 'CHAT',
    title: `${user.getFullName()} added you to "${name}"`,
    message: name,
    referenceId: conversation.id,
    referenceType: 'CONVERSATION',
  });

  return toConversationResponse(conversation, user.id);
}

async function updateConversation(user, conversationId, { name, avatar, isMuted, isPinned, isArchived }) {
  const membership = await requireMembership(conversationId, user.id);
  const conversation = await ChatConversation.findByPk(conversationId);
  if (!conversation) throw ApiError.conversationNotFound();

  if ((name !== undefined || avatar !== undefined) && conversation.type === 'GROUP') {
    if (name !== undefined) conversation.name = name;
    if (avatar !== undefined) conversation.avatar = avatar;
    await conversation.save();
  }

  if (isMuted !== undefined) membership.isMuted = isMuted;
  if (isPinned !== undefined) membership.isPinned = isPinned;
  if (isArchived !== undefined) membership.isArchived = isArchived;
  await membership.save();

  return toConversationResponse(conversation, user.id);
}

async function leaveConversation(user, conversationId) {
  const membership = await requireMembership(conversationId, user.id);
  membership.leftAt = new Date();
  await membership.save();
  return { success: true };
}

async function listMessages(user, conversationId, { before, limit = 30 } = {}) {
  await requireMembership(conversationId, user.id);

  const where = { conversationId };
  if (before) where.createdAt = { [Op.lt]: new Date(before) };

  const messages = await ChatMessage.findAll({
    where,
    include: MESSAGE_INCLUDE,
    order: [['createdAt', 'DESC']],
    limit: Number(limit),
  });

  const shaped = await Promise.all(messages.map((m) => toMessageResponse(m, user.id)));
  return { messages: shaped.reverse(), hasMore: messages.length === Number(limit) };
}

async function sendMessage(user, conversationId, { content, replyToMessageId, mentionedUserIds = [] } = {}) {
  await requireMembership(conversationId, user.id);
  if (!content || !content.trim()) throw new ApiError(400, 'Message content is required');

  const message = await ChatMessage.create({
    conversationId,
    senderId: user.id,
    messageType: 'TEXT',
    content,
    replyToMessageId: replyToMessageId || null,
    mentionedUserIds,
  });

  await ChatConversation.update(
    { lastMessageAt: message.createdAt, lastMessagePreview: content.slice(0, 200) },
    { where: { id: conversationId } }
  );

  const full = await ChatMessage.findByPk(message.id, { include: MESSAGE_INCLUDE });
  const response = await toMessageResponse(full, user.id);

  const memberIds = await activeMemberIds(conversationId);
  emitToUsers(memberIds, 'message:new', response);

  const recipients = memberIds.filter((id) => id !== user.id);
  if (recipients.length) {
    await notificationService.notifyUsers(recipients, {
      type: 'CHAT',
      title: user.getFullName(),
      message: content.slice(0, 140),
      referenceId: conversationId,
      referenceType: 'CONVERSATION',
    });
  }

  return response;
}

async function editMessage(user, messageId, content) {
  const message = await ChatMessage.findByPk(messageId);
  if (!message || message.isDeleted) throw ApiError.messageNotFound();
  if (message.senderId !== user.id) throw ApiError.messageNotEditable();

  message.content = content;
  message.isEdited = true;
  await message.save();

  const full = await ChatMessage.findByPk(messageId, { include: MESSAGE_INCLUDE });
  const response = await toMessageResponse(full, user.id);
  const memberIds = await activeMemberIds(message.conversationId);
  emitToUsers(memberIds, 'message:updated', response);
  return response;
}

async function deleteMessage(user, messageId) {
  const message = await ChatMessage.findByPk(messageId);
  if (!message || message.isDeleted) throw ApiError.messageNotFound();
  if (message.senderId !== user.id) throw ApiError.messageNotDeletable();

  message.isDeleted = true;
  message.deletedAt = new Date();
  message.content = null;
  await message.save();

  const memberIds = await activeMemberIds(message.conversationId);
  emitToUsers(memberIds, 'message:deleted', { id: message.id, conversationId: message.conversationId });
  return { success: true };
}

async function markConversationRead(user, conversationId, messageId) {
  const membership = await requireMembership(conversationId, user.id);

  let target = null;
  if (messageId) {
    target = await ChatMessage.findOne({ where: { id: messageId, conversationId } });
  } else {
    target = await ChatMessage.findOne({ where: { conversationId }, order: [['createdAt', 'DESC']] });
  }

  if (target) {
    membership.lastReadMessageId = target.id;
    membership.lastReadAt = target.createdAt;
    await membership.save();
    await ChatMessageRead.findOrCreate({ where: { messageId: target.id, userId: user.id }, defaults: { readAt: new Date() } });

    const memberIds = await activeMemberIds(conversationId);
    emitToUsers(
      memberIds.filter((id) => id !== user.id),
      'message:read',
      { conversationId, userId: user.id, messageId: target.id }
    );
  }

  return { success: true };
}

async function addReaction(user, messageId, emoji) {
  const message = await ChatMessage.findByPk(messageId);
  if (!message) throw ApiError.messageNotFound();
  await requireMembership(message.conversationId, user.id);

  const [reaction, created] = await ChatMessageReaction.findOrCreate({ where: { messageId, userId: user.id, emoji }, defaults: { messageId, userId: user.id, emoji } });
  if (!created) throw ApiError.duplicateReaction();

  const memberIds = await activeMemberIds(message.conversationId);
  emitToUsers(memberIds, 'message:reaction', { messageId, userId: user.id, emoji, action: 'add' });
  return { id: reaction.id, emoji, userId: user.id };
}

async function removeReaction(user, messageId, reactionId) {
  const reaction = await ChatMessageReaction.findByPk(reactionId);
  if (!reaction || reaction.messageId !== messageId) throw ApiError.reactionNotFound();
  if (reaction.userId !== user.id) throw ApiError.reactionNotFound();

  const message = await ChatMessage.findByPk(messageId);
  await reaction.destroy();

  if (message) {
    const memberIds = await activeMemberIds(message.conversationId);
    emitToUsers(memberIds, 'message:reaction', { messageId, userId: user.id, emoji: reaction.emoji, action: 'remove' });
  }
  return { success: true };
}

async function starMessage(user, messageId) {
  const message = await ChatMessage.findByPk(messageId);
  if (!message) throw ApiError.messageNotFound();
  await requireMembership(message.conversationId, user.id);

  await ChatMessageStar.findOrCreate({ where: { messageId, userId: user.id }, defaults: { messageId, userId: user.id } });
  return { success: true };
}

async function unstarMessage(user, messageId) {
  await ChatMessageStar.destroy({ where: { messageId, userId: user.id } });
  return { success: true };
}

async function listStarredMessages(user) {
  const stars = await ChatMessageStar.findAll({
    where: { userId: user.id },
    include: [{ model: ChatMessage, as: 'message', include: MESSAGE_INCLUDE }],
    order: [['createdAt', 'DESC']],
  });
  return Promise.all(stars.filter((s) => s.message).map((s) => toMessageResponse(s.message, user.id)));
}

async function pinMessage(user, conversationId, messageId) {
  await requireMembership(conversationId, user.id);
  const message = await ChatMessage.findOne({ where: { id: messageId, conversationId } });
  if (!message) throw ApiError.messageNotFound();

  await ChatPinnedMessage.findOrCreate({
    where: { conversationId, messageId },
    defaults: { conversationId, messageId, pinnedBy: user.id },
  });

  const memberIds = await activeMemberIds(conversationId);
  emitToUsers(memberIds, 'message:pinned', { conversationId, messageId });
  return { success: true };
}

async function unpinMessage(user, conversationId, messageId) {
  await requireMembership(conversationId, user.id);
  await ChatPinnedMessage.destroy({ where: { conversationId, messageId } });
  const memberIds = await activeMemberIds(conversationId);
  emitToUsers(memberIds, 'message:unpinned', { conversationId, messageId });
  return { success: true };
}

async function listPinnedMessages(user, conversationId) {
  await requireMembership(conversationId, user.id);
  const pins = await ChatPinnedMessage.findAll({
    where: { conversationId },
    include: [{ model: ChatMessage, as: 'message', include: MESSAGE_INCLUDE }],
    order: [['pinnedAt', 'DESC']],
  });
  return Promise.all(pins.filter((p) => p.message).map((p) => toMessageResponse(p.message, user.id)));
}

async function searchMessages(user, query) {
  const q = (query || '').trim();
  if (!q) return [];
  const conversationIds = await ChatConversationMember.findAll({ where: { userId: user.id, leftAt: null }, attributes: ['conversationId'] }).then((rows) => rows.map((r) => r.conversationId));
  if (!conversationIds.length) return [];

  const like = `%${escapeLike(q)}%`;
  const messages = await ChatMessage.findAll({
    where: { conversationId: { [Op.in]: conversationIds }, isDeleted: false, content: { [Op.like]: like } },
    include: [...MESSAGE_INCLUDE, { model: ChatConversation, as: 'conversation', attributes: ['id', 'name', 'type', 'avatar'] }],
    order: [['createdAt', 'DESC']],
    limit: 50,
  });

  return Promise.all(
    messages.map(async (m) => {
      const base = await toMessageResponse(m, user.id);
      let conversationName = m.conversation?.name || null;
      let conversationAvatar = m.conversation?.avatar || null;
      if (m.conversation?.type === 'DIRECT') {
        const otherMember = await ChatConversationMember.findOne({
          where: { conversationId: m.conversationId, userId: { [Op.ne]: user.id }, leftAt: null },
          include: [{ model: User, as: 'user', attributes: USER_BRIEF_ATTRS }],
        });
        conversationName = otherMember?.user?.getFullName() || conversationName;
        conversationAvatar = otherMember?.user?.profileImage || conversationAvatar;
      }
      return {
        ...base,
        conversationType: m.conversation?.type || null,
        conversationName,
        conversationAvatar,
      };
    })
  );
}

async function searchChatContacts(user, query) {
  const q = (query || '').trim();
  if (!q) return { conversations: [], employees: [] };

  const like = `%${escapeLike(q)}%`;
  const memberships = await ChatConversationMember.findAll({ where: { userId: user.id, leftAt: null }, attributes: ['conversationId'] });
  const conversationIds = memberships.map((m) => m.conversationId);

  let conversations = [];
  if (conversationIds.length) {
    const [byName, byMember] = await Promise.all([
      ChatConversation.findAll({
        where: { id: { [Op.in]: conversationIds }, isMeetingOnly: false, name: { [Op.like]: like } },
      }),
      ChatConversation.findAll({
        where: { id: { [Op.in]: conversationIds }, isMeetingOnly: false, type: 'DIRECT' },
        include: [
          {
            model: ChatConversationMember,
            as: 'members',
            required: true,
            where: { userId: { [Op.ne]: user.id }, leftAt: null },
            include: [
              {
                model: User,
                as: 'user',
                required: true,
                where: { [Op.or]: [{ firstName: { [Op.like]: like } }, { lastName: { [Op.like]: like } }, { email: { [Op.like]: like } }] },
              },
            ],
          },
        ],
        subQuery: false,
      }),
    ]);

    const seen = new Map();
    [...byName, ...byMember].forEach((c) => {
      if (!seen.has(c.id)) seen.set(c.id, c);
    });
    const merged = [...seen.values()].sort(
      (a, b) => new Date(b.lastMessageAt || b.createdAt) - new Date(a.lastMessageAt || a.createdAt)
    );
    conversations = await Promise.all(merged.slice(0, 20).map((c) => toConversationResponse(c, user.id)));
  }

  const existingPeerIds = new Set(
    conversations.filter((c) => c.type === 'DIRECT').flatMap((c) => c.members.filter((m) => m.id !== user.id).map((m) => m.id))
  );

  const { items: employeeResults } = await searchEmployees(user, q, { limit: 20, offset: 0 });
  const employeeIds = employeeResults.map((e) => e.user.id).filter((id) => !existingPeerIds.has(id));
  const employeeStatuses = await statusService.getActiveStatuses(employeeIds);

  const employees = employeeResults
    .filter((e) => !existingPeerIds.has(e.user.id) && e.user.id !== user.id)
    .map((e) => ({ ...e.user, status: employeeStatuses[e.user.id] || null }));

  return { conversations, employees };
}

module.exports = {
  MESSAGE_INCLUDE,
  toMessageResponse,
  requireMembership,
  activeMemberIds,
  listConversations,
  getConversation,
  createDirectConversation,
  createGroupConversation,
  updateConversation,
  leaveConversation,
  listMessages,
  sendMessage,
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
  searchChatContacts,
};