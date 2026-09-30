const { body, query, param } = require('express-validator');
const { validate } = require('./_validateShared');
const { CalendarEvent } = require('../models');

const listEventsValidators = [
  query('from').optional({ checkFalsy: true }).isISO8601(),
  query('to').optional({ checkFalsy: true }).isISO8601(),
  query('eventType').optional({ checkFalsy: true }).isIn(CalendarEvent.EVENT_TYPES),
  query('employeeId').optional({ checkFalsy: true }).isString(),
  query('department').optional({ checkFalsy: true }).isString(),
  query('scope').optional({ checkFalsy: true }).isIn(['mine', 'team', 'org']),
  validate,
];

const createEventValidators = [
  body('title').notEmpty().withMessage('Title is required').isLength({ max: 200 }),
  body('description').optional({ checkFalsy: true }).isString(),
  body('eventType').optional({ checkFalsy: true }).isIn(CalendarEvent.EVENT_TYPES),
  body('visibility').optional({ checkFalsy: true }).isIn(CalendarEvent.VISIBILITIES),
  body('location').optional({ checkFalsy: true }).isString().isLength({ max: 255 }),
  body('startsAt').notEmpty().withMessage('startsAt is required').isISO8601(),
  body('endsAt').notEmpty().withMessage('endsAt is required').isISO8601(),
  body('allDay').optional().isBoolean(),
  body('color').optional({ checkFalsy: true }).isString().isLength({ max: 20 }),
  body('organizerId').optional({ checkFalsy: true }).isString(),
  body('participantIds').optional().isArray(),
  validate,
];

const updateEventValidators = [
  param('id').notEmpty().isString(),
  body('title').optional({ checkFalsy: true }).isLength({ max: 200 }),
  body('description').optional({ checkFalsy: true }).isString(),
  body('eventType').optional({ checkFalsy: true }).isIn(CalendarEvent.EVENT_TYPES),
  body('visibility').optional({ checkFalsy: true }).isIn(CalendarEvent.VISIBILITIES),
  body('status').optional({ checkFalsy: true }).isIn(CalendarEvent.STATUSES),
  body('location').optional({ checkFalsy: true }).isString().isLength({ max: 255 }),
  body('startsAt').optional({ checkFalsy: true }).isISO8601(),
  body('endsAt').optional({ checkFalsy: true }).isISO8601(),
  body('allDay').optional().isBoolean(),
  body('color').optional({ checkFalsy: true }).isString().isLength({ max: 20 }),
  validate,
];

const addParticipantsValidators = [
  param('id').notEmpty().isString(),
  body('participantIds').isArray({ min: 1 }).withMessage('participantIds must be a non-empty array'),
  validate,
];

const updateParticipantValidators = [
  param('id').notEmpty().isString(),
  param('participantId').notEmpty().isString(),
  body('status').notEmpty().isIn(['ACCEPTED', 'DECLINED', 'TENTATIVE']),
  validate,
];

const listHolidaysValidators = [
  query('year').optional({ checkFalsy: true }).isInt({ min: 2000, max: 2100 }),
  query('type').optional({ checkFalsy: true }).isString(),
  validate,
];

const listLeavesValidators = [
  query('from').optional({ checkFalsy: true }).isISO8601(),
  query('to').optional({ checkFalsy: true }).isISO8601(),
  validate,
];

const listBirthdaysValidators = [
  query('month').optional({ checkFalsy: true }).isInt({ min: 1, max: 12 }),
  validate,
];

module.exports = {
  listEventsValidators,
  createEventValidators,
  updateEventValidators,
  addParticipantsValidators,
  updateParticipantValidators,
  listHolidaysValidators,
  listLeavesValidators,
  listBirthdaysValidators,
};