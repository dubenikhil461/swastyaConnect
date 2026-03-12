import { Router } from 'express';
import { sendOtp, verifyOtp } from '../services/otpService.js';
import { signToken } from '../services/jwtService.js';
import { upsertUserByPhone, findUserByPhone } from '../services/userService.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

/**
 * POST /auth/send-otp
 * Body: { "phone": "+15551234567" } or "5551234567"
 */
router.post('/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'phone is required' });
    }
    await sendOtp(phone);
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
router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) {
      return res.status(400).json({ error: 'phone and code are required' });
    }
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
