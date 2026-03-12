import { Router } from 'express';
import { validateBody } from '../../middleware/middleware/validate.js';
import { doctorSignupBody, doctorLoginBody } from '../validation/schemas.js';
import { doctorSignup, doctorLogin } from '../services/doctorAuthService.js';
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
    const { email, password, name, doctorId } = req.body;
    const { userId, sub, user, pendingApproval } = await doctorSignup({
      email,
      password,
      name,
      doctorId,
    });
    // No JWT/cookie until approved (isActive true)
    if (pendingApproval) {
      clearAuthCookie(res);
      return res.status(201).json({
        ok: true,
        pendingApproval: true,
        message:
          'Account created. Verification pending—wait for approval. You can sign in once your account is activated.',
        user,
      });
    }
    const token = signToken(sub, userId);
    setAuthCookie(res, token);
    res.status(201).json({
      ok: true,
      message: 'Doctor account created',
      token,
      tokenType: 'Bearer',
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
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
    // doctorLogin throws 403 if !isActive — only reached when active
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
    if (status === 403) {
      clearAuthCookie(res);
    }
    res.status(status).json({ error: e.message || 'Login failed' });
  }
});

export default router;
