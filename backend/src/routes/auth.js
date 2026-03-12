import { Router } from 'express';
import { validateBody } from '../middleware/validate.js';
import { sendOtpBody, verifyOtpBody } from '../validation/schemas.js';
import { sendOtp, verifyOtp } from '../services/otpService.js';
import doctorAuthRouter from './doctorAuth.js';
import { signToken } from '../services/jwtService.js';
import { upsertUserByPhone, findUserByPhone, findUserById } from '../services/userService.js';
import { requireAuth } from '../middleware/auth.js';
import { setAuthCookie, clearAuthCookie } from '../services/cookieAuth.js';
import { User } from '../models/User.js';
const router = Router();

/** Doctor email/password auth — no OTP */
router.use('/doctor', doctorAuthRouter);

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
    await User.create({ phone, name, role: 'patient' });
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
    setAuthCookie(res, token);
    const role = user.role === 'doctor' ? 'doctor' : 'patient';
    res.json({
      ok: true,
      message: 'Verified',
      token,
      tokenType: 'Bearer',
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      user: {
        id: user.id,
        phone: user.phone,
        role,
        createdAt: user.createdAt,
      },
    });
  } catch (e) {
    const status = e.status || 500;
    res.status(status).json({
      error: e.message || 'Verification failed',
    });
  }
});

/**
 * POST /auth/logout — clears HttpOnly auth cookie
 */
router.post('/logout', (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true, message: 'Logged out' });
});

/**
 * GET /auth/me — requires Cookie access_token or Authorization: Bearer <token>
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    let user = null;
    if (req.user.userId) {
      user = await findUserById(req.user.userId);
    }
    if (!user && req.user.sub) {
      user = await findUserByPhone(req.user.sub);
    }
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    // Doctor not yet approved — no valid session until isActive true; clear stale cookie
    if (user.role === 'doctor' && user.isActive === false) {
      clearAuthCookie(res);
      return res.status(403).json({
        error:
          'Verification pending. Your account is awaiting approval—please wait before signing in.',
        pendingApproval: true,
      });
    }
    res.json({ user });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Failed to load user' });
  }
});

export default router;
