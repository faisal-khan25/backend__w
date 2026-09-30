const asyncHandler = require('../utils/asyncHandler');
const docsService = require('../services/docs.service');

const listDocs = asyncHandler(async (req, res) => {
  const result = await docsService.listDocs(req.user);
  res.status(200).json({ docs: result });
});

const createDoc = asyncHandler(async (req, res) => {
  const { name, parentId } = req.body;
  const result = await docsService.createDoc(req.user, { name, parentId });
  res.status(201).json(result);
});

const getDoc = asyncHandler(async (req, res) => {
  const result = await docsService.getDoc(req.user, req.params.id);
  res.status(200).json(result);
});

const updateDocContent = asyncHandler(async (req, res) => {
  const result = await docsService.updateDocContent(req.user, req.params.id, req.body.content);
  res.status(200).json(result);
});

const renameDoc = asyncHandler(async (req, res) => {
  const result = await docsService.renameDoc(req.user, req.params.id, req.body.name);
  res.status(200).json(result);
});

const deleteDoc = asyncHandler(async (req, res) => {
  await docsService.deleteDoc(req.user, req.params.id);
  res.status(204).send();
});

module.exports = { listDocs, createDoc, getDoc, updateDocContent, renameDoc, deleteDoc };
