const { body, query } = require('express-validator');
const { validate } = require('./_validateShared');

const generatePayslipValidators = [
  body('userId').notEmpty().withMessage('userId is required').isString(),
  body('month').notEmpty().isInt({ min: 1, max: 12 }).withMessage('month must be 1-12'),
  body('year').notEmpty().isInt({ min: 2000 }).withMessage('year is invalid'),
  body('basicSalary').notEmpty().isFloat({ min: 0 }).withMessage('basicSalary must be a positive number'),
  body('allowances').optional({ checkFalsy: true }).isFloat({ min: 0 }),
  body('deductions').optional({ checkFalsy: true }).isFloat({ min: 0 }),
  body('notes').optional({ checkFalsy: true }).isString().isLength({ max: 500 }),
  validate,
];

const listMyPayslipsValidators = [
  query('year').optional({ checkFalsy: true }).isInt({ min: 2000 }),
  validate,
];

module.exports = { generatePayslipValidators, listMyPayslipsValidators };
