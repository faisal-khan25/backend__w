const { query, body } = require('express-validator');
const { validate } = require('./_validateShared');

const DATE_RANGE_PRESETS = ['today', 'this_week', 'this_month', 'last_month', 'this_year', 'custom'];

const dateRangeValidators = [
  query('range').optional({ checkFalsy: true }).isIn(DATE_RANGE_PRESETS).withMessage('Invalid date range preset'),
  query('from').optional({ checkFalsy: true }).isISO8601().withMessage('from must be a valid date'),
  query('to').optional({ checkFalsy: true }).isISO8601().withMessage('to must be a valid date'),
];

const paginationValidators = [
  query('page').optional({ checkFalsy: true }).isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('pageSize').optional({ checkFalsy: true }).isInt({ min: 1, max: 500 }).withMessage('pageSize must be between 1 and 500'),
];

const employeeReportValidators = [...paginationValidators, validate];

const attendanceReportValidators = [...dateRangeValidators, ...paginationValidators, validate];

const leaveReportValidators = [...dateRangeValidators, ...paginationValidators, validate];

const taskReportValidators = [
  query('dueFrom').optional({ checkFalsy: true }).isISO8601(),
  query('dueTo').optional({ checkFalsy: true }).isISO8601(),
  ...paginationValidators,
  validate,
];

const payrollReportValidators = [
  query('month').optional({ checkFalsy: true }).isInt({ min: 1, max: 12 }).withMessage('month must be 1-12'),
  query('year').optional({ checkFalsy: true }).isInt({ min: 2000 }).withMessage('year is invalid'),
  ...paginationValidators,
  validate,
];

const departmentReportValidators = [validate];

const documentReportValidators = [...paginationValidators, validate];

const customReportValidators = [
  body('category')
    .isIn(['employees', 'attendance', 'leave', 'tasks', 'payroll', 'documents'])
    .withMessage('Invalid report category'),
  body('fields').optional().isArray().withMessage('fields must be an array of field keys'),
  body('filters').optional().isObject().withMessage('filters must be an object'),
  validate,
];

const exportValidators = [
  query('type')
    .isIn(['employees', 'attendance', 'leave', 'tasks', 'payroll', 'documents'])
    .withMessage('Invalid export type'),
  validate,
];

module.exports = {
  employeeReportValidators,
  attendanceReportValidators,
  leaveReportValidators,
  taskReportValidators,
  payrollReportValidators,
  departmentReportValidators,
  documentReportValidators,
  customReportValidators,
  exportValidators,
};
