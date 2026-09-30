const { body } = require('express-validator');
const { validate } = require('./_validateShared');

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_\-+=]).{8,}$/;
const PASSWORD_MESSAGE =
  'Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character';

const signupValidators = [
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').optional({ checkFalsy: true }).isString(),
  body('email').notEmpty().withMessage('Email is required').isEmail().withMessage('Enter a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .matches(PASSWORD_REGEX)
    .withMessage(PASSWORD_MESSAGE),
  body('confirmPassword').notEmpty().withMessage('Please confirm your password'),
  body('department').optional({ checkFalsy: true }).isString(),
  validate,
];

const loginValidators = [
  body('email').notEmpty().withMessage('Email is required').isEmail().withMessage('Enter a valid email address'),
  body('password').notEmpty().withMessage('Password is required'),
  validate,
];

const firebaseAuthValidators = [
  body('idToken').notEmpty().withMessage('Firebase ID token is required').isString(),
  body('firstName').optional({ checkFalsy: true }).isString(),
  body('lastName').optional({ checkFalsy: true }).isString(),
  body('department').optional({ checkFalsy: true }).isString(),
  validate,
];

const refreshTokenValidators = [
  body('refreshToken').notEmpty().withMessage('Refresh token is required'),
  validate,
];

const forgotPasswordValidators = [
  body('email').notEmpty().withMessage('Email is required').isEmail().withMessage('Enter a valid email address'),
  validate,
];

const verifyOtpValidators = [
  body('email').notEmpty().withMessage('Email is required').isEmail().withMessage('Enter a valid email address'),
  body('otp').notEmpty().withMessage('OTP is required').matches(/^\d{6}$/).withMessage('OTP must be 6 digits'),
  validate,
];

const resetPasswordValidators = [
  body('resetToken').notEmpty().withMessage('Reset token is required'),
  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .matches(PASSWORD_REGEX)
    .withMessage(PASSWORD_MESSAGE),
  body('confirmPassword').notEmpty().withMessage('Please confirm your new password'),
  validate,
];

module.exports = {
  signupValidators,
  loginValidators,
  firebaseAuthValidators,
  refreshTokenValidators,
  forgotPasswordValidators,
  verifyOtpValidators,
  resetPasswordValidators,
  PASSWORD_REGEX,
  PASSWORD_MESSAGE,
};
