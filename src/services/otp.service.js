const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { PasswordResetOtp } = require('../models');
const ApiError = require('../utils/ApiError');
const { sendOtpEmail } = require('./email.service');

const EXPIRY_MINUTES = Number(process.env.OTP_EXPIRY_MINUTES || 5);
const MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS || 5);
const RESEND_COOLDOWN_SECONDS = Number(process.env.OTP_RESEND_COOLDOWN_SECONDS || 60);

function mostRecentForEmail(email) {
  return PasswordResetOtp.findOne({
    where: { email: email.toLowerCase() },
    order: [['createdAt', 'DESC']],
  });
}

async function generateAndSendOtp(email) {
  const existing = await mostRecentForEmail(email);

  if (existing) {
    const cooldownEnds = new Date(existing.createdAt.getTime() + RESEND_COOLDOWN_SECONDS * 1000);
    if (new Date() < cooldownEnds) {
      const secondsLeft = Math.ceil((cooldownEnds.getTime() - Date.now()) / 1000);
      throw ApiError.rateLimited(`Please wait ${secondsLeft}s before requesting another code`);
    }
  }

  const otp = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');

  await PasswordResetOtp.create({
    email: email.toLowerCase(),
    otpHash: await bcrypt.hash(otp, 10),
    expiryTime: new Date(Date.now() + EXPIRY_MINUTES * 60 * 1000),
    attempts: 0,
    verified: false,
    createdAt: new Date(),
  });

  await sendOtpEmail(email, otp);
}

async function verifyOtp(email, otp) {
  const record = await mostRecentForEmail(email);
  if (!record) {
    throw ApiError.invalidOtp('No verification code found for this email. Please request a new one');
  }

  if (record.verified) {
    throw ApiError.invalidOtp('This code has already been used. Please request a new one');
  }

  if (new Date() > record.expiryTime) {
    throw ApiError.otpExpired();
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    throw ApiError.tooManyAttempts();
  }

  const matches = await bcrypt.compare(otp, record.otpHash);
  if (!matches) {
    record.attempts += 1;
    await record.save();
    throw ApiError.invalidOtp(`Incorrect code. ${MAX_ATTEMPTS - record.attempts} attempt(s) remaining`);
  }

  record.verified = true;
  await record.save();
}

async function assertRecentlyVerified(email) {
  const record = await mostRecentForEmail(email);
  if (!record || !record.verified) {
    throw ApiError.invalidOtp('Verification required before resetting password');
  }
}

async function clearOtp(email) {
  await PasswordResetOtp.destroy({ where: { email: email.toLowerCase() } });
}

module.exports = {
  generateAndSendOtp,
  verifyOtp,
  assertRecentlyVerified,
  clearOtp,
};
