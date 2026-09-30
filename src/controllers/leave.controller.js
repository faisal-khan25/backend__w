const asyncHandler = require('../utils/asyncHandler');
const leaveService = require('../services/leave.service');

const listLeaveTypes = asyncHandler(async (req, res) => {
  const result = await leaveService.listLeaveTypes();
  res.status(200).json(result);
});

const getBalance = asyncHandler(async (req, res) => {
  const { year } = req.query;
  const result = await leaveService.getBalance(req.user, { year: year ? Number(year) : undefined });
  res.status(200).json(result);
});

const applyLeave = asyncHandler(async (req, res) => {
  const result = await leaveService.applyLeave(req.user, req.body);
  res.status(201).json(result);
});

const listMyLeaves = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const result = await leaveService.listMyLeaves(req.user, { status });
  res.status(200).json(result);
});

const cancelLeave = asyncHandler(async (req, res) => {
  const result = await leaveService.cancelLeave(req.user, req.params.id);
  res.status(200).json(result);
});

const listPendingApprovals = asyncHandler(async (req, res) => {
  const result = await leaveService.listPendingApprovals();
  res.status(200).json(result);
});

const decide = asyncHandler(async (req, res) => {
  const result = await leaveService.decide(req.user, req.params.id, req.body);
  res.status(200).json(result);
});

module.exports = {
  listLeaveTypes,
  getBalance,
  applyLeave,
  listMyLeaves,
  cancelLeave,
  listPendingApprovals,
  decide,
};
