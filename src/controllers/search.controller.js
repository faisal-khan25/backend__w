const asyncHandler = require('../utils/asyncHandler');
const searchService = require('../services/search.service');

const globalSearch = asyncHandler(async (req, res) => {
  const { q, limit } = req.query;
  const perModuleLimit = limit ? Math.min(Number(limit), 20) : 5;
  const result = await searchService.globalSearch(req.user, { q, perModuleLimit });
  res.status(200).json(result);
});


const searchModule = asyncHandler(async (req, res) => {
  const { q, page, limit } = req.query;
  const result = await searchService.searchModule(req.user, req.params.module, {
    q,
    page: page ? Number(page) : 1,
    limit: limit ? Math.min(Number(limit), 50) : 20,
  });
  res.status(200).json(result);
});

module.exports = { globalSearch, searchModule };