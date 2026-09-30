const { query, param } = require('express-validator');
const { validate } = require('./_validateShared');
const { MODULES } = require('../services/search.service');

const globalSearchValidators = [
  query('q').optional({ checkFalsy: true }).isString().isLength({ max: 200 }),
  query('limit').optional({ checkFalsy: true }).isInt({ min: 1, max: 20 }),
  validate,
];

const searchModuleValidators = [
  param('module').isIn(MODULES).withMessage(`module must be one of: ${MODULES.join(', ')}`),
  query('q').optional({ checkFalsy: true }).isString().isLength({ max: 200 }),
  query('page').optional({ checkFalsy: true }).isInt({ min: 1 }),
  query('limit').optional({ checkFalsy: true }).isInt({ min: 1, max: 50 }),
  validate,
];

module.exports = { globalSearchValidators, searchModuleValidators };