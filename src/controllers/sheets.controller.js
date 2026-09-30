const asyncHandler = require('../utils/asyncHandler');
const sheetsService = require('../services/sheets.service');

const listSheets = asyncHandler(async (req, res) => {
  const result = await sheetsService.listSheets(req.user);
  res.status(200).json({ sheets: result });
});

const createSheet = asyncHandler(async (req, res) => {
  const { name, parentId } = req.body;
  const result = await sheetsService.createSheet(req.user, { name, parentId });
  res.status(201).json(result);
});

const getSheet = asyncHandler(async (req, res) => {
  const result = await sheetsService.getSheet(req.user, req.params.id);
  res.status(200).json(result);
});

const updateSheetContent = asyncHandler(async (req, res) => {
  const { cells, sheetNames } = req.body;
  const result = await sheetsService.updateSheetContent(req.user, req.params.id, { cells, sheetNames });
  res.status(200).json(result);
});

const renameSheet = asyncHandler(async (req, res) => {
  const result = await sheetsService.renameSheet(req.user, req.params.id, req.body.name);
  res.status(200).json(result);
});

const deleteSheet = asyncHandler(async (req, res) => {
  await sheetsService.deleteSheet(req.user, req.params.id);
  res.status(204).send();
});

module.exports = { listSheets, createSheet, getSheet, updateSheetContent, renameSheet, deleteSheet };
