const { body, query } = require('express-validator');
const { validate } = require('./_validateShared');

const deductionFields = [
  'pf',
  'professionalTax',
  'tds',
  'insurance',
  'loanRecovery',
  'salaryAdvance',
  'otherDeductions',
];

const deductionValidators = deductionFields.map((f) => body(`deductions.${f}`).optional({ checkFalsy: true }).isFloat({ min: 0 }));

const calculatePayrollValidators = [
  body('employeeId').notEmpty().withMessage('employeeId is required').isString(),
  body('month').notEmpty().isInt({ min: 1, max: 12 }).withMessage('month must be 1-12'),
  body('year').notEmpty().isInt({ min: 2000 }).withMessage('year is invalid'),
  body('overrideGrossSalary').optional({ checkFalsy: true }).isFloat({ min: 0 }),
  body('otherEarnings').optional({ checkFalsy: true }).isFloat({ min: 0 }),
  ...deductionValidators,
  validate,
];

const createPayrollValidators = [
  ...calculatePayrollValidators.slice(0, -1),
  body('overrideReason')
    .if(body('overrideGrossSalary').exists({ checkFalsy: true }))
    .notEmpty()
    .withMessage('overrideReason is required when overrideGrossSalary is provided'),
  validate,
];

const updatePayrollValidators = [
  body('overrideGrossSalary').optional({ checkFalsy: true }).isFloat({ min: 0 }),
  body('otherEarnings').optional({ checkFalsy: true }).isFloat({ min: 0 }),
  ...deductionValidators,
  body('overrideReason')
    .if(body('overrideGrossSalary').exists({ checkFalsy: true }))
    .notEmpty()
    .withMessage('overrideReason is required when overrideGrossSalary is provided'),
  validate,
];

const markPaidValidators = [
  body('paymentDate').optional({ checkFalsy: true }).isISO8601(),
  body('paymentReference').optional({ checkFalsy: true }).isString().isLength({ max: 100 }),
  validate,
];

const listPayrollValidators = [
  query('month').optional({ checkFalsy: true }).isInt({ min: 1, max: 12 }),
  query('year').optional({ checkFalsy: true }).isInt({ min: 2000 }),
  query('page').optional({ checkFalsy: true }).isInt({ min: 1 }),
  query('pageSize').optional({ checkFalsy: true }).isInt({ min: 1, max: 100 }),
  validate,
];

module.exports = {
  calculatePayrollValidators,
  createPayrollValidators,
  updatePayrollValidators,
  markPaidValidators,
  listPayrollValidators,
};
