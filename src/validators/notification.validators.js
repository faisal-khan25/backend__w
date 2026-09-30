const { body, query, param } = require('express-validator');
const { validate } = require('./_validateShared');
const { Notification } = require('../models');

const listMyValidators = [
  query('type').optional({ checkFalsy: true }).isIn(Notification.TYPES),
  query('unreadOnly').optional({ checkFalsy: true }).isBoolean(),
  query('page').optional({ checkFalsy: true }).isInt({ min: 1 }),
  query('pageSize').optional({ checkFalsy: true }).isInt({ min: 1, max: 100 }),
  validate,
];

const idParamValidator = [param('id').notEmpty().isString(), validate];

const broadcastValidators = [
  body('title').notEmpty().withMessage('Title is required').isLength({ max: 200 }),
  body('message').notEmpty().withMessage('Message is required').isLength({ max: 1000 }),
  validate,
];

module.exports = { listMyValidators, idParamValidator, broadcastValidators };
