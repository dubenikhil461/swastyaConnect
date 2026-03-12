import { sendOtp, verifyOtp, normalizePhone } from './otpService.js';
import { User } from '../models/User.js';

/**
 * Pending pharmacy signup until OTP is verified (same TTL window as OTP).
 * Key: normalized phone E.164
 */
const pendingPharmacySignups = new Map();
const PENDING_TTL_MS = 5 * 60 * 1000; // 5 minutes, aligned with OTP

function setPending(phone, { pharmacyId, name }) {
  const to = normalizePhone(phone);
  if (!to) return;
  pendingPharmacySignups.set(to, {
    pharmacyId: String(pharmacyId).trim(),
    name: String(name).trim(),
    expiresAt: Date.now() + PENDING_TTL_MS,
  });
}

function takePending(phone) {
  const to = normalizePhone(phone);
  if (!to) return null;
  const entry = pendingPharmacySignups.get(to);
  if (!entry || Date.now() > entry.expiresAt) {
    pendingPharmacySignups.delete(to);
    return null;
  }
  pendingPharmacySignups.delete(to);
  return entry;
}

/**
 * Pharmacy signup step 1: validate pharmacyId + name + phone, then send OTP.
 * Does not create User until verifyPharmacyOtp succeeds.
 */
export async function sendPharmacyOtp({ pharmacyId, name, phone }) {
  const to = normalizePhone(phone);
  if (!to) {
    const err = new Error('Invalid phone number');
    err.status = 400;
    throw err;
  }

  const pharmacyIdStr = String(pharmacyId).trim();
  const nameStr = String(name).trim();
  if (!pharmacyIdStr || !nameStr) {
    const err = new Error('pharmacyId and name are required');
    err.status = 400;
    throw err;
  }

  const existingPhone = await User.findOne({ phone: to });
  if (existingPhone) {
    const err = new Error('User already exists with this phone number');
    err.status = 400;
    throw err;
  }

  const existingPharmacyId = await User.findOne({ pharmacyId: pharmacyIdStr });
  if (existingPharmacyId) {
    const err = new Error('Pharmacy ID already registered');
    err.status = 400;
    throw err;
  }

  setPending(to, { pharmacyId: pharmacyIdStr, name: nameStr });
  await sendOtp(phone);
  return { to, message: 'OTP sent. Complete signup with verify-otp.' };
}

/**
 * Pharmacy signup step 2: verify OTP then create pharmacy user (isActive false until admin approves).
 */
export async function verifyPharmacyOtp(phone, code) {
  const { to } = await verifyOtp(phone, code);
  const pending = takePending(to);

  if (!pending) {
    const err = new Error('No pending pharmacy signup for this number.');
    err.status = 400;
    throw err;
  }

  const user = await User.create({
    phone: to,
    name: pending.name,
    pharmacyId: pending.pharmacyId,
    isActive: false,
  });

  const userId = user._id.toString();
  return {
    to,
    user: {
      id: userId,
      phone: to,
      name: pending.name,
      pharmacyId: pending.pharmacyId,
      isActive: false,
      createdAt: user.createdAt,
    },
    userId,
  };
}
