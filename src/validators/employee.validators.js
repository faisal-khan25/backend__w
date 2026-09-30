const { body, query, param } = require('express-validator');
const { validate } = require('./_validateShared');
const { PASSWORD_REGEX, PASSWORD_MESSAGE } = require('./auth.validators');
const { User } = require('../models');

const listEmployeesValidators = [
  query('search').optional({ checkFalsy: true }).isString(),
  query('role').optional({ checkFalsy: true }).isIn(User.ROLES),
  query('department').optional({ checkFalsy: true }).isString(),
  query('isActive').optional({ checkFalsy: true }).isBoolean(),
  query('page').optional({ checkFalsy: true }).isInt({ min: 1 }),
  query('pageSize').optional({ checkFalsy: true }).isInt({ min: 1, max: 500 }),
  validate,
];

const createEmployeeValidators = [
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').optional({ checkFalsy: true }).isString(),
  body('email').notEmpty().withMessage('Email is required').isEmail().withMessage('Enter a valid email address'),
  body('role').notEmpty().withMessage('Role is required').isIn(User.ROLES).withMessage('Invalid role'),
  body('department').optional({ checkFalsy: true }).isString(),
  body('password').optional({ checkFalsy: true }).matches(PASSWORD_REGEX).withMessage(PASSWORD_MESSAGE),
  validate,
];

const updateEmployeeValidators = [
  param('id').notEmpty().isString(),
  body('firstName').optional({ checkFalsy: true }).isString(),
  body('lastName').optional({ checkFalsy: true }).isString(),
  body('department').optional({ checkFalsy: true }).isString(),
  body('role').optional({ checkFalsy: true }).isIn(User.ROLES).withMessage('Invalid role'),
  body('isActive').optional().isBoolean(),
  validate,
];

module.exports = { listEmployeesValidators, createEmployeeValidators, updateEmployeeValidators };
