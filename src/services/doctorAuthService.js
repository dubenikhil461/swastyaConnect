import bcrypt from 'bcrypt';
import { User } from '../models/User.js';

const SALT_ROUNDS = 10;

function statusError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/**
 * Doctor signup: email + password + name + doctorId; optional phone, council, specialization.
 * Creates user with passwordHash; stores doctorProfile (phone, council, specialization).
 */
export async function doctorSignup({ email, password, name, doctorId, phone, council, specialization }) {
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
    isActive: false,
    doctorProfile: {
      phone: String(phone || '').trim().slice(0, 20),
      council: String(council || '').trim().slice(0, 200),
      specialization: String(specialization || '').trim().slice(0, 200),
    },
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
    { $set: { isActive: true }, $unset: { rejectedAt: 1 } },
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

/**
 * List doctors pending approval (role=doctor, isActive=false, not rejected).
 */
export async function getPendingDoctors() {
  const list = await User.find({
    role: 'doctor',
    isActive: false,
    $or: [{ rejectedAt: null }, { rejectedAt: { $exists: false } }],
  })
    .sort({ createdAt: -1 })
    .lean();
  return list.map((u) => ({
    id: u._id.toString(),
    doctorId: u.doctorId || '',
    name: u.name,
    phone: u.email,
    createdAt: u.createdAt,
  }));
}

/**
 * Approve doctor by DB id — sets isActive true.
 */
export async function approveDoctorById(id) {
  const { Types } = await import('mongoose');
  if (!Types.ObjectId.isValid(id)) return null;
  const user = await User.findOneAndUpdate(
    { _id: new Types.ObjectId(id), role: 'doctor' },
    { $set: { isActive: true }, $unset: { rejectedAt: 1 } },
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

/**
 * Reject doctor by DB id — sets rejectedAt so they no longer appear in pending.
 */
export async function rejectDoctorById(id) {
  const { Types } = await import('mongoose');
  if (!Types.ObjectId.isValid(id)) return null;
  const user = await User.findOneAndUpdate(
    { _id: new Types.ObjectId(id), role: 'doctor' },
    { $set: { rejectedAt: new Date() } },
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

/**
 * List all doctors for search (optionally filtered by ?q=).
 * Includes basic profile fields and doctorProfile metadata.
 */
export async function listAllDoctors(query) {
  const q = typeof query === 'string' ? query.trim() : '';
  const criteria = { role: 'doctor' };

  const list = await User.find(criteria)
    .sort({ createdAt: -1 })
    .lean();

  return list.map((u) => ({
    id: u._id.toString(),
    name: u.name,
    email: u.email,
    doctorId: u.doctorId || '',
    isActive: !!u.isActive,
    rejectedAt: u.rejectedAt || null,
    createdAt: u.createdAt,
    doctorProfile: {
      phone: u.doctorProfile?.phone || '',
      council: u.doctorProfile?.council || '',
      specialization: u.doctorProfile?.specialization || '',
    },
  }));
}
