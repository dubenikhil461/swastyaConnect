import { sendOtp, verifyOtp, normalizePhone } from './otpService.js';
import { User } from '../models/User.js';

/**
 * Pending doctor signup until OTP is verified (same TTL window as OTP).
 * Key: normalized phone E.164
 */
const pendingDoctorSignups = new Map();
const PENDING_TTL_MS = 5 * 60 * 1000; // 5 minutes, aligned with OTP

function setPending(phone, { doctorId, name }) {
  const to = normalizePhone(phone);
  if (!to) return;
  pendingDoctorSignups.set(to, {
    doctorId: String(doctorId).trim(),
    name: String(name).trim(),
    expiresAt: Date.now() + PENDING_TTL_MS,
  });
}

function takePending(phone) {
  const to = normalizePhone(phone);
  if (!to) return null;
  const entry = pendingDoctorSignups.get(to);
  if (!entry || Date.now() > entry.expiresAt) {
    pendingDoctorSignups.delete(to);
    return null;
  }
  pendingDoctorSignups.delete(to);
  return entry;
}

/**
 * Doctor signup step 1: validate doctorId + name + phone, then send OTP.
 * Does not create User until verifyDoctorOtp succeeds.
 */
export async function sendDoctorOtp({ doctorId, name, phone }) {
  const to = normalizePhone(phone);
  if (!to) {
    const err = new Error('Invalid phone number');
    err.status = 400;
    throw err;
  }

  const doctorIdStr = String(doctorId).trim();
  const nameStr = String(name).trim();
  if (!doctorIdStr || !nameStr) {
    const err = new Error('doctorId and name are required');
    err.status = 400;
    throw err;
  }

  const existingPhone = await User.findOne({ phone: to });
  if (existingPhone) {
    const err = new Error('User already exists with this phone number');
    err.status = 400;
    throw err;
  }

  const existingDoctorId = await User.findOne({ doctorId: doctorIdStr });
  if (existingDoctorId) {
    const err = new Error('Doctor ID already registered');
    err.status = 400;
    throw err;
  }

  setPending(to, { doctorId: doctorIdStr, name: nameStr });
  await sendOtp(phone);
  return { to, message: 'OTP sent. Complete signup with verify-otp.' };
}

/**
 * Doctor signup step 2: verify OTP then create doctor user (isActive false until admin approves).
 * Returns user doc suitable for JWT (same shape as regular verify).
 */
export async function verifyDoctorOtp(phone, code) {
  const { to } = await verifyOtp(phone, code);
  const pending = takePending(to);

  if (!pending) {
    const err = new Error(
      'No pending doctor signup for this number.'
    );
    err.status = 400;
    throw err;
  }

  const user = await User.create({
    phone: to,
    name: pending.name,
    doctorId: pending.doctorId,
    isActive: false,
  });

  const userId = user._id.toString();
  return {
    to,
    user: {
      id: userId,
      phone: to,
      name: pending.name,
      doctorId: pending.doctorId,
      isActive: false,
      createdAt: user.createdAt,
    },
    userId,
  };
}
