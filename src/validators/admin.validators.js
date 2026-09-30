const { body, query, param } = require('express-validator');
const { validate } = require('./_validateShared');
const Task = require('../models/task.model');
const Document = require('../models/document.model');
const Attendance = require('../models/attendance.model');

const adminListTasksValidators = [
  query('status').optional({ checkFalsy: true }).isIn(Task.STATUSES),
  query('priority').optional({ checkFalsy: true }).isIn(Task.PRIORITIES),
  query('dueFrom').optional({ checkFalsy: true }).isISO8601(),
  query('dueTo').optional({ checkFalsy: true }).isISO8601(),
  query('sort').optional({ checkFalsy: true }).isIn(['newest', 'due_date', 'priority', 'status']),
  query('page').optional({ checkFalsy: true }).isInt({ min: 1 }),
  query('pageSize').optional({ checkFalsy: true }).isInt({ min: 1, max: 200 }),
  validate,
];

const adminCreateTaskValidators = [
  body('title').notEmpty().withMessage('title is required').isString().isLength({ max: 200 }),
  body('description').optional({ checkFalsy: true }).isString().isLength({ max: 2000 }),
  body('assignedTo')
    .custom((value) => {
      if (Array.isArray(value)) return value.length > 0;
      return typeof value === 'string' && value.length > 0;
    })
    .withMessage('assignedTo is required (a single employee id or an array of employee ids)'),
  body('priority').optional({ checkFalsy: true }).isIn(Task.PRIORITIES),
  body('status').optional({ checkFalsy: true }).isIn(Task.STATUSES),
  body('startDate').optional({ checkFalsy: true }).isISO8601(),
  body('dueDate').optional({ checkFalsy: true }).isISO8601(),
  body('instructions').optional({ checkFalsy: true }).isString().isLength({ max: 2000 }),
  validate,
];

const adminUpdateTaskValidators = [
  body('title').optional({ checkFalsy: true }).isString().isLength({ max: 200 }),
  body('description').optional({ checkFalsy: true }).isString().isLength({ max: 2000 }),
  body('assignedTo').optional({ checkFalsy: true }).isString(),
  body('priority').optional({ checkFalsy: true }).isIn(Task.PRIORITIES),
  body('status').optional({ checkFalsy: true }).isIn(Task.STATUSES),
  body('startDate').optional({ checkFalsy: true }).isISO8601(),
  body('dueDate').optional({ checkFalsy: true }).isISO8601(),
  body('progress').optional({ checkFalsy: false }).isInt({ min: 0, max: 100 }),
  body('instructions').optional({ checkFalsy: true }).isString().isLength({ max: 2000 }),
  validate,
];

const adminReassignTaskValidators = [
  body('assignedTo').notEmpty().withMessage('assignedTo is required').isString(),
  body('note').optional({ checkFalsy: true }).isString().isLength({ max: 2000 }),
  validate,
];

const addCommentValidators = [
  body('message').notEmpty().withMessage('message is required').isString().isLength({ max: 2000 }),
  validate,
];

const adminListAttendanceValidators = [
  query('date').optional({ checkFalsy: true }).isISO8601(),
  query('from').optional({ checkFalsy: true }).isISO8601(),
  query('to').optional({ checkFalsy: true }).isISO8601(),
  query('status').optional({ checkFalsy: true }).isIn(Attendance.STATUSES),
  query('page').optional({ checkFalsy: true }).isInt({ min: 1 }),
  query('pageSize').optional({ checkFalsy: true }).isInt({ min: 1, max: 500 }),
  validate,
];

const adminAttendanceSummaryValidators = [
  query('date').optional({ checkFalsy: true }).isISO8601(),
  validate,
];

const adminEmployeeHistoryValidators = [
  param('userId').notEmpty().isString(),
  query('month').optional({ checkFalsy: true }).isInt({ min: 1, max: 12 }),
  query('year').optional({ checkFalsy: true }).isInt({ min: 2000, max: 2100 }),
  query('from').optional({ checkFalsy: true }).isISO8601(),
  query('to').optional({ checkFalsy: true }).isISO8601(),
  validate,
];

const adminListDocumentsValidators = [
  query('category').optional({ checkFalsy: true }).isIn(Document.CATEGORIES),
  query('status').optional({ checkFalsy: true }).isIn(Document.APPROVAL_STATUSES),
  query('page').optional({ checkFalsy: true }).isInt({ min: 1 }),
  query('pageSize').optional({ checkFalsy: true }).isInt({ min: 1, max: 200 }),
  validate,
];

const reviewDocumentValidators = [
  body('status').notEmpty().isIn(['APPROVED', 'REJECTED']).withMessage('status must be APPROVED or REJECTED'),
  body('rejectionReason').optional({ checkFalsy: true }).isString().isLength({ max: 500 }),
  validate,
];

module.exports = {
  adminListTasksValidators,
  adminCreateTaskValidators,
  adminUpdateTaskValidators,
  adminReassignTaskValidators,
  addCommentValidators,
  adminListAttendanceValidators,
  adminAttendanceSummaryValidators,
  adminEmployeeHistoryValidators,
  adminListDocumentsValidators,
  reviewDocumentValidators,
};