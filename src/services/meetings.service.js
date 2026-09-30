const { DriveItem, SlideContent } = require('../models');
const ApiError = require('../utils/ApiError');
const driveService = require('./drive.service');

const MEETING_MIME_TYPE = 'application/vnd.workspace.presentation';

function toMeetingResponse(item, slideContent, permission) {
  return {
    ...driveService.toItemResponse(item, { permission }),
    slides: slideContent ? slideContent.slides : '[{"id":"1","elements":[]}]',
    version: slideContent ? slideContent.version : 1,
    lastEditedBy: slideContent ? slideContent.lastEditedBy : undefined,
    contentUpdatedAt: slideContent ? slideContent.updatedAt : undefined,
  };
}

async function listMeetings(user) {
  const { DriveShare, User } = require('../models');
  const OWNER_ATTRS = ['id', 'firstName', 'lastName', 'email', 'profileImage'];

  const [ownedItems, shares] = await Promise.all([
    DriveItem.findAll({
      where: { ownerId: user.id, mimeType: MEETING_MIME_TYPE, isTrashed: false },
      include: [{ model: User, as: 'owner', attributes: OWNER_ATTRS }],
      order: [['updated_at', 'DESC']],
    }),
    DriveShare.findAll({
      where: { sharedWithUserId: user.id },
      include: [{
        model: DriveItem,
        as: 'item',
        where: { mimeType: MEETING_MIME_TYPE, isTrashed: false },
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

async function createMeeting(user, { name, parentId }) {
  if (parentId) await driveService.loadAccessibleItem(parentId, user.id, { requireEdit: true });

  const created = await DriveItem.create({
    ownerId: user.id,
    type: 'FILE',
    name: name || 'Untitled presentation',
    parentId: parentId || null,
    mimeType: MEETING_MIME_TYPE,
  });
  const slideContent = await SlideContent.create({ itemId: created.id, lastEditedBy: user.id });
  return toMeetingResponse(created, slideContent, 'OWNER');
}

async function getMeeting(user, id) {
  const { item, permission } = await driveService.loadAccessibleItem(id, user.id);
  if (item.mimeType !== MEETING_MIME_TYPE) throw ApiError.driveItemNotFound();
  const slideContent = await SlideContent.findByPk(id);
  return toMeetingResponse(item, slideContent, permission);
}

async function updateMeetingContent(user, id, slides) {
  const { item, permission } = await driveService.loadAccessibleItem(id, user.id, { requireEdit: true });
  if (item.mimeType !== MEETING_MIME_TYPE) throw ApiError.driveItemNotFound();

  let slideContent = await SlideContent.findByPk(id);
  if (!slideContent) slideContent = await SlideContent.create({ itemId: id });

  slideContent.slides = slides;
  slideContent.version += 1;
  slideContent.lastEditedBy = user.id;
  await slideContent.save();

  item.updatedAt = new Date();
  await item.save();

  return toMeetingResponse(item, slideContent, permission);
}

async function renameMeeting(user, id, name) {
  return driveService.renameItem(user, id, name);
}

async function deleteMeeting(user, id) {
  return driveService.trashItem(user, id);
}

module.exports = {
  MEETING_MIME_TYPE,
  listMeetings,
  createMeeting,
  getMeeting,
  updateMeetingContent,
  renameMeeting,
  deleteMeeting,
};
