const fs = require('fs');
const { DriveItem, DriveShare, User } = require('../models');
const ApiError = require('../utils/ApiError');
const notificationService = require('./notification.service');

const OWNER_ATTRS = ['id', 'firstName', 'lastName', 'email', 'profileImage'];

function toItemResponse(item, { permission } = {}) {
  return {
    id: item.id,
    type: item.type,
    name: item.name,
    parentId: item.parentId,
    mimeType: item.mimeType,
    fileSize: item.fileSize,
    isStarred: item.isStarred,
    isTrashed: item.isTrashed,
    trashedAt: item.trashedAt,
    owner: item.owner
      ? { id: item.owner.id, name: item.owner.getFullName(), email: item.owner.email }
      : undefined,
    permission: permission || 'OWNER',
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

async function findShareFor(itemId, userId) {
  return DriveShare.findOne({ where: { itemId, sharedWithUserId: userId } });
}

async function loadAccessibleItem(itemId, userId, { requireEdit = false } = {}) {
  const item = await DriveItem.findByPk(itemId, {
    include: [{ model: User, as: 'owner', attributes: OWNER_ATTRS }],
  });
  if (!item) throw ApiError.driveItemNotFound();

  if (item.ownerId === userId) return { item, permission: 'OWNER' };

  const share = await findShareFor(itemId, userId);
  if (!share) throw ApiError.driveItemNotFound();
  if (requireEdit && share.permission !== 'EDIT') throw ApiError.driveNoPermission();

  return { item, permission: share.permission };
}

async function listItems(user, { parentId = null, starred, trashed } = {}) {
  const where = { ownerId: user.id };
  where.parentId = parentId || null;
  if (starred === 'true' || starred === true) {
    where.isStarred = true;
    delete where.parentId;
  }
  if (trashed === 'true' || trashed === true) {
    where.isTrashed = true;
    delete where.parentId;
  } else {
    where.isTrashed = false;
  }

  const items = await DriveItem.findAll({
    where,
    include: [{ model: User, as: 'owner', attributes: OWNER_ATTRS }],
    order: [['type', 'ASC'], ['name', 'ASC']],
  });
  return items.map((i) => toItemResponse(i));
}

async function listSharedWithMe(user) {
  const shares = await DriveShare.findAll({
    where: { sharedWithUserId: user.id },
    include: [{ model: DriveItem, as: 'item', include: [{ model: User, as: 'owner', attributes: OWNER_ATTRS }] }],
  });
  return shares
    .filter((s) => s.item && !s.item.isTrashed)
    .map((s) => toItemResponse(s.item, { permission: s.permission }));
}

async function getItem(user, id) {
  const { item, permission } = await loadAccessibleItem(id, user.id);
  return toItemResponse(item, { permission });
}

async function createFolder(user, { name, parentId }) {
  if (!name) throw ApiError.driveNameRequired();
  if (parentId) await loadAccessibleItem(parentId, user.id, { requireEdit: true });

  const folder = await DriveItem.create({
    ownerId: user.id,
    type: 'FOLDER',
    name,
    parentId: parentId || null,
  });
  return getItem(user, folder.id);
}

async function uploadFile(user, file, { parentId }) {
  if (!file) throw ApiError.fileRequired();
  if (parentId) await loadAccessibleItem(parentId, user.id, { requireEdit: true });

  const item = await DriveItem.create({
    ownerId: user.id,
    type: 'FILE',
    name: file.originalname,
    parentId: parentId || null,
    mimeType: file.mimetype,
    storagePath: file.path,
    fileSize: file.size,
  });
  return getItem(user, item.id);
}

async function renameItem(user, id, name) {
  if (!name) throw ApiError.driveNameRequired();
  const { item, permission } = await loadAccessibleItem(id, user.id, { requireEdit: true });
  item.name = name;
  await item.save();
  return toItemResponse(item, { permission });
}

async function isDescendant(candidateAncestorId, itemId) {
  let current = await DriveItem.findByPk(itemId);
  while (current && current.parentId) {
    if (current.parentId === candidateAncestorId) return true;
    current = await DriveItem.findByPk(current.parentId);
  }
  return false;
}

async function moveItem(user, id, parentId) {
  const { item } = await loadAccessibleItem(id, user.id, { requireEdit: true });

  if (parentId) {
    if (parentId === id) throw ApiError.driveCannotMoveIntoSelf();
    await loadAccessibleItem(parentId, user.id, { requireEdit: true });
    if (item.type === 'FOLDER' && (await isDescendant(id, parentId))) {
      throw ApiError.driveCannotMoveIntoSelf();
    }
  }

  item.parentId = parentId || null;
  await item.save();
  return getItem(user, id);
}

async function toggleStar(user, id, isStarred) {
  const { item, permission } = await loadAccessibleItem(id, user.id);
  item.isStarred = !!isStarred;
  await item.save();
  return toItemResponse(item, { permission });
}

async function trashItem(user, id) {
  const { item } = await loadAccessibleItem(id, user.id, { requireEdit: true });
  item.isTrashed = true;
  item.trashedAt = new Date();
  await item.save();
  return { success: true };
}

async function restoreItem(user, id) {
  const item = await DriveItem.findOne({ where: { id, ownerId: user.id } });
  if (!item) throw ApiError.driveItemNotFound();
  item.isTrashed = false;
  item.trashedAt = null;
  await item.save();
  return getItem(user, id);
}

async function deleteItemPermanently(user, id) {
  const item = await DriveItem.findOne({ where: { id, ownerId: user.id } });
  if (!item) throw ApiError.driveItemNotFound();
  if (!item.isTrashed) throw new ApiError(409, 'Item must be moved to trash before it can be permanently deleted');

  await DriveShare.destroy({ where: { itemId: id } });
  await item.destroy();
  if (item.storagePath) {
    fs.promises.unlink(item.storagePath).catch(() => {
    });
  }
  return { success: true };
}

async function getDownloadInfo(user, id) {
  const { item } = await loadAccessibleItem(id, user.id);
  if (item.type !== 'FILE' || !item.storagePath || !fs.existsSync(item.storagePath)) {
    throw ApiError.driveItemNotFound();
  }
  return { path: item.storagePath, fileName: item.name, mimeType: item.mimeType };
}

async function shareItem(user, id, { userId, permission = 'VIEW' }) {
  const { item } = await loadAccessibleItem(id, user.id);
  if (item.ownerId !== user.id) throw ApiError.driveNotOwner();
  if (userId === item.ownerId) throw ApiError.driveShareTargetIsOwner();

  const target = await User.findOne({ where: { id: userId, isActive: true } });
  if (!target) throw ApiError.chatUserNotFound();
  if (!DriveShare.PERMISSIONS.includes(permission)) {
    throw new ApiError(400, 'permission must be VIEW or EDIT');
  }

  await DriveShare.upsert({ itemId: id, sharedWithUserId: userId, sharedBy: user.id, permission });

  await notificationService.notifyUser(userId, {
    type: 'DRIVE',
    title: 'File shared with you',
    message: `${user.getFullName()} shared "${item.name}" with you`,
    referenceId: item.id,
    referenceType: 'DRIVE_ITEM',
  });

  return listShares(user, id);
}

async function listShares(user, id) {
  const { item } = await loadAccessibleItem(id, user.id);
  if (item.ownerId !== user.id) throw ApiError.driveNotOwner();

  const shares = await DriveShare.findAll({
    where: { itemId: id },
    include: [{ model: User, as: 'sharedWithUser', attributes: OWNER_ATTRS }],
  });
  return shares.map((s) => ({
    id: s.id,
    permission: s.permission,
    user: s.sharedWithUser
      ? { id: s.sharedWithUser.id, name: s.sharedWithUser.getFullName(), email: s.sharedWithUser.email }
      : undefined,
    createdAt: s.createdAt,
  }));
}

async function updateSharePermission(user, id, shareId, permission) {
  const { item } = await loadAccessibleItem(id, user.id);
  if (item.ownerId !== user.id) throw ApiError.driveNotOwner();
  if (!DriveShare.PERMISSIONS.includes(permission)) {
    throw new ApiError(400, 'permission must be VIEW or EDIT');
  }

  const share = await DriveShare.findOne({ where: { id: shareId, itemId: id } });
  if (!share) throw new ApiError(404, 'Share not found');
  share.permission = permission;
  await share.save();
  return listShares(user, id);
}

async function removeShare(user, id, shareId) {
  const { item } = await loadAccessibleItem(id, user.id);
  if (item.ownerId !== user.id) throw ApiError.driveNotOwner();

  const deleted = await DriveShare.destroy({ where: { id: shareId, itemId: id } });
  if (!deleted) throw new ApiError(404, 'Share not found');
  return { success: true };
}

module.exports = {
  toItemResponse,
  loadAccessibleItem,
  listItems,
  listSharedWithMe,
  getItem,
  createFolder,
  uploadFile,
  renameItem,
  moveItem,
  toggleStar,
  trashItem,
  restoreItem,
  deleteItemPermanently,
  getDownloadInfo,
  shareItem,
  listShares,
  updateSharePermission,
  removeShare,
};
