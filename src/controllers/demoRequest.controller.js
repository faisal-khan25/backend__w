const asyncHandler = require('../utils/asyncHandler');
const demoRequestService = require('../services/demoRequest.service');

const requestDemo = asyncHandler(async (req, res) => {
  const result = await demoRequestService.capture(req.body);
  res.status(201).json(result);
});

module.exports = { requestDemo };
