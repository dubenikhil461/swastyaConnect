import bcrypt from 'bcrypt';
import { User } from '../models/User.js';

const SALT_ROUNDS = 10;

function statusError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/**
 * Doctor signup: email + password + name + doctorId (no OTP).
 * Creates user with passwordHash; JWT issued by route.
 */
export async function doctorSignup({ email, password, name, doctorId }) {
  const emailNorm = String(email).trim().toLowerCase();
  const nameStr = String(name).trim();
  const doctorIdStr = String(doctorId).trim();
  const passwordStr = String(password);

  if (!emailNorm || !nameStr || !doctorIdStr) {
    throw statusError('email, name, and doctorId are required');
  }
  if (passwordStr.length < 8) {
    throw statusError('password must be at least 8 characters');
  }

  const existingEmail = await User.findOne({ email: emailNorm });
  if (existingEmail) {
    throw statusError('Email already registered');
  }

  const existingDoctorId = await User.findOne({ doctorId: doctorIdStr });
  if (existingDoctorId) {
    throw statusError('Doctor ID already registered');
  }

  const passwordHash = await bcrypt.hash(passwordStr, SALT_ROUNDS);

  const user = await User.create({
    email: emailNorm,
    passwordHash,
    name: nameStr,
    doctorId: doctorIdStr,
    role: 'doctor',
    /** Inactive until admin approval — no JWT/cookie until isActive true */
    isActive: false,
  });

  const userId = user._id.toString();
  return {
    userId,
    sub: emailNorm,
    pendingApproval: true,
    user: {
      id: userId,
      email: emailNorm,
      name: nameStr,
      doctorId: doctorIdStr,
      role: 'doctor',
      isActive: false,
      createdAt: user.createdAt,
    },
  };
}

/**
 * Doctor login: email + password → user payload for JWT.
 */
export async function doctorLogin({ email, password }) {
  const emailNorm = String(email).trim().toLowerCase();
  const passwordStr = String(password);

  if (!emailNorm) {
    throw statusError('email is required');
  }

  const user = await User.findOne({ email: emailNorm }).select('+passwordHash');
  if (!user || !user.passwordHash) {
    throw statusError('Invalid email or password', 401);
  }
  if (user.role !== 'doctor' && !user.doctorId) {
    throw statusError('Invalid email or password', 401);
  }
  // Backfill role for legacy doctor accounts
  if (user.role !== 'doctor') {
    await User.updateOne({ _id: user._id }, { $set: { role: 'doctor' } });
  }

  const ok = await bcrypt.compare(passwordStr, user.passwordHash);
  if (!ok) {
    throw statusError('Invalid email or password', 401);
  }

  if (!user.isActive) {
    throw statusError(
      'Verification pending. Your account is awaiting approval—please wait before signing in.',
      403
    );
  }

  await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });

  const userId = user._id.toString();
  return {
    userId,
    sub: emailNorm,
    user: {
      id: userId,
      email: emailNorm,
      name: user.name,
      doctorId: user.doctorId,
      role: 'doctor',
      isActive: user.isActive,
      createdAt: user.createdAt,
    },
  };
}

/**
 * Approve doctor by email — sets isActive true (e.g. admin callback).
 */
export async function approveDoctorByEmail(email) {
  const emailNorm = String(email || '').trim().toLowerCase();
  if (!emailNorm) return null;
  const user = await User.findOneAndUpdate(
    { email: emailNorm, role: 'doctor' },
    { $set: { isActive: true } },
    { new: true }
  ).lean();
  if (!user) return null;
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    doctorId: user.doctorId,
    role: 'doctor',
    isActive: user.isActive,
  };
}
