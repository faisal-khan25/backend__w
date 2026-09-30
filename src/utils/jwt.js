const jwt = require('jsonwebtoken');
const ApiError = require('./ApiError');

const TokenType = Object.freeze({
  ACCESS: 'ACCESS',
  REFRESH: 'REFRESH',
  RESET_PASSWORD: 'RESET_PASSWORD',
});

const SECRET = process.env.JWT_SECRET;
const ACCESS_EXP_MS = Number(process.env.JWT_ACCESS_EXP_MS || 900000);
const REFRESH_EXP_MS = Number(process.env.JWT_REFRESH_EXP_MS || 604800000);
const RESET_EXP_MS = 5 * 60 * 1000;

function buildToken(subject, claims, expirationMs) {
  return jwt.sign(claims, SECRET, {
    subject,
    expiresIn: Math.floor(expirationMs / 1000),
  });
}

function generateAccessToken(userId, email, role) {
  return buildToken(userId, { email, role, type: TokenType.ACCESS }, ACCESS_EXP_MS);
}

function generateRefreshToken(userId) {
  return buildToken(userId, { type: TokenType.REFRESH }, REFRESH_EXP_MS);
}

function generateResetToken(email) {
  return buildToken(email, { type: TokenType.RESET_PASSWORD }, RESET_EXP_MS);
}

function parseClaims(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Token has expired');
    }
    throw new ApiError(401, 'Invalid token');
  }
}

function isTokenType(claims, expected) {
  return claims && claims.type === expected;
}

module.exports = {
  TokenType,
  generateAccessToken,
  generateRefreshToken,
  generateResetToken,
  parseClaims,
  isTokenType,
};
