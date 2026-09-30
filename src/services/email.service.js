const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT || 587),
    secure: Number(process.env.MAIL_PORT) === 465,
    auth: process.env.MAIL_USERNAME
      ? {
          user: process.env.MAIL_USERNAME,
          pass: process.env.MAIL_PASSWORD,
        }
      : undefined,
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production',
    },
  });

  return transporter;
}

function getSenderAddress(displayName) {
  const username = process.env.MAIL_USERNAME;
  if (!username) return undefined;
  const name = displayName || process.env.MAIL_FROM_NAME || 'Union Workspace';
  return `"${name}" <${username}>`;
}

async function sendOtpEmail(toEmail, otp) {
  if (!process.env.MAIL_USERNAME) {
    console.warn('[email.service] MAIL_USERNAME is not set - skipping OTP email send (set MAIL_USERNAME + MAIL_PASSWORD in .env to enable)');
    return;
  }
  try {
    await getTransporter().sendMail({
      from: getSenderAddress('Union Workspace'),
      to: toEmail,
      subject: 'Your password reset code',
      text:
        `Your one-time verification code is: ${otp}\n\n` +
        "This code expires in 5 minutes. If you didn't request this, you can ignore this email.",
    });
  } catch (err) {
    console.warn(`[email.service] Failed to send OTP email to ${toEmail}: ${err.message}`);
  }
}

async function sendWelcomeEmail(toEmail, { name, tempPassword }) {
  if (!process.env.MAIL_USERNAME) {
    console.warn('[email.service] MAIL_USERNAME is not set - skipping welcome email send');
    return;
  }
  try {
    await getTransporter().sendMail({
      from: getSenderAddress('Union Workspace'),
      to: toEmail,
      subject: 'Welcome to Union Workspace',
      text:
        `Hi ${name},\n\n` +
        'An account has been created for you on Union Workspace.\n\n' +
        `Email: ${toEmail}\n` +
        `Temporary password: ${tempPassword}\n\n` +
        'Please log in and change your password as soon as possible.',
    });
  } catch (err) {
    console.warn(`[email.service] Failed to send welcome email to ${toEmail}: ${err.message}`);
  }
}

module.exports = { sendOtpEmail, sendWelcomeEmail, getSenderAddress, getTransporter };
