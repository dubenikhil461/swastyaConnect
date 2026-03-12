import mongoose from 'mongoose';
import { config } from '../config.js';

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
}

export async function disconnectMongo() {
  await mongoose.disconnect();
}
