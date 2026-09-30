const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const {
  sequelize,
  Group,
  GroupMember,
  GroupMessage,
  User,
} = require('../models');
const ApiError = require('../utils/ApiError');
const { getIO } = require('../middleware/io');
const { emitToUsers } = require('../middleware/emit');
const { GROUP_ATTACHMENT_DIR } = require('../middleware/groupupload');


const GROUP_CREATE_ROLES = ['ADMIN', 'MANAGER'];


function canCreateGroups(user) {
  return Boolean(user) && GROUP_CREATE_ROLES.includes(user.role);
}



const USER_BRIEF_ATTRS = [
  'id',
  'firstName',
  'lastName',
  'email',
  'profileImage',
  'department',
  'role',
];


function groupRoom(groupId) {
  return `group_${groupId}`;
}


function userBrief(u) {
  if (!u) return null;
  const last = u.lastName && u.lastName.trim() ? ` ${u.lastName.trim()}` : '';
  return {
    id: u.id,
    name: `${u.firstName}${last}`,
    email: u.email,
    department: u.department,
    role: u.role,
    profileImage: u.profileImage || null,
  };
}



function iconTypeOf(icon) {
  if (!icon) return null;
  const value = String(icon);
  return value.startsWith('/uploads/') || /^https?:\/\//i.test(value) ? 'IMAGE' : 'EMOJI';
}


function sortMembers(members) {
  return [...members].sort((a, b) => {
    const aAdmin = GroupMember.isAdminRole(a.role) ? 0 : 1;
    const bAdmin = GroupMember.isAdminRole(b.role) ? 0 : 1;
    if (aAdmin !== bAdmin) return aAdmin - bAdmin;
    return new Date(a.joinedAt) - new Date(b.joinedAt);
  });
}

function escapeLike(q) {
  return String(q).replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

function assertValidId(id, factory = ApiError.groupInvalidId) {
  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    throw factory();
  }
  return id.trim();
}


async function loadGroup(groupId) {
  const id = assertValidId(groupId);
  const group = await Group.findOne({ where: { id, isDeleted: false } });
  if (!group) throw ApiError.groupNotFound();
  return group;
}


async function requireMembership(groupId, userId) {
  const membership = await GroupMember.findOne({
    where: { groupId, userId, leftAt: null },
  });
  if (!membership) throw ApiError.groupNotMember();
  return membership;
}


async function requireGroupAdmin(groupId, userId) {
  const membership = await requireMembership(groupId, userId);
  if (!GroupMember.isAdminRole(membership.role)) throw ApiError.groupNotAdmin();
  return membership;
}


async function activeMemberIds(groupId) {
  const rows = await GroupMember.findAll({
    where: { groupId, leftAt: null },
    attributes: ['userId'],
  });
  return rows.map((r) => r.userId);
}




function toAttachmentResponse(message) {
  if (!message.attachmentUrl && !message.attachmentName) return null;
  const mimeType = message.attachmentMimeType || null;
  return {
    url: message.attachmentUrl || null,
    name: message.attachmentName || null,
    size: message.attachmentSize || null,
    mimeType,
    isImage: mimeType ? mimeType.startsWith('image/') : message.messageType === 'IMAGE',
    downloadUrl: `/api/v1/groups/${message.groupId}/messages/${message.id}/attachment`,
  };
}

function toMessageResponse(message) {
  return {
    id: message.id,
    groupId: message.groupId,
    senderId: message.senderId,
    sender: message.sender ? userBrief(message.sender) : null,
    message: message.isDeleted ? null : message.message,
    messageType: message.messageType,
    attachmentUrl: message.isDeleted ? null : message.attachmentUrl || null,
    attachmentName: message.isDeleted ? null : message.attachmentName || null,
    attachmentSize: message.isDeleted ? null : message.attachmentSize || null,
    attachmentMimeType: message.isDeleted ? null : message.attachmentMimeType || null,
    
    attachment: message.isDeleted ? null : toAttachmentResponse(message),
    isDeleted: message.isDeleted,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
  };
}


function toMemberResponse(member) {
  const user = member.user ? userBrief(member.user) : null;
  return {
    id: member.id,
    groupId: member.groupId,
    userId: member.userId,
    role: GroupMember.normalizeRole(member.role),
    isGroupAdmin: GroupMember.isAdminRole(member.role),
    status: member.leftAt ? 'LEFT' : 'ACTIVE',
    joinedAt: member.joinedAt,
    leftAt: member.leftAt || null,
    
    appRole: user ? user.role : null,
    user,
  };
}


async function toGroupSummary(group, membership) {
  const [lastMessage, memberCount] = await Promise.all([
    GroupMessage.findOne({
      where: { groupId: group.id },
      include: [{ model: User, as: 'sender', attributes: USER_BRIEF_ATTRS }],
      order: [['createdAt', 'DESC']],
    }),
    GroupMember.count({ where: { groupId: group.id, leftAt: null } }),
  ]);

  
  const unreadWhere = {
    groupId: group.id,
    messageType: { [Op.ne]: 'SYSTEM' },
    senderId: { [Op.ne]: membership.userId },
  };
  if (membership.lastReadAt) {
    unreadWhere.createdAt = { [Op.gt]: membership.lastReadAt };
  }
  const unreadCount = await GroupMessage.count({ where: unreadWhere });

  const isGroupAdmin = GroupMember.isAdminRole(membership.role);

  return {
    id: group.id,
    name: group.name,
    description: group.description,
    icon: group.icon,
    iconType: iconTypeOf(group.icon),
    createdBy: group.createdBy,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
    myRole: GroupMember.normalizeRole(membership.role),
    isGroupAdmin,
    
    permissions: {
      canPost: true,
      canEditGroup: isGroupAdmin,
      canAddMembers: isGroupAdmin,
      canRemoveMembers: isGroupAdmin,
      canManageMembers: isGroupAdmin,
      canDeleteGroup: isGroupAdmin,
      canLeaveGroup: true,
    },
    memberCount,
    unreadCount,
    lastMessage: lastMessage
      ? {
          id: lastMessage.id,
          message: lastMessage.isDeleted
            ? 'This message was deleted'
            : lastMessage.message,
          messageType: lastMessage.messageType,
          senderId: lastMessage.senderId,
          senderName: lastMessage.sender
            ? userBrief(lastMessage.sender).name
            : null,
          createdAt: lastMessage.createdAt,
        }
      : null,
    lastMessageAt: lastMessage ? lastMessage.createdAt : group.createdAt,
  };
}



function emitToGroupRoom(groupId, event, payload) {
  const io = getIO();
  if (!io) return;
  io.to(groupRoom(groupId)).emit(event, payload);
}

async function emitToGroupMembers(groupId, event, payload, { exclude } = {}) {
  const ids = await activeMemberIds(groupId);
  emitToUsers(
    exclude ? ids.filter((id) => id !== exclude) : ids,
    event,
    payload
  );
}



function toSharedGroupDetail(detail) {
  const { myRole, isGroupAdmin, permissions, unreadCount, ...shared } = detail;
  return { ...shared, groupId: detail.id };
}

async function broadcastGroupEvent(groupId, event, payload, { memberIds } = {}) {
  emitToGroupRoom(groupId, event, payload);
  if (memberIds) {
    emitToUsers(memberIds, event, payload);
  } else {
    await emitToGroupMembers(groupId, event, payload);
  }
}

async function postSystemMessage(groupId, text) {
  const created = await GroupMessage.create({
    groupId,
    senderId: null,
    message: text,
    messageType: 'SYSTEM',
  });
  const payload = toMessageResponse(created);
  emitToGroupRoom(groupId, 'receive_message', payload);
  await emitToGroupMembers(groupId, 'group:message', payload);
  return payload;
}




async function createGroup(currentUser, { name, description, icon, memberIds }) {
  
  if (!canCreateGroups(currentUser)) throw ApiError.groupCreateForbidden();

  const trimmedName = (name || '').trim();
  if (!trimmedName) throw ApiError.groupNameRequired();

  
  const requested = [...new Set(Array.isArray(memberIds) ? memberIds : [])]
    .filter((id) => typeof id === 'string' && id.trim())
    .map((id) => id.trim())
    .filter((id) => id !== currentUser.id);

  let validMembers = [];
  if (requested.length) {
    validMembers = await User.findAll({
      where: { id: { [Op.in]: requested }, isActive: true },
      attributes: ['id'],
    });
    if (validMembers.length !== requested.length) {
      throw ApiError.groupUserNotFound();
    }
  }

  const group = await sequelize.transaction(async (transaction) => {
    const createdGroup = await Group.create(
      {
        name: trimmedName,
        description: (description || '').trim() || null,
        icon: icon || null,
        createdBy: currentUser.id,
      },
      { transaction }
    );

    
    const rows = [
      { groupId: createdGroup.id, userId: currentUser.id, role: 'GROUP_ADMIN' },
      ...validMembers.map((u) => ({
        groupId: createdGroup.id,
        userId: u.id,
        role: 'MEMBER',
      })),
    ];
    await GroupMember.bulkCreate(rows, { transaction });

    return createdGroup;
  });

  await postSystemMessage(
    group.id,
    `${currentUser.getFullName()} created the group "${group.name}"`
  );

  
  const detail = await getGroup(currentUser, group.id);
  await emitToGroupMembers(group.id, 'group:created', detail, {
    exclude: currentUser.id,
  });

  return detail;
}


async function listMyGroups(currentUser, { search } = {}) {
  const memberships = await GroupMember.findAll({
    where: { userId: currentUser.id, leftAt: null },
  });
  if (!memberships.length) return [];

  const byGroupId = new Map(memberships.map((m) => [m.groupId, m]));

  const where = {
    id: { [Op.in]: [...byGroupId.keys()] },
    isDeleted: false,
  };

  const q = (search || '').trim();
  if (q) {
    const like = `%${escapeLike(q)}%`;
    where[Op.or] = [{ name: { [Op.like]: like } }, { description: { [Op.like]: like } }];
  }

  const groups = await Group.findAll({ where });

  const summaries = await Promise.all(
    groups.map((g) => toGroupSummary(g, byGroupId.get(g.id)))
  );

  summaries.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
  return summaries;
}

async function getGroup(currentUser, groupId) {
  const group = await loadGroup(groupId);
  const membership = await requireMembership(group.id, currentUser.id);

  const members = await GroupMember.findAll({
    where: { groupId: group.id, leftAt: null },
    include: [{ model: User, as: 'user', attributes: USER_BRIEF_ATTRS }],
  });

  const summary = await toGroupSummary(group, membership);

  return {
    ...summary,
    members: sortMembers(members).map(toMemberResponse),
  };
}

async function updateGroup(currentUser, groupId, { name, description, icon }) {
  const group = await loadGroup(groupId);
  await requireGroupAdmin(group.id, currentUser.id);

  const changes = [];

  if (name !== undefined) {
    const trimmed = (name || '').trim();
    if (!trimmed) throw ApiError.groupNameRequired();
    if (trimmed !== group.name) {
      changes.push(`renamed the group to "${trimmed}"`);
      group.name = trimmed;
    }
  }

  if (description !== undefined) {
    const trimmed = (description || '').trim() || null;
    if (trimmed !== group.description) {
      changes.push('updated the group description');
      group.description = trimmed;
    }
  }

  if (icon !== undefined) {
    const next = (typeof icon === 'string' ? icon.trim() : icon) || null;
    if (next !== group.icon) {
      changes.push('updated the group icon');
      group.icon = next;
    }
  }

  if (changes.length) {
    await group.save();
    await postSystemMessage(
      group.id,
      `${currentUser.getFullName()} ${changes.join(' and ')}`
    );
  }

  const detail = await getGroup(currentUser, group.id);
  await broadcastGroupEvent(group.id, 'group:updated', toSharedGroupDetail(detail));
  return detail;
}

async function deleteGroup(currentUser, groupId) {
  const group = await loadGroup(groupId);
  await requireGroupAdmin(group.id, currentUser.id);

  const memberIds = await activeMemberIds(group.id);

  group.isDeleted = true;
  await group.save();

  const payload = {
    groupId: group.id,
    name: group.name,
    deletedBy: currentUser.id,
    deletedByName: currentUser.getFullName(),
  };
  await broadcastGroupEvent(group.id, 'group:deleted', payload, { memberIds });

  return { groupId: group.id, deleted: true };
}


async function listMembers(currentUser, groupId, { includeInactive = false } = {}) {
  const group = await loadGroup(groupId);
  const membership = await requireMembership(group.id, currentUser.id);

  const wantsHistory = includeInactive && GroupMember.isAdminRole(membership.role);

  const members = await GroupMember.findAll({
    where: wantsHistory ? { groupId: group.id } : { groupId: group.id, leftAt: null },
    include: [{ model: User, as: 'user', attributes: USER_BRIEF_ATTRS }],
  });

  const active = members.filter((m) => !m.leftAt);
  const inactive = members.filter((m) => m.leftAt);

  return [
    ...sortMembers(active).map(toMemberResponse),
    ...inactive
      .sort((a, b) => new Date(b.leftAt) - new Date(a.leftAt))
      .map(toMemberResponse),
  ];
}


async function addMembers(currentUser, groupId, memberIds) {
  const group = await loadGroup(groupId);
  await requireGroupAdmin(group.id, currentUser.id);

  const requested = [...new Set(Array.isArray(memberIds) ? memberIds : [])]
    .filter((id) => typeof id === 'string' && id.trim())
    .map((id) => id.trim());

  if (!requested.length) throw ApiError.groupUserNotFound();

  const users = await User.findAll({
    where: { id: { [Op.in]: requested }, isActive: true },
  });
  if (users.length !== requested.length) throw ApiError.groupUserNotFound();

  const existing = await GroupMember.findAll({
    where: { groupId: group.id, userId: { [Op.in]: requested } },
  });
  const existingByUserId = new Map(existing.map((m) => [m.userId, m]));

  
  for (const user of users) {
    const row = existingByUserId.get(user.id);
    if (row && row.leftAt === null) {
      throw ApiError.groupDuplicateMember(user.getFullName());
    }
  }

  await sequelize.transaction(async (transaction) => {
    for (const user of users) {
      const row = existingByUserId.get(user.id);
      if (row) {
        row.leftAt = null;
        row.role = 'MEMBER';
        row.joinedAt = new Date();
        row.lastReadAt = null;
        await row.save({ transaction });
      } else {
        await GroupMember.create(
          { groupId: group.id, userId: user.id, role: 'MEMBER' },
          { transaction }
        );
      }
    }
  });

  const names = users.map((u) => u.getFullName()).join(', ');
  await postSystemMessage(
    group.id,
    `${currentUser.getFullName()} added ${names} to the group`
  );

  const members = await listMembers(currentUser, group.id);
  const summaryPayload = { groupId: group.id, members };

  await broadcastGroupEvent(group.id, 'group:members_updated', summaryPayload);
  await broadcastGroupEvent(group.id, 'group:member-added', {
    groupId: group.id,
    addedBy: currentUser.id,
    addedByName: currentUser.getFullName(),
    members: members.filter((m) => users.some((u) => u.id === m.userId)),
    roster: members,
  });

  
  for (const user of users) {
    const membership = await GroupMember.findOne({
      where: { groupId: group.id, userId: user.id, leftAt: null },
    });
    const detail = { ...(await toGroupSummary(group, membership)), members };
    emitToUsers([user.id], 'group:created', detail);
  }

  return members;
}


async function removeMember(currentUser, groupId, targetUserId) {
  const group = await loadGroup(groupId);
  await requireGroupAdmin(group.id, currentUser.id);

  const userId = assertValidId(targetUserId, ApiError.groupMemberNotFound);

  if (userId === currentUser.id) throw ApiError.groupCannotRemoveSelf();

  const membership = await GroupMember.findOne({
    where: { groupId: group.id, userId, leftAt: null },
  });
  if (!membership) throw ApiError.groupMemberNotFound();

  const removedUser = await User.findByPk(userId);

  membership.leftAt = new Date();
  await membership.save();

  await postSystemMessage(
    group.id,
    `${currentUser.getFullName()} removed ${
      removedUser ? removedUser.getFullName() : 'a member'
    } from the group`
  );

  const members = await listMembers(currentUser, group.id);
  const payload = { groupId: group.id, members };
  await broadcastGroupEvent(group.id, 'group:members_updated', payload);

  const removedPayload = {
    groupId: group.id,
    userId,
    userName: removedUser ? removedUser.getFullName() : null,
    removedBy: currentUser.id,
    removedByName: currentUser.getFullName(),
    roster: members,
  };
  await broadcastGroupEvent(group.id, 'group:member-removed', removedPayload);
  emitToUsers([userId], 'group:member-removed', removedPayload);

  emitToUsers([userId], 'group:removed', {
    groupId: group.id,
    removedBy: currentUser.id,
  });

  
  const io = getIO();
  if (io) io.in(`user:${userId}`).socketsLeave(groupRoom(group.id));

  return members;
}


async function changeMemberRole(currentUser, groupId, targetUserId, role) {
  const group = await loadGroup(groupId);
  await requireGroupAdmin(group.id, currentUser.id);

  const nextRole = GroupMember.normalizeRole(role);
  if (!GroupMember.ROLES.includes(nextRole)) {
    throw new ApiError(400, `Role must be one of: ${GroupMember.ROLES.join(', ')}`);
  }

  const userId = assertValidId(targetUserId, ApiError.groupMemberNotFound);
  const membership = await GroupMember.findOne({
    where: { groupId: group.id, userId, leftAt: null },
  });
  if (!membership) throw ApiError.groupMemberNotFound();

  
  if (GroupMember.isAdminRole(membership.role) && nextRole === 'MEMBER') {
    const adminCount = await GroupMember.count({
      where: {
        groupId: group.id,
        role: { [Op.in]: GroupMember.ADMIN_ROLE_VALUES },
        leftAt: null,
      },
    });
    if (adminCount <= 1) throw ApiError.groupLastAdmin();
  }

  if (GroupMember.normalizeRole(membership.role) !== nextRole) {
    membership.role = nextRole;
    await membership.save();

    const targetUser = await User.findByPk(userId);
    await postSystemMessage(
      group.id,
      `${currentUser.getFullName()} made ${
        targetUser ? targetUser.getFullName() : 'a member'
      } ${nextRole === 'GROUP_ADMIN' ? 'a group admin' : 'a member'}`
    );
  }

  const members = await listMembers(currentUser, group.id);
  const payload = { groupId: group.id, members };
  await broadcastGroupEvent(group.id, 'group:members_updated', payload);
  await broadcastGroupEvent(
    group.id,
    'group:updated',
    toSharedGroupDetail(await getGroup(currentUser, group.id))
  );
  return members;
}


async function leaveGroup(currentUser, groupId) {
  const group = await loadGroup(groupId);
  const membership = await requireMembership(group.id, currentUser.id);

  if (GroupMember.isAdminRole(membership.role)) {
    const otherAdmins = await GroupMember.count({
      where: {
        groupId: group.id,
        role: { [Op.in]: GroupMember.ADMIN_ROLE_VALUES },
        leftAt: null,
        userId: { [Op.ne]: currentUser.id },
      },
    });

    if (otherAdmins === 0) {
      const successor = await GroupMember.findOne({
        where: {
          groupId: group.id,
          leftAt: null,
          userId: { [Op.ne]: currentUser.id },
        },
        order: [['joinedAt', 'ASC']],
      });
      if (successor) {
        successor.role = 'GROUP_ADMIN';
        await successor.save();
      }
    }
  }

  membership.leftAt = new Date();
  await membership.save();

  await postSystemMessage(
    group.id,
    `${currentUser.getFullName()} left the group`
  );

  const remaining = await activeMemberIds(group.id);
  if (remaining.length) {
    const members = await GroupMember.findAll({
      where: { groupId: group.id, leftAt: null },
      include: [{ model: User, as: 'user', attributes: USER_BRIEF_ATTRS }],
    });
    const roster = sortMembers(members).map(toMemberResponse);
    const payload = { groupId: group.id, members: roster };
    await broadcastGroupEvent(group.id, 'group:members_updated', payload, {
      memberIds: remaining,
    });
    await broadcastGroupEvent(
      group.id,
      'group:member-removed',
      {
        groupId: group.id,
        userId: currentUser.id,
        userName: currentUser.getFullName(),
        removedBy: currentUser.id,
        removedByName: currentUser.getFullName(),
        left: true,
        roster,
      },
      { memberIds: remaining }
    );
  }

  const io = getIO();
  if (io) io.in(`user:${currentUser.id}`).socketsLeave(groupRoom(group.id));

  return { groupId: group.id, left: true };
}


async function listMessages(currentUser, groupId, { before, limit = 30 } = {}) {
  const group = await loadGroup(groupId);
  await requireMembership(group.id, currentUser.id);

  const safeLimit = Math.min(Math.max(Number(limit) || 30, 1), 100);

  const where = { groupId: group.id };
  if (before) {
    const cursor = new Date(before);
    if (!Number.isNaN(cursor.getTime())) {
      where.createdAt = { [Op.lt]: cursor };
    }
  }

  
  const rows = await GroupMessage.findAll({
    where,
    include: [{ model: User, as: 'sender', attributes: USER_BRIEF_ATTRS }],
    order: [['createdAt', 'DESC'], ['id', 'DESC']],
    limit: safeLimit + 1,
  });

  const hasMore = rows.length > safeLimit;
  const page = hasMore ? rows.slice(0, safeLimit) : rows;

  return {
    messages: page.reverse().map(toMessageResponse),
    hasMore,
  };
}


async function sendMessage(currentUser, groupId, { message, messageType = 'TEXT', attachment } = {}) {
  const group = await loadGroup(groupId);
  await requireMembership(group.id, currentUser.id);

  const type = GroupMessage.TYPES.includes(messageType) ? messageType : 'TEXT';

  
  if (type === 'SYSTEM') {
    throw new ApiError(400, 'System messages cannot be sent by users');
  }

  const body = typeof message === 'string' ? message.trim() : '';

  if (type === 'TEXT' && !body) throw ApiError.groupMessageEmpty();
  if (type !== 'TEXT' && !attachment && !body) throw ApiError.groupMessageEmpty();

  const created = await GroupMessage.create({
    groupId: group.id,
    senderId: currentUser.id,
    message: body || null,
    messageType: type,
    attachmentUrl: attachment?.url || null,
    attachmentName: attachment?.name || null,
    attachmentSize: attachment?.size || null,
  });

  
  await GroupMember.update(
    { lastReadAt: created.createdAt },
    { where: { groupId: group.id, userId: currentUser.id } }
  );

  const full = await GroupMessage.findByPk(created.id, {
    include: [{ model: User, as: 'sender', attributes: USER_BRIEF_ATTRS }],
  });
  const payload = toMessageResponse(full);

  emitToGroupRoom(group.id, 'receive_message', payload);

  await emitToGroupMembers(group.id, 'group:message', payload, {
    exclude: currentUser.id,
  });

  return payload;
}

async function sendAttachmentMessage(currentUser, groupId, file, { caption } = {}) {
  if (!file) throw ApiError.fileRequired();

  let group;
  try {
    group = await loadGroup(groupId);
    await requireMembership(group.id, currentUser.id);
  } catch (err) {
    fs.promises.unlink(file.path).catch(() => {});
    throw err;
  }

  const isImage = (file.mimetype || '').startsWith('image/');

  const created = await GroupMessage.create({
    groupId: group.id,
    senderId: currentUser.id,
    message: typeof caption === 'string' && caption.trim() ? caption.trim() : null,
    messageType: isImage ? 'IMAGE' : 'FILE',
    attachmentUrl: `/uploads/group-attachments/${group.id}/${file.filename}`,
    attachmentName: file.originalname,
    attachmentSize: file.size,
    attachmentMimeType: file.mimetype,
  });

  await GroupMember.update(
    { lastReadAt: created.createdAt },
    { where: { groupId: group.id, userId: currentUser.id } }
  );

  const full = await GroupMessage.findByPk(created.id, {
    include: [{ model: User, as: 'sender', attributes: USER_BRIEF_ATTRS }],
  });
  const payload = toMessageResponse(full);

  emitToGroupRoom(group.id, 'receive_message', payload);
  await emitToGroupMembers(group.id, 'group:message', payload, {
    exclude: currentUser.id,
  });

  return payload;
}

async function getAttachmentDownloadInfo(currentUser, groupId, messageId) {
  const group = await loadGroup(groupId);
  await requireMembership(group.id, currentUser.id);

  const id = assertValidId(messageId, ApiError.groupAttachmentNotFound);
  const message = await GroupMessage.findOne({ where: { id, groupId: group.id } });

  if (!message || message.isDeleted || !message.attachmentUrl) {
    throw ApiError.groupAttachmentNotFound();
  }

  const storedName = path.basename(message.attachmentUrl);
  const absolutePath = path.join(GROUP_ATTACHMENT_DIR, group.id, storedName);

  if (!fs.existsSync(absolutePath)) throw ApiError.groupAttachmentNotFound();

  return {
    path: absolutePath,
    fileName: message.attachmentName || storedName,
    mimeType: message.attachmentMimeType || 'application/octet-stream',
  };
}

async function markGroupRead(currentUser, groupId) {
  const group = await loadGroup(groupId);
  await requireMembership(group.id, currentUser.id);

  const now = new Date();
  await GroupMember.update(
    { lastReadAt: now },
    { where: { groupId: group.id, userId: currentUser.id } }
  );

  emitToUsers([currentUser.id], 'group:read', {
    groupId: group.id,
    readAt: now,
  });

  return { groupId: group.id, unreadCount: 0, readAt: now };
}

async function deleteMessage(currentUser, messageId) {
  const id = assertValidId(messageId, () => new ApiError(400, 'A valid message ID is required'));

  const message = await GroupMessage.findByPk(id);
  if (!message) throw new ApiError(404, 'Message not found');

  const membership = await requireMembership(message.groupId, currentUser.id);

  if (message.senderId !== currentUser.id && !GroupMember.isAdminRole(membership.role)) {
    throw new ApiError(403, 'You can only delete your own messages');
  }

  message.isDeleted = true;
  await message.save();

  const payload = { messageId: message.id, groupId: message.groupId };
  emitToGroupRoom(message.groupId, 'group:message_deleted', payload);
  await emitToGroupMembers(message.groupId, 'group:message_deleted', payload);

  return payload;
}

async function searchMessages(currentUser, { q, groupId } = {}) {
  const query = (q || '').trim();
  if (!query) return { messages: [] };

  let groupIds;
  if (groupId) {
    const group = await loadGroup(groupId);
    await requireMembership(group.id, currentUser.id);
    groupIds = [group.id];
  } else {
    const memberships = await GroupMember.findAll({
      where: { userId: currentUser.id, leftAt: null },
      attributes: ['groupId'],
    });
    groupIds = memberships.map((m) => m.groupId);
  }

  if (!groupIds.length) return { messages: [] };

  const rows = await GroupMessage.findAll({
    where: {
      groupId: { [Op.in]: groupIds },
      isDeleted: false,
      messageType: { [Op.ne]: 'SYSTEM' },
      message: { [Op.like]: `%${escapeLike(query)}%` },
    },
    include: [
      { model: User, as: 'sender', attributes: USER_BRIEF_ATTRS },
      { model: Group, as: 'group', attributes: ['id', 'name', 'icon'] },
    ],
    order: [['createdAt', 'DESC']],
    limit: 50,
  });

  return {
    messages: rows.map((m) => ({
      ...toMessageResponse(m),
      group: m.group ? { id: m.group.id, name: m.group.name, icon: m.group.icon } : null,
    })),
  };
}

async function searchPeople(currentUser, query, { groupId } = {}) {
  const q = (query || '').trim();

  const where = {
    isActive: true,
    id: { [Op.ne]: currentUser.id },
  };

  if (q) {
    const like = `%${escapeLike(q)}%`;
    where[Op.or] = [
      { firstName: { [Op.like]: like } },
      { lastName: { [Op.like]: like } },
      { email: { [Op.like]: like } },
      { department: { [Op.like]: like } },
    ];
  }

  const users = await User.findAll({
    where,
    attributes: USER_BRIEF_ATTRS,
    order: [['firstName', 'ASC']],
    limit: 25,
  });

  let membershipByUserId = new Map();
  if (groupId) {
    const group = await loadGroup(groupId);
    await requireMembership(group.id, currentUser.id);
    const rows = await GroupMember.findAll({
      where: { groupId: group.id, userId: { [Op.in]: users.map((u) => u.id) } },
    });
    membershipByUserId = new Map(rows.map((r) => [r.userId, r]));
  }

  return {
    people: users.map((u) => {
      const brief = userBrief(u);
      if (!groupId) return brief;
      const row = membershipByUserId.get(u.id);
      return {
        ...brief,
        isMember: Boolean(row && !row.leftAt),
        membershipStatus: !row ? 'NONE' : row.leftAt ? 'LEFT' : 'ACTIVE',
        groupRole: row && !row.leftAt ? GroupMember.normalizeRole(row.role) : null,
      };
    }),
  };
}

module.exports = {
  createGroup,
  listMyGroups,
  getGroup,
  updateGroup,
  deleteGroup,
  listMembers,
  addMembers,
  removeMember,
  changeMemberRole,
  leaveGroup,
  listMessages,
  sendMessage,
  sendAttachmentMessage,
  getAttachmentDownloadInfo,
  markGroupRead,
  deleteMessage,
  searchMessages,
  searchPeople,
  canCreateGroups,
  GROUP_CREATE_ROLES,
  requireMembership,
  requireGroupAdmin,
  groupRoom,
  toMessageResponse,
  USER_BRIEF_ATTRS,
};
