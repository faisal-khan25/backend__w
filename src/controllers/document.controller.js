const asyncHandler = require('../utils/asyncHandler');
const documentService = require('../services/document.service');

const listMyDocuments = asyncHandler(async (req, res) => {
  const { category } = req.query;
  const result = await documentService.listMyDocuments(req.user, { category });
  res.status(200).json(result);
});

const uploadDocument = asyncHandler(async (req, res) => {
  const result = await documentService.uploadDocument(req.user, req.file, req.body);
  res.status(201).json(result);
});

const downloadDocument = asyncHandler(async (req, res) => {
  const { path, fileName } = await documentService.getDownloadInfo(req.user, req.params.id);
  res.download(path, fileName);
});

const deleteDocument = asyncHandler(async (req, res) => {
  await documentService.deleteDocument(req.user, req.params.id);
  res.status(204).send();
});

module.exports = { listMyDocuments, uploadDocument, downloadDocument, deleteDocument };
