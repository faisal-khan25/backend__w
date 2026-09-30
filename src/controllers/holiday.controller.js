const asyncHandler = require('../utils/asyncHandler');
const holidayService = require('../services/holiday.service');

const list = asyncHandler(async (req, res) => {
  const { year, type } = req.query;
  const result = await holidayService.listHolidays({ year, type });
  res.status(200).json(result);
});

const upcoming = asyncHandler(async (req, res) => {
  const { limit } = req.query;
  const result = await holidayService.listUpcoming(limit ? Number(limit) : undefined);
  res.status(200).json(result);
});

const create = asyncHandler(async (req, res) => {
  const result = await holidayService.createHoliday(req.user, req.body);
  res.status(201).json(result);
});

const update = asyncHandler(async (req, res) => {
  const result = await holidayService.updateHoliday(req.params.id, req.body);
  res.status(200).json(result);
});

const remove = asyncHandler(async (req, res) => {
  const result = await holidayService.deleteHoliday(req.params.id);
  res.status(200).json(result);
});

module.exports = { list, upcoming, create, update, remove };
