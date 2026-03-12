import { User } from '../models/User.js';

/**
 * Upsert user by phone after successful OTP verification.
 * Returns lean user doc { id, phone, createdAt, ... }.
 */
export async function upsertUserByPhone(phone) {
  const user = await User.findOneAndUpdate(
    { phone },
    {
      $set: { lastLoginAt: new Date() },
      $setOnInsert: { phone, role: 'patient' },
    },
    { new: true, upsert: true, runValidators: true }
  );
  // Legacy docs without role: treat as patient unless doctorId present
  if (!user.role) {
    if (user.doctorId) {
      await User.updateOne({ _id: user._id }, { $set: { role: 'doctor' } });
      user.role = 'doctor';
    } else {
      await User.updateOne({ _id: user._id }, { $set: { role: 'patient' } });
      user.role = 'patient';
    }
  }
  return user.toJSON();
}

function attachRole(user) {
  if (!user) return null;
  if (!user.role) {
    user.role = user.doctorId ? 'doctor' : 'patient';
  }
  return user;
}

export async function findUserByPhone(phone) {
  const user = await User.findOne({ phone }).lean();
  if (!user) return null;
  user.id = user._id.toString();
  delete user._id;
  return attachRole(user);
}

/** Load user by id (for JWT with userId, e.g. doctor email login). */
export async function findUserById(userId) {
  const user = await User.findById(userId).lean();
  if (!user) return null;
  user.id = user._id.toString();
  delete user._id;
  return attachRole(user);
}

/** Query users by role for CRUD/list endpoints (exclude passwordHash by default). */
export async function findUsersByRole(role, { limit = 100, skip = 0 } = {}) {
  if (role !== 'patient' && role !== 'doctor') return [];
  return User.find({ role })
    .select('-passwordHash')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Math.min(limit, 500))
    .lean();
}

/** Count by role */
export async function countUsersByRole(role) {
  if (role !== 'patient' && role !== 'doctor') return 0;
  return User.countDocuments({ role });
}
