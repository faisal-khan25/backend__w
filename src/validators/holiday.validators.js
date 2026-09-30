const { body, query, param } = require('express-validator');
const { validate } = require('./_validateShared');
const { Holiday } = require('../models');

const listHolidaysValidators = [
  query('year').optional({ checkFalsy: true }).isInt({ min: 2000, max: 2100 }),
  query('type').optional({ checkFalsy: true }).isIn(Holiday.TYPES),
  validate,
];

const upcomingValidators = [
  query('limit').optional({ checkFalsy: true }).isInt({ min: 1, max: 50 }),
  validate,
];

const createHolidayValidators = [
  body('name').notEmpty().withMessage('Holiday name is required'),
  body('date').notEmpty().isISO8601().withMessage('A valid date is required'),
  body('type').optional({ checkFalsy: true }).isIn(Holiday.TYPES),
  body('description').optional({ checkFalsy: true }).isString().isLength({ max: 500 }),
  validate,
];

const updateHolidayValidators = [
  param('id').notEmpty().isString(),
  body('name').optional({ checkFalsy: true }).isString(),
  body('date').optional({ checkFalsy: true }).isISO8601(),
  body('type').optional({ checkFalsy: true }).isIn(Holiday.TYPES),
  body('description').optional({ checkFalsy: true }).isString().isLength({ max: 500 }),
  validate,
];

module.exports = {
  listHolidaysValidators,
  upcomingValidators,
  createHolidayValidators,
  updateHolidayValidators,
};
