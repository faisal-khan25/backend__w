const { body } = require('express-validator');
const { validate } = require('./_validateShared');

const demoRequestValidators = [
  body('name').notEmpty().withMessage('Name is required').isLength({ max: 120 }),
  body('workEmail')
    .notEmpty()
    .withMessage('Work email is required')
    .isEmail()
    .withMessage('Work email must be a valid email address')
    .isLength({ max: 160 }),
  body('company').notEmpty().withMessage('Company is required').isLength({ max: 160 }),
  body('companySize').optional({ checkFalsy: true }).isLength({ max: 40 }),
  body('message').optional({ checkFalsy: true }).isLength({ max: 2000 }),
  validate,
];

module.exports = { demoRequestValidators };
