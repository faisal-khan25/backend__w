const express = require('express');
const rateLimit = require('express-rate-limit');
const controller = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/requireAuth');
const {
  signupValidators,
  loginValidators,
  firebaseAuthValidators,
  refreshTokenValidators,
  forgotPasswordValidators,
  verifyOtpValidators,
  resetPasswordValidators,
} = require('../validators/auth.validators');

const router = express.Router();

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});

router.post('/signup', authRateLimiter, signupValidators, controller.signup);
router.post('/login', authRateLimiter, loginValidators, controller.login);


router.post('/firebase/register', authRateLimiter, firebaseAuthValidators, controller.firebaseRegister);
router.post('/firebase/login', authRateLimiter, firebaseAuthValidators, controller.firebaseLogin);

router.post('/refresh-token', refreshTokenValidators, controller.refreshToken);
router.post('/forgot-password', authRateLimiter, forgotPasswordValidators, controller.forgotPassword);
router.post('/verify-otp', authRateLimiter, verifyOtpValidators, controller.verifyOtp);
router.post('/reset-password', resetPasswordValidators, controller.resetPassword);


router.get('/me', requireAuth, controller.me);

module.exports = router;
