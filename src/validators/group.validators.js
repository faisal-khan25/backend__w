const { body, param, query } = require('express-validator');
const { validate } = require('./_validateShared');
const GroupMember = require('../models/groupMember.model');
const GroupMessage = require('../models/groupMessage.model');

const groupIdParam = param('groupId')
  .isUUID(4)
  .withMessage('A valid group ID is required');

const createGroupValidators = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Group name is required')
    .isLength({ max: 150 })
    .withMessage('Group name must be 150 characters or fewer'),
  body('description')
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 1000 })
    .withMessage('Description must be 1000 characters or fewer'),
  body('icon').optional({ nullable: true }).isString().isLength({ max: 500 }),
  body('memberIds')
    .optional()
    .isArray()
    .withMessage('memberIds must be an array of user IDs'),
  body('memberIds.*')
    .optional()
    .isUUID(4)
    .withMessage('Each member ID must be a valid user ID'),
  validate,
];

const updateGroupValidators = [
  groupIdParam,
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Group name cannot be empty')
    .isLength({ max: 150 }),
  body('description').optional({ nullable: true }).isString().isLength({ max: 1000 }),
  body('icon').optional({ nullable: true }).isString().isLength({ max: 500 }),
  validate,
];

const groupIdValidators = [groupIdParam, validate];

const addMembersValidators = [
  groupIdParam,
  body('memberIds')
    .isArray({ min: 1 })
    .withMessage('At least one member must be selected'),
  body('memberIds.*').isUUID(4).withMessage('Each member ID must be a valid user ID'),
  validate,
];

const memberParamValidators = [
  groupIdParam,
  param('userId').isUUID(4).withMessage('A valid user ID is required'),
  validate,
];

const changeRoleValidators = [
  groupIdParam,
  param('userId').isUUID(4).withMessage('A valid user ID is required'),
  body('role')
    .isIn(GroupMember.ROLE_ENUM)
    .withMessage(`role must be one of: ${GroupMember.ROLES.join(', ')}`),
  validate,
];

const listMembersValidators = [
  groupIdParam,
  query('includeInactive')
    .optional({ checkFalsy: true })
    .isBoolean()
    .withMessage('includeInactive must be true or false'),
  validate,
];

const attachmentValidators = [
  groupIdParam,
  body('caption')
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 5000 })
    .withMessage('Caption must be 5000 characters or fewer'),
  validate,
];

const messageParamValidators = [
  groupIdParam,
  param('messageId').isUUID(4).withMessage('A valid message ID is required'),
  validate,
];

const searchPeopleValidators = [
  query('q').optional({ nullable: true }).isString().isLength({ max: 150 }),
  query('groupId')
    .optional({ checkFalsy: true })
    .isUUID(4)
    .withMessage('A valid group ID is required'),
  validate,
];

const sendMessageValidators = [
  groupIdParam,
  body('message')
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 5000 })
    .withMessage('Message must be 5000 characters or fewer'),
  body('messageType')
    .optional()
    .isIn(GroupMessage.TYPES.filter((t) => t !== 'SYSTEM'))
    .withMessage('Unsupported message type'),
  validate,
];

const listMessagesValidators = [
  groupIdParam,
  query('before').optional({ checkFalsy: true }).isISO8601().withMessage('before must be a valid timestamp'),
  query('limit').optional({ checkFalsy: true }).isInt({ min: 1, max: 100 }),
  validate,
];

module.exports = {
  createGroupValidators,
  updateGroupValidators,
  groupIdValidators,
  addMembersValidators,
  memberParamValidators,
  changeRoleValidators,
  sendMessageValidators,
  listMessagesValidators,
  listMembersValidators,
  attachmentValidators,
  messageParamValidators,
  searchPeopleValidators,
};
