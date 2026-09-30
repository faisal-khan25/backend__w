const { body, param } = require('express-validator');
const { validate } = require('./_validateShared');
const { PASSWORD_REGEX, PASSWORD_MESSAGE } = require('./auth.validators');
const { EmployeeProfile, EmployeeSkill } = require('../models');

const updateBasicInfoValidators = [
  body('firstName').optional({ checkFalsy: true }).isString().trim().notEmpty(),
  body('lastName').optional({ checkFalsy: true }).isString(),
  body('department').optional({ checkFalsy: true }).isString(),
  validate,
];

const updateProfileValidators = [
  body('designation').optional({ checkFalsy: true }).isString().isLength({ max: 120 }),
  body('workType').optional({ checkFalsy: true }).isIn(EmployeeProfile.WORK_TYPES),
  body('dateOfBirth').optional({ checkFalsy: true }).isISO8601(),
  body('gender').optional({ checkFalsy: true }).isIn(EmployeeProfile.GENDERS),
  body('bloodGroup').optional({ checkFalsy: true }).isString().isLength({ max: 5 }),
  body('maritalStatus').optional({ checkFalsy: true }).isIn(EmployeeProfile.MARITAL_STATUSES),
  body('personalEmail').optional({ checkFalsy: true }).isEmail(),
  body('personalPhone').optional({ checkFalsy: true }).isString().isLength({ max: 20 }),
  body('workPhone').optional({ checkFalsy: true }).isString().isLength({ max: 20 }),
  body('addressLine1').optional({ checkFalsy: true }).isString(),
  body('addressLine2').optional({ checkFalsy: true }).isString(),
  body('city').optional({ checkFalsy: true }).isString(),
  body('state').optional({ checkFalsy: true }).isString(),
  body('country').optional({ checkFalsy: true }).isString(),
  body('pincode').optional({ checkFalsy: true }).isString(),
  body('panNumber').optional({ checkFalsy: true }).isString().isLength({ max: 20 }),
  body('aadhaarNumber').optional({ checkFalsy: true }).isString().isLength({ max: 20 }),
  body('emergencyContact.name').optional({ checkFalsy: true }).isString(),
  body('emergencyContact.relation').optional({ checkFalsy: true }).isString(),
  body('emergencyContact.phone').optional({ checkFalsy: true }).isString(),
  body('emergencyContact.address').optional({ checkFalsy: true }).isString(),
  validate,
];

const changePasswordValidators = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').matches(PASSWORD_REGEX).withMessage(PASSWORD_MESSAGE),
  body('confirmPassword').custom((value, { req }) => value === req.body.newPassword)
    .withMessage('Passwords do not match'),
  validate,
];

const educationValidators = [
  body('degree').notEmpty().withMessage('Degree is required'),
  body('institution').notEmpty().withMessage('Institution is required'),
  body('fieldOfStudy').optional({ checkFalsy: true }).isString(),
  body('startYear').optional({ checkFalsy: true }).isInt({ min: 1950, max: 2100 }),
  body('endYear').optional({ checkFalsy: true }).isInt({ min: 1950, max: 2100 }),
  body('grade').optional({ checkFalsy: true }).isString(),
  validate,
];

const skillValidators = [
  body('skillName').notEmpty().withMessage('Skill name is required'),
  body('proficiency').optional({ checkFalsy: true }).isIn(EmployeeSkill.PROFICIENCY_LEVELS),
  validate,
];

const experienceValidators = [
  body('companyName').notEmpty().withMessage('Company name is required'),
  body('designation').notEmpty().withMessage('Designation is required'),
  body('startDate').notEmpty().isISO8601().withMessage('Valid start date is required'),
  body('endDate').optional({ checkFalsy: true }).isISO8601(),
  body('isCurrent').optional().isBoolean(),
  body('description').optional({ checkFalsy: true }).isString().isLength({ max: 1000 }),
  validate,
];

const idParamValidator = [param('id').notEmpty().isString(), validate];

module.exports = {
  updateBasicInfoValidators,
  updateProfileValidators,
  changePasswordValidators,
  educationValidators,
  skillValidators,
  experienceValidators,
  idParamValidator,
};
