const asyncHandler = require('../utils/asyncHandler');
const chatSpaceService = require('../services/chatspace.service');

const listMySpaces = asyncHandler(async (req, res) => {
  const result = await chatSpaceService.listMySpaces(req.user);
  res.status(200).json({ spaces: result });
});

const createSpace = asyncHandler(async (req, res) => {
  const { name, description, memberIds } = req.body;
  const result = await chatSpaceService.createSpace(req.user, { name, description, memberIds });
  res.status(201).json(result);
});

const getSpace = asyncHandler(async (req, res) => {
  const result = await chatSpaceService.getSpace(req.user, req.params.id);
  res.status(200).json(result);
});

const updateSpace = asyncHandler(async (req, res) => {
  const result = await chatSpaceService.updateSpace(req.user, req.params.id, req.body);
  res.status(200).json(result);
});

const addSpaceMembers = asyncHandler(async (req, res) => {
  const result = await chatSpaceService.addSpaceMembers(req.user, req.params.id, req.body.memberIds);
  res.status(200).json(result);
});

const removeSpaceMember = asyncHandler(async (req, res) => {
  const result = await chatSpaceService.removeSpaceMember(req.user, req.params.id, req.params.userId);
  res.status(200).json(result);
});

const archiveSpace = asyncHandler(async (req, res) => {
  const result = await chatSpaceService.archiveSpace(req.user, req.params.id);
  res.status(200).json(result);
});

module.exports = {
  listMySpaces,
  createSpace,
  getSpace,
  updateSpace,
  addSpaceMembers,
  removeSpaceMember,
  archiveSpace,
};
