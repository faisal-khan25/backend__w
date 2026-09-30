const { DriveItem, SheetContent } = require('../models');
const ApiError = require('../utils/ApiError');
const driveService = require('./drive.service');

const SHEET_MIME_TYPE = 'application/vnd.workspace.spreadsheet';

async function listSheets(user) {
  const { DriveShare, User } = require('../models');
  const OWNER_ATTRS = ['id', 'firstName', 'lastName', 'email', 'profileImage'];

  const ownedItems = await DriveItem.findAll({
    where: { ownerId: user.id, mimeType: SHEET_MIME_TYPE, isTrashed: false },
    include: [{ model: User, as: 'owner', attributes: OWNER_ATTRS }],
    order: [['updated_at', 'DESC']],
  });

  const shares = await DriveShare.findAll({
    where: { sharedWithUserId: user.id },
    include: [{
      model: DriveItem,
      as: 'item',
      where: { mimeType: SHEET_MIME_TYPE, isTrashed: false },
      include: [{ model: User, as: 'owner', attributes: OWNER_ATTRS }],
    }],
  });

  const seen = new Set();
  return [
    ...ownedItems.map((i) => ({ item: i, permission: 'OWNER' })),
    ...shares.map((s) => ({ item: s.item, permission: s.permission })),
  ]
    .filter(({ item }) => { if (seen.has(item.id)) return false; seen.add(item.id); return true; })
    .map(({ item, permission }) => driveService.toItemResponse(item, { permission }));
}

function toSheetResponse(item, sheetContent, permission) {
  return {
    ...driveService.toItemResponse(item, { permission }),
    cells: sheetContent ? sheetContent.cells : '{}',
    sheetNames: sheetContent ? sheetContent.sheetNames : '["Sheet1"]',
    version: sheetContent ? sheetContent.version : 1,
    lastEditedBy: sheetContent ? sheetContent.lastEditedBy : undefined,
    contentUpdatedAt: sheetContent ? sheetContent.updatedAt : undefined,
  };
}

async function createSheet(user, { name, parentId }) {
  if (parentId) await driveService.loadAccessibleItem(parentId, user.id, { requireEdit: true });

  const created = await DriveItem.create({
    ownerId: user.id,
    type: 'FILE',
    name: name || 'Untitled spreadsheet',
    parentId: parentId || null,
    mimeType: SHEET_MIME_TYPE,
  });
  const sheetContent = await SheetContent.create({ itemId: created.id, lastEditedBy: user.id });
  return toSheetResponse(created, sheetContent, 'OWNER');
}

async function getSheet(user, id) {
  const { item, permission } = await driveService.loadAccessibleItem(id, user.id);
  if (item.mimeType !== SHEET_MIME_TYPE) throw ApiError.driveItemNotFound();
  const sheetContent = await SheetContent.findByPk(id);
  return toSheetResponse(item, sheetContent, permission);
}

async function updateSheetContent(user, id, { cells, sheetNames }) {
  const { item, permission } = await driveService.loadAccessibleItem(id, user.id, { requireEdit: true });
  if (item.mimeType !== SHEET_MIME_TYPE) throw ApiError.driveItemNotFound();

  let sheetContent = await SheetContent.findByPk(id);
  if (!sheetContent) sheetContent = await SheetContent.create({ itemId: id });

  if (cells !== undefined) sheetContent.cells = cells;
  if (sheetNames !== undefined) sheetContent.sheetNames = sheetNames;
  sheetContent.version += 1;
  sheetContent.lastEditedBy = user.id;
  await sheetContent.save();

  item.updatedAt = new Date();
  await item.save();

  return toSheetResponse(item, sheetContent, permission);
}

async function renameSheet(user, id, name) {
  return driveService.renameItem(user, id, name);
}

async function deleteSheet(user, id) {
  return driveService.trashItem(user, id);
}

module.exports = { SHEET_MIME_TYPE, listSheets, createSheet, getSheet, updateSheetContent, renameSheet, deleteSheet };
