const asyncHandler = require('../utils/asyncHandler');
const driveService = require('../services/drive.service');

const listItems = asyncHandler(async (req, res) => {
  const { parentId, starred, trashed } = req.query;
  const result = await driveService.listItems(req.user, { parentId, starred, trashed });
  res.status(200).json({ items: result });
});

const listSharedWithMe = asyncHandler(async (req, res) => {
  const result = await driveService.listSharedWithMe(req.user);
  res.status(200).json({ items: result });
});

const getItem = asyncHandler(async (req, res) => {
  const result = await driveService.getItem(req.user, req.params.id);
  res.status(200).json(result);
});

const createFolder = asyncHandler(async (req, res) => {
  const { name, parentId } = req.body;
  const result = await driveService.createFolder(req.user, { name, parentId });
  res.status(201).json(result);
});

const uploadFile = asyncHandler(async (req, res) => {
  const result = await driveService.uploadFile(req.user, req.file, { parentId: req.body.parentId });
  res.status(201).json(result);
});

const renameItem = asyncHandler(async (req, res) => {
  const result = await driveService.renameItem(req.user, req.params.id, req.body.name);
  res.status(200).json(result);
});

const moveItem = asyncHandler(async (req, res) => {
  const result = await driveService.moveItem(req.user, req.params.id, req.body.parentId);
  res.status(200).json(result);
});

const starItem = asyncHandler(async (req, res) => {
  const result = await driveService.toggleStar(req.user, req.params.id, true);
  res.status(200).json(result);
});

const unstarItem = asyncHandler(async (req, res) => {
  const result = await driveService.toggleStar(req.user, req.params.id, false);
  res.status(200).json(result);
});

const trashItem = asyncHandler(async (req, res) => {
  const result = await driveService.trashItem(req.user, req.params.id);
  res.status(200).json(result);
});

const restoreItem = asyncHandler(async (req, res) => {
  const result = await driveService.restoreItem(req.user, req.params.id);
  res.status(200).json(result);
});

const deleteItemPermanently = asyncHandler(async (req, res) => {
  await driveService.deleteItemPermanently(req.user, req.params.id);
  res.status(204).send();
});

const downloadItem = asyncHandler(async (req, res) => {
  const { path, fileName } = await driveService.getDownloadInfo(req.user, req.params.id);
  res.download(path, fileName);
});

const shareItem = asyncHandler(async (req, res) => {
  const { userId, permission } = req.body;
  const result = await driveService.shareItem(req.user, req.params.id, { userId, permission });
  res.status(201).json({ shares: result });
});

const listShares = asyncHandler(async (req, res) => {
  const result = await driveService.listShares(req.user, req.params.id);
  res.status(200).json({ shares: result });
});

const updateSharePermission = asyncHandler(async (req, res) => {
  const result = await driveService.updateSharePermission(req.user, req.params.id, req.params.shareId, req.body.permission);
  res.status(200).json({ shares: result });
});

const removeShare = asyncHandler(async (req, res) => {
  await driveService.removeShare(req.user, req.params.id, req.params.shareId);
  res.status(204).send();
});

module.exports = {
  listItems,
  listSharedWithMe,
  getItem,
  createFolder,
  uploadFile,
  renameItem,
  moveItem,
  starItem,
  unstarItem,
  trashItem,
  restoreItem,
  deleteItemPermanently,
  downloadItem,
  shareItem,
  listShares,
  updateSharePermission,
  removeShare,
};
