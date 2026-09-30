const { body, query } = require('express-validator');
const { validate } = require('./_validateShared');
const Task = require('../models/task.model');

const createTaskValidators = [
  body('title').notEmpty().withMessage('title is required').isString().isLength({ max: 200 }),
  body('description').optional({ checkFalsy: true }).isString().isLength({ max: 2000 }),
  body('startDate').optional({ checkFalsy: true }).isISO8601().withMessage('startDate must be a valid date'),
  body('dueDate').optional({ checkFalsy: true }).isISO8601().withMessage('dueDate must be a valid date'),
  body('priority').optional({ checkFalsy: true }).isIn(Task.PRIORITIES),
  validate,
];

const updateTaskValidators = [
  body('title').optional({ checkFalsy: true }).isString().isLength({ max: 200 }),
  body('description').optional({ checkFalsy: true }).isString().isLength({ max: 2000 }),
  body('startDate').optional({ checkFalsy: true }).isISO8601().withMessage('startDate must be a valid date'),
  body('dueDate').optional({ checkFalsy: true }).isISO8601().withMessage('dueDate must be a valid date'),
  body('priority').optional({ checkFalsy: true }).isIn(Task.PRIORITIES),
  body('status').optional({ checkFalsy: true }).isIn(Task.STATUSES),
  body('progress').optional({ checkFalsy: false }).isInt({ min: 0, max: 100 }),
  validate,
];

const listMyTasksValidators = [
  query('status').optional({ checkFalsy: true }).isIn(Task.STATUSES),
  validate,
];

const updateStatusValidators = [
  body('status').notEmpty().isIn(Task.STATUSES).withMessage(`status must be one of: ${Task.STATUSES.join(', ')}`),
  validate,
];

const addCommentValidators = [
  body('message').notEmpty().withMessage('message is required').isString().isLength({ max: 2000 }),
  validate,
];

module.exports = {
  createTaskValidators,
  updateTaskValidators,
  listMyTasksValidators,
  updateStatusValidators,
  addCommentValidators,
};