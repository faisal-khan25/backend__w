const { body, query } = require('express-validator');
const { validate } = require('./_validateShared');

const punchInValidators = [
  body('ipAddress').optional({ checkFalsy: true }).isString(),
  body('location').optional({ checkFalsy: true }).isString(),
  body('deviceInfo').optional({ checkFalsy: true }).isString(),
  validate,
];

const historyValidators = [
  query('from').optional({ checkFalsy: true }).isISO8601().withMessage('from must be a valid date'),
  query('to').optional({ checkFalsy: true }).isISO8601().withMessage('to must be a valid date'),
  validate,
];

const monthlySummaryValidators = [
  query('month').optional({ checkFalsy: true }).isInt({ min: 1, max: 12 }).withMessage('month must be 1-12'),
  query('year').optional({ checkFalsy: true }).isInt({ min: 2000 }).withMessage('year is invalid'),
  validate,
];

module.exports = { punchInValidators, historyValidators, monthlySummaryValidators };
