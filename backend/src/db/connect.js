import mongoose from 'mongoose';
import { config } from '../config.js';
import { User } from '../models/User.js';

/**
 * Connect to MongoDB (Atlas). Call once before accepting traffic.
 */
export async function connectMongo() {
  if (!config.mongoUri) {
    throw new Error('Missing MONGODB_URI in environment');
  }
  mongoose.set('strictQuery', true);
  await mongoose.connect(config.mongoUri);
  console.log('MongoDB connected');
  // Backfill role for legacy documents (doctorId → doctor; others unchanged)
  const doctorResult = await User.updateMany(
    { doctorId: { $exists: true, $nin: [null, ''] }, $or: [{ role: { $exists: false } }, { role: { $ne: 'doctor' } }] },
    { $set: { role: 'doctor' } }
  );
  if (doctorResult.modifiedCount > 0) {
    console.log(`Backfilled role=doctor for ${doctorResult.modifiedCount} user(s)`);
  }
  const patientResult = await User.updateMany(
    {
      phone: { $exists: true, $ne: null },
      $or: [{ doctorId: { $exists: false } }, { doctorId: null }, { doctorId: '' }],
      role: { $exists: false },
    },
    { $set: { role: 'patient' } }
  );
  if (patientResult.modifiedCount > 0) {
    console.log(`Backfilled role=patient for ${patientResult.modifiedCount} user(s)`);
  }
}

export async function disconnectMongo() {
  await mongoose.disconnect();
}
