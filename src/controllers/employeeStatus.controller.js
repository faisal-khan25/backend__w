const asyncHandler = require('../utils/asyncHandler');
const statusService = require('../services/employeeStatus.service');


const setMyStatus = asyncHandler(async (req, res) => {
  const { statusType, message, startTime, endTime } = req.body;
  const result = await statusService.setStatus(req.user, { statusType, message, startTime, endTime });
  res.status(201).json(result);
});

const getMyStatus = asyncHandler(async (req, res) => {
  const result = await statusService.getMyStatus(req.user);
  res.status(200).json({ status: result });
});

const clearMyStatus = asyncHandler(async (req, res) => {
  const result = await statusService.clearStatus(req.user);
  res.status(200).json(result);
});

const getUserStatus = asyncHandler(async (req, res) => {
  const result = await statusService.getActiveStatus(req.params.userId);
  res.status(200).json({ status: result });
});

const getBulkStatuses = asyncHandler(async (req, res) => {
  const { userIds } = req.body;
  const result = await statusService.getActiveStatuses(userIds);
  res.status(200).json({ statuses: result });
});

module.exports = { setMyStatus, getMyStatus, clearMyStatus, getUserStatus, getBulkStatuses };