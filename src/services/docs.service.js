const { DriveItem, DocContent } = require('../models');
const ApiError = require('../utils/ApiError');
const driveService = require('./drive.service');

const DOC_MIME_TYPE = 'application/vnd.workspace.document';

function toDocResponse(item, docContent, permission) {
  return {
    ...driveService.toItemResponse(item, { permission }),
    content: docContent ? docContent.content : '',
    version: docContent ? docContent.version : 1,
    lastEditedBy: docContent ? docContent.lastEditedBy : undefined,
    contentUpdatedAt: docContent ? docContent.updatedAt : undefined,
  };
}

async function listDocs(user) {
  const { Op } = require('sequelize');
  const { User, DriveShare } = require('../models');
  const OWNER_ATTRS = ['id', 'firstName', 'lastName', 'email', 'profileImage'];

  const [ownedItems, shares] = await Promise.all([
    DriveItem.findAll({
      where: { ownerId: user.id, mimeType: DOC_MIME_TYPE, isTrashed: false },
      include: [{ model: User, as: 'owner', attributes: OWNER_ATTRS }],
      order: [['updated_at', 'DESC']],
    }),
    DriveShare.findAll({
      where: { sharedWithUserId: user.id },
      include: [{
        model: DriveItem,
        as: 'item',
        where: { mimeType: DOC_MIME_TYPE, isTrashed: false },
        include: [{ model: User, as: 'owner', attributes: OWNER_ATTRS }],
      }],
    }),
  ]);

  const seen = new Set();
  return [
    ...ownedItems.map((i) => ({ item: i, permission: 'OWNER' })),
    ...shares.filter((s) => s.item).map((s) => ({ item: s.item, permission: s.permission })),
  ]
    .filter(({ item }) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    })
    .map(({ item, permission }) => driveService.toItemResponse(item, { permission }));
}

async function createDoc(user, { name, parentId }) {
  if (parentId) await driveService.loadAccessibleItem(parentId, user.id, { requireEdit: true });

  const created = await DriveItem.create({
    ownerId: user.id,
    type: 'FILE',
    name: name || 'Untitled document',
    parentId: parentId || null,
    mimeType: DOC_MIME_TYPE,
  });
  const docContent = await DocContent.create({ itemId: created.id, content: '', lastEditedBy: user.id });
  return toDocResponse(created, docContent, 'OWNER');
}

async function getDoc(user, id) {
  const { item, permission } = await driveService.loadAccessibleItem(id, user.id);
  if (item.mimeType !== DOC_MIME_TYPE) throw ApiError.driveItemNotFound();
  const docContent = await DocContent.findByPk(id);
  return toDocResponse(item, docContent, permission);
}

async function updateDocContent(user, id, content) {
  const { item, permission } = await driveService.loadAccessibleItem(id, user.id, { requireEdit: true });
  if (item.mimeType !== DOC_MIME_TYPE) throw ApiError.driveItemNotFound();

  let docContent = await DocContent.findByPk(id);
  if (!docContent) docContent = await DocContent.create({ itemId: id, content: '' });

  docContent.content = content;
  docContent.version += 1;
  docContent.lastEditedBy = user.id;
  await docContent.save();

  item.updatedAt = new Date();
  await item.save();

  return toDocResponse(item, docContent, permission);
}

async function renameDoc(user, id, name) {
  return driveService.renameItem(user, id, name);
}

async function deleteDoc(user, id) {
  return driveService.trashItem(user, id);
}

module.exports = { DOC_MIME_TYPE, listDocs, createDoc, getDoc, updateDocContent, renameDoc, deleteDoc };
