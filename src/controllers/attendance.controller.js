const asyncHandler = require('../utils/asyncHandler');
const attendanceService = require('../services/attendance.service');

const punchIn = asyncHandler(async (req, res) => {
  const result = await attendanceService.punchIn(req.user, req.body);
  res.status(201).json(result);
});

const punchOut = asyncHandler(async (req, res) => {
  const result = await attendanceService.punchOut(req.user);
  res.status(200).json(result);
});

const getToday = asyncHandler(async (req, res) => {
  const result = await attendanceService.getToday(req.user);
  res.status(200).json(result);
});

const getHistory = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const result = await attendanceService.getHistory(req.user, { from, to });
  res.status(200).json(result);
});

const getMonthlySummary = asyncHandler(async (req, res) => {
  const { month, year } = req.query;
  const result = await attendanceService.getMonthlySummary(req.user, {
    month: month ? Number(month) : undefined,
    year: year ? Number(year) : undefined,
  });
  res.status(200).json(result);
});

module.exports = { punchIn, punchOut, getToday, getHistory, getMonthlySummary };
