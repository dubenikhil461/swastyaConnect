import { Router } from 'express';
import { validateBody } from '../middleware/validate.js';
import {
  sendOtpBody,
  doctorSendOtpBody,
  doctorVerifyOtpBody,
  pharmacySendOtpBody,
  pharmacyVerifyOtpBody,
  verifyOtpBody,
} from '../validation/schemas.js';
import { sendOtp, verifyOtp } from '../services/otpService.js';
import { sendDoctorOtp, verifyDoctorOtp } from '../services/doctorOtpService.js';
import { sendPharmacyOtp, verifyPharmacyOtp } from '../services/pharmacyOtpService.js';
import { signToken } from '../services/jwtService.js';
import { upsertUserByPhone, findUserByPhone } from '../services/userService.js';
import { requireAuth } from '../middleware/auth.js';
import { User } from '../models/User.js';
const router = Router();

/**
 * POST /auth/send-otp
 * Body: { "phone": "+15551234567" } or "5551234567"
 */
router.post('/send-otp', validateBody(sendOtpBody), async (req, res) => {
  try {
    const { phone, name } = req.body;
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists With this phone number' });
    }
    await sendOtp(phone);
    await User.create({ phone, name });
    res.json({
      ok: true,
      message: 'OTP sent to your mobile number',
    });
  } catch (e) {
    const status = e.status || 500;
    res.status(status).json({
      error: e.message || 'Failed to send OTP',
    });
  }
});

/**
 * POST /auth/doctor/send-otp
 * Body: { "doctorId": "...", "name": "...", "phone": "+1..." }
 * Sends OTP; user is created only after doctor/verify-otp.
 */
router.post('/doctor/send-otp', validateBody(doctorSendOtpBody), async (req, res) => {
  try {
    const { doctorId, name, phone } = req.body;
    await sendDoctorOtp({ doctorId, name, phone });
    res.json({
      ok: true,
      message: 'OTP sent. Please verify the OTP to complete signup.',
    });
  } catch (e) {
    const status = e.status || 500;
    res.status(status).json({
      error: e.message || 'Failed to send OTP',
    });
  }
});

/**
 * POST /auth/doctor/verify-otp
 * Body: { "phone": "...", "code": "123456" }
 * Creates doctor user (isActive false) and returns JWT after OTP approval.
 */
router.post('/doctor/verify-otp', validateBody(doctorVerifyOtpBody), async (req, res) => {
  try {
    const { phone, code } = req.body;
    const { to, user, userId } = await verifyDoctorOtp(phone, code);
    const token = signToken(to, userId);
    res.json({
      ok: true,
      message: 'Verified. Awaiting admin approval before full access.',
      token,
      tokenType: 'Bearer',
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      user,
    });
  } catch (e) {
    const status = e.status || 500;
    res.status(status).json({
      error: e.message || 'Verification failed',
    });
  }
});

/**
 * POST /auth/pharmacy/send-otp
 * Body: { "pharmacyId": "...", "name": "...", "phone": "+1..." }
 * Sends OTP; user is created only after pharmacy/verify-otp.
 */
router.post('/pharmacy/send-otp', validateBody(pharmacySendOtpBody), async (req, res) => {
  try {
    const { pharmacyId, name, phone } = req.body;
    await sendPharmacyOtp({ pharmacyId, name, phone });
    res.json({
      ok: true,
      message: 'OTP sent. Please verify the OTP to complete signup.',
    });
  } catch (e) {
    const status = e.status || 500;
    res.status(status).json({
      error: e.message || 'Failed to send OTP',
    });
  }
});

/**
 * POST /auth/pharmacy/verify-otp
 * Body: { "phone": "...", "code": "123456" }
 * Creates pharmacy user (isActive false) and returns JWT after OTP approval.
 */
router.post('/pharmacy/verify-otp', validateBody(pharmacyVerifyOtpBody), async (req, res) => {
  try {
    const { phone, code } = req.body;
    const { to, user, userId } = await verifyPharmacyOtp(phone, code);
    const token = signToken(to, userId);
    res.json({
      ok: true,
      message: 'Verified. Awaiting admin approval',
      token,
      tokenType: 'Bearer',
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      user,
    });
  } catch (e) {
    const status = e.status || 500;
    res.status(status).json({
      error: e.message || 'Verification failed',
    });
  }
});

/**
 * POST /auth/verify-otp
 * Body: { "phone": "...", "code": "123456" }
 * Returns JWT for persistent sessions.
 */
router.post('/verify-otp', validateBody(verifyOtpBody), async (req, res) => {
  try {
    const { phone, code } = req.body;
    const { to } = await verifyOtp(phone, code);
    const user = await upsertUserByPhone(to);
    const token = signToken(to, user.id);
    res.json({
      ok: true,
      message: 'Verified',
      token,
      tokenType: 'Bearer',
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      user: { id: user.id, phone: user.phone, createdAt: user.createdAt },
    });
  } catch (e) {
    const status = e.status || 500;
    res.status(status).json({
      error: e.message || 'Verification failed',
    });
  }
});

/**
 * GET /auth/me — requires Authorization: Bearer <token>
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await findUserByPhone(req.user.sub);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Failed to load user' });
  }
});

export default router;
