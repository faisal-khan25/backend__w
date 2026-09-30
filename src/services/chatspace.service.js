const { Op } = require('sequelize');
const {
  ChatSpace,
  ChatSpaceMember,
  ChatConversation,
  ChatConversationMember,
  User,
} = require('../models');
const ApiError = require('../utils/ApiError');
const { broadcastToUser } = require('../realtime/socket');

function userBrief(u) {
  if (!u) return null;
  return { id: u.id, name: u.getFullName(), email: u.email, department: u.department, role: u.role };
}

async function toSpaceResponse(space) {
  const members = await ChatSpaceMember.findAll({ where: { spaceId: space.id }, include: [{ model: User, as: 'user' }] });
  return {
    id: space.id,
    name: space.name,
    description: space.description,
    avatar: space.avatar,
    conversationId: space.conversationId,
    isArchived: space.isArchived,
    members: members.map((m) => ({ ...userBrief(m.user), role: m.role })),
    createdAt: space.createdAt,
  };
}

async function assertSpaceMember(spaceId, userId) {
  const member = await ChatSpaceMember.findOne({ where: { spaceId, userId } });
  if (!member) throw ApiError.notSpaceMember();
  return member;
}

async function listMySpaces(user) {
  const memberships = await ChatSpaceMember.findAll({ where: { userId: user.id } });
  const spaceIds = memberships.map((m) => m.spaceId);
  if (spaceIds.length === 0) return [];
  const spaces = await ChatSpace.findAll({ where: { id: { [Op.in]: spaceIds }, isArchived: false } });
  return Promise.all(spaces.map(toSpaceResponse));
}

async function createSpace(user, { name, description, memberIds = [] }) {
  if (!name) throw ApiError.groupNameRequired();
  const uniqueIds = [...new Set([...memberIds, user.id])];
  const activeUsers = await User.findAll({ where: { id: { [Op.in]: uniqueIds }, isActive: true } });
  if (activeUsers.length !== uniqueIds.length) throw ApiError.chatUserNotFound();

  const conversation = await ChatConversation.create({ type: 'SPACE', name, createdBy: user.id });
  const space = await ChatSpace.create({
    name,
    description: description || null,
    conversationId: conversation.id,
    createdBy: user.id,
  });
  await ChatConversation.update({ spaceId: space.id }, { where: { id: conversation.id } });

  await ChatSpaceMember.bulkCreate(
    uniqueIds.map((id) => ({ spaceId: space.id, userId: id, role: id === user.id ? 'MANAGER' : 'MEMBER' }))
  );
  await ChatConversationMember.bulkCreate(
    uniqueIds.map((id) => ({ conversationId: conversation.id, userId: id, role: id === user.id ? 'OWNER' : 'MEMBER' }))
  );

  uniqueIds.filter((id) => id !== user.id).forEach((id) => broadcastToUser(id, 'space:created', { spaceId: space.id }));

  return toSpaceResponse(space);
}

async function getSpace(user, spaceId) {
  await assertSpaceMember(spaceId, user.id);
  const space = await ChatSpace.findByPk(spaceId);
  if (!space) throw ApiError.spaceNotFound();
  return toSpaceResponse(space);
}

async function updateSpace(user, spaceId, { name, description, avatar }) {
  const member = await assertSpaceMember(spaceId, user.id);
  if (member.role !== 'MANAGER') throw ApiError.notGroupOrSpaceAdmin();
  const space = await ChatSpace.findByPk(spaceId);
  if (!space) throw ApiError.spaceNotFound();
  if (name) space.name = name;
  if (description !== undefined) space.description = description;
  if (avatar !== undefined) space.avatar = avatar;
  await space.save();
  return toSpaceResponse(space);
}

async function addSpaceMembers(user, spaceId, memberIds = []) {
  const member = await assertSpaceMember(spaceId, user.id);
  if (member.role !== 'MANAGER') throw ApiError.notGroupOrSpaceAdmin();

  const space = await ChatSpace.findByPk(spaceId);
  if (!space) throw ApiError.spaceNotFound();

  const existing = await ChatSpaceMember.findAll({ where: { spaceId } });
  const existingIds = new Set(existing.map((m) => m.userId));
  const toAdd = memberIds.filter((id) => !existingIds.has(id));
  if (toAdd.length === 0) return toSpaceResponse(space);

  const users = await User.findAll({ where: { id: { [Op.in]: toAdd }, isActive: true } });
  if (users.length !== toAdd.length) throw ApiError.chatUserNotFound();

  await ChatSpaceMember.bulkCreate(toAdd.map((id) => ({ spaceId, userId: id, role: 'MEMBER' })));
  await ChatConversationMember.bulkCreate(
    toAdd.map((id) => ({ conversationId: space.conversationId, userId: id, role: 'MEMBER' }))
  );
  toAdd.forEach((id) => broadcastToUser(id, 'space:created', { spaceId }));

  return toSpaceResponse(space);
}

async function removeSpaceMember(user, spaceId, targetUserId) {
  const member = await assertSpaceMember(spaceId, user.id);
  const isSelfLeave = targetUserId === user.id;
  if (!isSelfLeave && member.role !== 'MANAGER') throw ApiError.notGroupOrSpaceAdmin();

  const target = await ChatSpaceMember.findOne({ where: { spaceId, userId: targetUserId } });
  if (!target) throw ApiError.chatUserNotFound();

  if (target.role === 'MANAGER') {
    const otherManagers = await ChatSpaceMember.count({
      where: { spaceId, role: 'MANAGER', userId: { [Op.ne]: targetUserId } },
    });
    if (otherManagers === 0) throw ApiError.cannotRemoveLastAdmin();
  }

  await target.destroy();
  const space = await ChatSpace.findByPk(spaceId);
  await ChatConversationMember.update(
    { leftAt: new Date() },
    { where: { conversationId: space.conversationId, userId: targetUserId } }
  );
  return { success: true };
}

async function archiveSpace(user, spaceId) {
  const member = await assertSpaceMember(spaceId, user.id);
  if (member.role !== 'MANAGER') throw ApiError.notGroupOrSpaceAdmin();
  await ChatSpace.update({ isArchived: true }, { where: { id: spaceId } });
  return { success: true };
}

module.exports = {
  listMySpaces,
  createSpace,
  getSpace,
  updateSpace,
  addSpaceMembers,
  removeSpaceMember,
  archiveSpace,
};