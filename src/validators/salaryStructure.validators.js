const { body, param } = require('express-validator');
const { validate } = require('./_validateShared');

const createSalaryStructureValidators = [
  body('employeeId').notEmpty().withMessage('employeeId is required').isString(),
  body('basicSalary').notEmpty().isFloat({ min: 0 }).withMessage('basicSalary must be a positive number'),
  body('hra').optional({ checkFalsy: true }).isFloat({ min: 0 }),
  body('otherAllowances').optional({ checkFalsy: true }).isFloat({ min: 0 }),
  body('effectiveFrom').notEmpty().isISO8601().withMessage('effectiveFrom must be a valid date (YYYY-MM-DD)'),
  body('effectiveTo').optional({ checkFalsy: true }).isISO8601(),
  validate,
];

const updateSalaryStructureValidators = [
  param('employeeId').notEmpty().isString(),
  body('basicSalary').notEmpty().isFloat({ min: 0 }).withMessage('basicSalary must be a positive number'),
  body('hra').optional({ checkFalsy: true }).isFloat({ min: 0 }),
  body('otherAllowances').optional({ checkFalsy: true }).isFloat({ min: 0 }),
  body('effectiveFrom').notEmpty().isISO8601().withMessage('effectiveFrom must be a valid date (YYYY-MM-DD)'),
  body('effectiveTo').optional({ checkFalsy: true }).isISO8601(),
  validate,
];

module.exports = { createSalaryStructureValidators, updateSalaryStructureValidators };
