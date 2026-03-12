import twilio from 'twilio';
import { config, assertTwilioConfig } from '../config.js';

const client = config.twilio.accountSid && config.twilio.authToken
  ? twilio(config.twilio.accountSid, config.twilio.authToken)
  : null;

// In-memory OTP store for SMS fallback (phone -> { code, expiresAt })
const otpStore = new Map();
const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const OTP_LENGTH = 6;

function normalizePhone(phone) {
  // JSON may send phone as number; Twilio needs E.164 string
  if (phone == null) return null;
  const s = String(phone).trim();
  if (!s) return null;
  const digits = s.replace(/\D/g, '');
  if (digits.length < 10) return null;
  // Assume E.164: if no country code, prefix +1 (adjust for your region)
  if (digits.length === 10) return `+1${digits}`;
  return `+${digits}`;
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Send OTP via Twilio Verify API (preferred) or SMS fallback.
 */
export async function sendOtp(phone) {
  assertTwilioConfig();
  const to = normalizePhone(phone);
  if (!to) {
    const err = new Error('Invalid phone number');
    err.status = 400;
    throw err;
  }

  // Twilio Verify — handles SMS + verification in one flow
  if (config.twilio.verifyServiceSid && client) {
    await client.verify.v2
      .services(config.twilio.verifyServiceSid)
      .verifications.create({ to, channel: 'sms' });
    return { to, method: 'verify' };
  }

  // Fallback: send custom OTP via SMS
  if (!config.twilio.phoneNumber) {
    const err = new Error(
      'Set TWILIO_VERIFY_SERVICE_SID or TWILIO_PHONE_NUMBER for SMS OTP'
    );
    err.status = 500;
    throw err;
  }

  const code = generateOtp();
  otpStore.set(to, { code, expiresAt: Date.now() + OTP_TTL_MS });

  await client.messages.create({
    body: `Your verification code is: ${code}. Valid for 5 minutes.`,
    from: config.twilio.phoneNumber,
    to,
  });

  return { to, method: 'sms' };
}

/**
 * Verify OTP — Twilio Verify check or in-memory match.
 */
export async function verifyOtp(phone, code) {
  assertTwilioConfig();
  const to = normalizePhone(phone);
  if (!to || !code) {
    const err = new Error('Phone and code are required');
    err.status = 400;
    throw err;
  }

  if (config.twilio.verifyServiceSid && client) {
    const check = await client.verify.v2
      .services(config.twilio.verifyServiceSid)
      .verificationChecks.create({ to, code: String(code).trim() });
    if (check.status !== 'approved') {
      const err = new Error('Invalid or expired code');
      err.status = 401;
      throw err;
    }
    return { to, verified: true };
  }

  const stored = otpStore.get(to);
  if (!stored || Date.now() > stored.expiresAt) {
    otpStore.delete(to);
    const err = new Error('Invalid or expired code');
    err.status = 401;
    throw err;
  }
  if (stored.code !== String(code).trim()) {
    const err = new Error('Invalid code');
    err.status = 401;
    throw err;
  }
  otpStore.delete(to);
  return { to, verified: true };
}
