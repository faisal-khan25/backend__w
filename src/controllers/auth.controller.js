const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/auth.service');
const toUserResponse = require('../utils/toUserResponse');

const signup = asyncHandler(async (req, res) => {
  const result = await authService.signup(req.body);
  res.status(201).json(result);
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  res.status(200).json(result);
});

const firebaseRegister = asyncHandler(async (req, res) => {
  const result = await authService.firebaseRegister(req.body);
  res.status(201).json(result);
});

const firebaseLogin = asyncHandler(async (req, res) => {
  const result = await authService.firebaseLogin(req.body);
  res.status(200).json(result);
});

const refreshToken = asyncHandler(async (req, res) => {
  const result = await authService.refreshToken(req.body.refreshToken);
  res.status(200).json(result);
});

const forgotPassword = asyncHandler(async (req, res) => {
  await authService.forgotPassword(req.body.email);
  res.status(200).json({
    success: true,
    message: 'If an account exists for this email, a verification code has been sent.',
  });
});

const verifyOtp = asyncHandler(async (req, res) => {
  const result = await authService.verifyOtp(req.body.email, req.body.otp);
  res.status(200).json(result);
});

const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body);
  res.status(200).json({ success: true, message: 'Password reset successfully. Please log in.' });
});


const me = asyncHandler(async (req, res) => {
  res.status(200).json({ user: toUserResponse(req.user) });
});

module.exports = {
  signup,
  login,
  firebaseRegister,
  firebaseLogin,
  refreshToken,
  forgotPassword,
  verifyOtp,
  resetPassword,
  me,
};
