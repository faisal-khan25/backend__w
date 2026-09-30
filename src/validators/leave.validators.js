const { body, query } = require('express-validator');
const { validate } = require('./_validateShared');

const applyLeaveValidators = [
  body('leaveTypeId').notEmpty().withMessage('leaveTypeId is required').isString(),
  body('fromDate').notEmpty().withMessage('fromDate is required').isISO8601().withMessage('fromDate must be a valid date'),
  body('toDate').notEmpty().withMessage('toDate is required').isISO8601().withMessage('toDate must be a valid date'),
  body('reason').optional({ checkFalsy: true }).isString().isLength({ max: 1000 }),
  validate,
];

const listMyLeavesValidators = [
  query('status').optional({ checkFalsy: true }).isIn(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']),
  validate,
];

const decideValidators = [
  body('status').notEmpty().isIn(['APPROVED', 'REJECTED']).withMessage('status must be APPROVED or REJECTED'),
  body('note').optional({ checkFalsy: true }).isString().isLength({ max: 500 }),
  validate,
];

module.exports = { applyLeaveValidators, listMyLeavesValidators, decideValidators };
