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
      $setOnInsert: { phone },
    },
    { new: true, upsert: true, runValidators: true }
  );
  return user.toJSON();
}

export async function findUserByPhone(phone) {
  const user = await User.findOne({ phone }).lean();
  if (!user) return null;
  user.id = user._id.toString();
  delete user._id;
  return user;
}
