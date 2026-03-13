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
import {
  getPendingDoctors,
  approveDoctorById,
  rejectDoctorById,
  listAllDoctors,
} from '../services/doctorAuthService.js';
import { createPanelPrescription, listPanelPrescriptions } from '../services/panelPrescriptionService.js';

const router = Router();

/** Admin secret for doctor approval routes (header: x-admin-secret), default 12345678 */
function requireAdminSecret(req, res, next) {
  const secret = req.headers['x-admin-secret'] || req.body?.secret;
  const expected = process.env.DOCTOR_APPROVE_SECRET || 'Admin1234567890';
  if (secret !== expected) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

/** Doctor email/password auth — no OTP */
router.use('/doctor', doctorAuthRouter);

/** Admin: list doctors pending approval. GET /auth/doctors/pending */
router.get('/doctors/pending', requireAdminSecret, async (_req, res) => {
  try {
    const pending = await getPendingDoctors();
    res.json({ count: pending.length, pending });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Failed to load pending doctors' });
  }
});

/** Admin: approve doctor by id. POST /auth/doctors/approve/:id */
router.post('/doctors/approve/:id', requireAdminSecret, async (req, res) => {
  try {
    const user = await approveDoctorById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Doctor not found' });
    res.json({ ok: true, message: 'Doctor approved', user });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Approve failed' });
  }
});

/** Admin: reject doctor by id. POST /auth/doctors/reject/:id */
router.post('/doctors/reject/:id', requireAdminSecret, async (req, res) => {
  try {
    const user = await rejectDoctorById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Doctor not found' });
    res.json({ ok: true, message: 'Doctor rejected', user });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Reject failed' });
  }
});

/**
 * Public: list all doctors for search (no auth or admin secret).
 * GET /auth/doctors?q=harpreet
 */
router.get('/doctors', async (req, res) => {
  try {
    const doctors = await listAllDoctors(req.query.q);
    res.json({ count: doctors.length, doctors });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Failed to list doctors' });
  }
});

/**
 * Public: list all patients (User.role === 'patient') with basic info.
 * GET /auth/patients
 */
router.get('/patients', async (_req, res) => {
  try {
    const patients = await User.find({ role: 'patient' })
      .sort({ createdAt: -1 })
      .select({ _id: 1, name: 1, phone: 1, createdAt: 1 })
      .lean();
    res.json({
      count: patients.length,
      patients: patients.map((p) => ({
        id: p._id.toString(),
        name: p.name,
        phone: p.phone || '',
        createdAt: p.createdAt,
      })),
    });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Failed to list patients' });
  }
});

/**
 * Public: store a simple prescription from the doctor PrescriptionPanel.
 * POST /auth/prescriptions/panel
 * Body: { patientId, doctorId?, doctorName?, medicine, dosage, frequency, duration, notes? }
 */
router.post('/prescriptions/panel', async (req, res) => {
  try {
    const doc = await createPanelPrescription(req.body || {});
    res.status(201).json({ ok: true, prescription: doc });
  } catch (e) {
    const status = e.status || 500;
    res.status(status).json({ error: e.message || 'Failed to create prescription' });
  }
});

/**
 * Public: list panel prescriptions.
 * GET /auth/prescriptions/panel?patientId=<userId>&doctorId=<doctorId>&limit=20
 */
router.get('/prescriptions/panel', async (req, res) => {
  try {
    const { patientId, doctorId, limit =20 } = req.query;
    const list = await listPanelPrescriptions({
      patientId,
      doctorId,
      limit: parseInt(String(limit), 10),
    });
    res.json({ count: list.length, prescriptions: list });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Failed to list prescriptions' });
  }
});

/**
 * POST /auth/send-otp
 * Body: { "phone": "+15551234567" } or "5551234567"
 */
router.post('/send-otp', validateBody(sendOtpBody), async (req, res) => {
  try {
    const { phone, name } = req.body;
    const existingUser = await User.findOne({ phone });
    await sendOtp(phone);
    await User.updateOne({ phone }, { $set: { name, role: 'patient' } }, { upsert: true });
    res.json({
      ok: true,
      message: 'OTP sent to your mobile number',
      user: {
        id: user.id,
        phone: user.phone,
        role: user.role,
        createdAt: user.createdAt,
      },
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
