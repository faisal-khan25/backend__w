const bcrypt = require('bcryptjs');
const { User } = require('../models');
const ApiError = require('../utils/ApiError');
const toUserResponse = require('../utils/toUserResponse');
const otpService = require('./otp.service');
const { verifyFirebaseToken } = require('../config/firebaseAdmin');
const { generateAccessToken, generateRefreshToken, generateResetToken, parseClaims, isTokenType, TokenType } = require('../utils/jwt');

function issueTokens(user) {
  return {
    token: generateAccessToken(user.id, user.email, user.role),
    refreshToken: generateRefreshToken(user.id),
    user: toUserResponse(user),
  };
}


async function signup({ firstName, lastName, email, password, confirmPassword, department }) {
  if (password !== confirmPassword) {
    throw ApiError.passwordMismatch();
  }

  const existing = await User.findOne({ where: { email: email.toLowerCase() } });
  if (existing) {
    throw ApiError.emailAlreadyExists();
  }

  const user = await User.create({
    firstName,
    lastName,
    email: email.toLowerCase(),
    password: await bcrypt.hash(password, 10),
    role: 'EMPLOYEE',
    department,
    isActive: true,
  });

  return issueTokens(user);
}


async function login({ email, password }) {
  const user = await User.findOne({ where: { email: email.toLowerCase() } });
  if (!user) {
    throw ApiError.invalidCredentials();
  }

  const matches = await bcrypt.compare(password, user.password);
  if (!matches) {
    throw ApiError.invalidCredentials();
  }

  
  if (!user.isActive) {
    throw ApiError.accountInactive();
  }

  return issueTokens(user);
}


async function refreshToken(token) {
  const claims = parseClaims(token);
  if (!isTokenType(claims, TokenType.REFRESH)) {
    throw ApiError.invalidToken('Not a valid refresh token');
  }

  const user = await User.findByPk(claims.sub);
  if (!user) {
    throw ApiError.invalidToken('User no longer exists');
  }
  if (!user.isActive) {
    throw ApiError.invalidToken('Account is deactivated');
  }

  return issueTokens(user);
}


async function resolveFirebaseUser(idToken, profile = {}) {
  const decoded = await verifyFirebaseToken(idToken);
  const { uid, email, name } = decoded;

  if (!email) {
    
    throw ApiError.invalidToken('This Firebase account has no email address associated with it');
  }
  const normalizedEmail = email.toLowerCase();

  
  let user = await User.findOne({ where: { firebaseUid: uid } });
  if (!user) {
    user = await User.findOne({ where: { email: normalizedEmail } });
  }

  if (user) {
    if (!user.firebaseUid) {
      user.firebaseUid = uid;
      await user.save();
    }
  } else {
    const [firstNameFromToken, ...restOfName] = (name || '').trim().split(/\s+/).filter(Boolean);

    user = await User.create({
      firstName: profile.firstName || firstNameFromToken || normalizedEmail.split('@')[0],
      lastName: profile.lastName || restOfName.join(' ') || null,
      email: normalizedEmail,
      password: null, 
      role: 'EMPLOYEE', 
      department: profile.department || null,
      firebaseUid: uid,
      isActive: true,
    });
  }

  
  if (!user.isActive) {
    throw ApiError.accountInactive();
  }

  return issueTokens(user);
}


async function firebaseRegister({ idToken, firstName, lastName, department }) {
  return resolveFirebaseUser(idToken, { firstName, lastName, department });
}


async function firebaseLogin({ idToken }) {
  return resolveFirebaseUser(idToken);
}


async function forgotPassword(email) {
  const user = await User.findOne({ where: { email: email.toLowerCase() } });
  if (user) {
    await otpService.generateAndSendOtp(email);
  }
}


async function verifyOtp(email, otp) {
  await otpService.verifyOtp(email, otp);
  const resetToken = generateResetToken(email.toLowerCase());
  return { success: true, message: 'Code verified', resetToken };
}


async function resetPassword({ resetToken, newPassword, confirmPassword }) {
  if (newPassword !== confirmPassword) {
    throw ApiError.passwordMismatch();
  }

  const claims = parseClaims(resetToken);
  if (!isTokenType(claims, TokenType.RESET_PASSWORD)) {
    throw ApiError.invalidToken('Invalid or expired reset session. Please verify the code again');
  }
  const email = claims.sub;

  await otpService.assertRecentlyVerified(email);

  const user = await User.findOne({ where: { email: email.toLowerCase() } });
  if (!user) {
    throw ApiError.userNotFound();
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  await otpService.clearOtp(email);
}

module.exports = {
  signup,
  login,
  firebaseRegister,
  firebaseLogin,
  refreshToken,
  forgotPassword,
  verifyOtp,
  resetPassword,
};
