import { Router } from 'express';
import { validateBody } from '../middleware/validate.js';
import { doctorSignupBody, doctorLoginBody } from '../validation/schemas.js';
import { doctorSignup, doctorLogin, approveDoctorByEmail } from '../services/doctorAuthService.js';
import { signToken } from '../services/jwtService.js';
import { setAuthCookie, clearAuthCookie } from '../services/cookieAuth.js';

/**
 * Doctor auth: email + password only (no OTP).
 * Mounted at /auth so paths are:
 *   POST /auth/doctor/signup
 *   POST /auth/doctor/login
 */
const router = Router();

router.post('/signup', validateBody(doctorSignupBody), async (req, res) => {
  try {
    const { email, password, name, doctorId, phone, council, specialization } = req.body;
    const { user, pendingApproval } = await doctorSignup({
      email,
      password,
      name,
      doctorId,
      phone,
      council,
      specialization,
    });
    // No JWT/cookie until admin sets isActive — prevents dashboard access while pending
    clearAuthCookie(res);
    res.status(201).json({
      ok: true,
      pendingApproval: pendingApproval === true,
      message:
        'Verification pending. Your account was created and is awaiting approval. You can sign in once approved.',
      user,
    });
  } catch (e) {
    const status = e.status || 500;
    res.status(status).json({ error: e.message || 'Signup failed' });
  }
});

router.post('/login', validateBody(doctorLoginBody), async (req, res) => {
  try {
    const { email, password } = req.body;
    const { userId, sub, user } = await doctorLogin({ email, password });
    const token = signToken(sub, userId);
    setAuthCookie(res, token);
    res.json({
      ok: true,
      message: 'Logged in',
      token,
      tokenType: 'Bearer',
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      user,
    });
  } catch (e) {
    const status = e.status || 500;
    const body = { error: e.message || 'Login failed' };
    if (status === 403 && e.message && e.message.includes('awaiting approval')) {
      body.pendingApproval = true;
    }
    res.status(status).json(body);
  }
});

/**
 * POST /auth/doctor/approve — set isActive true (no cookie). Body: { email, secret }
 * secret must match env DOCTOR_APPROVE_SECRET. Use until you have a full admin UI.
 */
router.post('/approve', async (req, res) => {
  try {
    const { email, secret } = req.body || {};
    const expected = process.env.DOCTOR_APPROVE_SECRET;
    if (!expected || secret !== expected) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const user = await approveDoctorByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'Doctor not found' });
    }
    res.json({
      ok: true,
      message: 'Doctor approved—they can now log in; token will be set in HttpOnly cookie on login.',
      user,
    });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Approve failed' });
  }
});

export default router;
