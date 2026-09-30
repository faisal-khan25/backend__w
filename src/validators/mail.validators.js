const { body, query } = require('express-validator');
const { validate } = require('./_validateShared');

const listMailValidators = [
  query('folder').optional({ checkFalsy: true }).isIn(['inbox', 'sent', 'drafts', 'starred', 'spam', 'trash']),
  query('page').optional({ checkFalsy: true }).isInt({ min: 1 }),
  query('pageSize').optional({ checkFalsy: true }).isInt({ min: 1, max: 100 }),
  validate,
];

const composeMessageValidators = [
  body('subject').optional({ checkFalsy: true }).isString().isLength({ max: 300 }),
  body('bodyText').optional({ checkFalsy: true }).isString(),
  body('isDraft').optional().isBoolean().toBoolean(),
  validate,
];

const updateDraftValidators = [
  body('subject').optional({ checkFalsy: true }).isString().isLength({ max: 300 }),
  body('bodyText').optional({ checkFalsy: true }).isString(),
  body('isDraft').optional().isBoolean().toBoolean(),
  validate,
];

const setFlagsValidators = [
  body('isRead').optional().isBoolean().toBoolean(),
  body('isStarred').optional().isBoolean().toBoolean(),
  validate,
];

module.exports = {
  listMailValidators,
  composeMessageValidators,
  updateDraftValidators,
  setFlagsValidators,
};