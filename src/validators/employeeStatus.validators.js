const { body, param } = require('express-validator');
const { validate } = require('./_validateShared');
const { EmployeeStatus } = require('../models');

const setStatusValidators = [
  body('statusType')
    .exists({ checkFalsy: true }).withMessage('statusType is required')
    .isIn(EmployeeStatus.STATUS_TYPES)
    .withMessage(`statusType must be one of: ${EmployeeStatus.STATUS_TYPES.join(', ')}`),
  body('message')
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ max: 160 })
    .withMessage('message must be 160 characters or fewer'),
  body('startTime')
    .exists({ checkFalsy: true }).withMessage('startTime is required')
    .isISO8601().withMessage('startTime must be a valid date/time'),
  body('endTime')
    .exists({ checkFalsy: true }).withMessage('endTime is required')
    .isISO8601().withMessage('endTime must be a valid date/time'),
  validate,
];

const userIdParamValidators = [
  param('userId').isString().notEmpty().withMessage('userId is required'),
  validate,
];

const bulkStatusValidators = [
  body('userIds').isArray({ min: 1 }).withMessage('userIds must be a non-empty array'),
  body('userIds.*').isString(),
  validate,
];

module.exports = { setStatusValidators, userIdParamValidators, bulkStatusValidators };