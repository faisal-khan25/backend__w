const { Op } = require('sequelize');
const { Holiday } = require('../models');
const ApiError = require('../utils/ApiError');

function toHolidayResponse(h) {
  return {
    id: h.id,
    name: h.name,
    date: h.date,
    type: h.type,
    description: h.description,
  };
}

async function listHolidays({ year, type } = {}) {
  const where = {};
  if (year) {
    where.date = { [Op.gte]: `${year}-01-01`, [Op.lte]: `${year}-12-31` };
  }
  if (type) where.type = type;

  const holidays = await Holiday.findAll({ where, order: [['date', 'ASC']] });
  return holidays.map(toHolidayResponse);
}

async function listUpcoming(limit = 5) {
  const today = new Date().toISOString().slice(0, 10);
  const holidays = await Holiday.findAll({
    where: { date: { [Op.gte]: today } },
    order: [['date', 'ASC']],
    limit,
  });
  return holidays.map(toHolidayResponse);
}

async function createHoliday(actingUser, data) {
  const holiday = await Holiday.create({ ...data, createdBy: actingUser.id });
  return toHolidayResponse(holiday);
}

async function updateHoliday(id, data) {
  const holiday = await Holiday.findByPk(id);
  if (!holiday) throw ApiError.holidayNotFound();
  Object.assign(holiday, data);
  await holiday.save();
  return toHolidayResponse(holiday);
}

async function deleteHoliday(id) {
  const deleted = await Holiday.destroy({ where: { id } });
  if (!deleted) throw ApiError.holidayNotFound();
  return { success: true };
}

module.exports = { listHolidays, listUpcoming, createHoliday, updateHoliday, deleteHoliday };
