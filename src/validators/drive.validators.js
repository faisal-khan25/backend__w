const { body, query } = require('express-validator');
const { validate } = require('./_validateShared');

const listDriveValidators = [
  query('parentId').optional({ checkFalsy: true }).isString(),
  query('view').optional({ checkFalsy: true }).isIn(['all', 'starred', 'trash']),
  query('search').optional({ checkFalsy: true }).isString(),
  validate,
];

const createFolderValidators = [
  body('name').isString().trim().isLength({ min: 1, max: 255 }),
  body('parentId').optional({ checkFalsy: true }).isString(),
  validate,
];

const renameItemValidators = [
  body('name').isString().trim().isLength({ min: 1, max: 255 }),
  validate,
];

const moveItemValidators = [
  body('parentId').optional({ nullable: true }).isString(),
  validate,
];

const setFlagsValidators = [
  body('isStarred').optional().isBoolean().toBoolean(),
  validate,
];

module.exports = {
  listDriveValidators,
  createFolderValidators,
  renameItemValidators,
  moveItemValidators,
  setFlagsValidators,
};