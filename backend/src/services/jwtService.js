import jwt from 'jsonwebtoken';
import { config } from '../config.js';

/**
 * Issue JWT after successful OTP verification.
 * Payload: sub = phone, optional userId for DB-backed routes.
 */
export function signToken(phone, userId = null) {
  const payload = {
    sub: phone,
    iat: Math.floor(Date.now() / 1000),
  };
  if (userId) payload.userId = userId;
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

export function verifyToken(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch {
    return null;
  }
}
