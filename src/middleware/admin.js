import Joi from 'joi';
import { config } from '../config.js';

const emailSchema = Joi.string().trim().email().required();

/**
 * Admin access: email must match config.adminEmail.
 * Email is read from (first match):
 *   - Header: X-Admin-Email
 *   - Body: email (JSON)
 *   - Query: ?email=
 *
 * For production, prefer coupling with requireAuth and storing email on the user,
 * or use a dedicated admin API key.
 */
export function requireAdmin(req, res, next) {
  const fromHeader = req.headers['x-admin-email'];
  const fromBody = req.body && typeof req.body.email === 'string' ? req.body.email : null;
  const fromQuery = req.query && typeof req.query.email === 'string' ? req.query.email : null;

  const raw = fromHeader || fromBody || fromQuery;
  if (!raw || typeof raw !== 'string') {
    return res.status(401).json({
      error: 'Admin email required',
      message: 'Send admin email via header X-Admin-Email, body { "email": "..." }, or query ?email=',
    });
  }

  const emailNormalized = raw.trim().toLowerCase();
  const { error } = emailSchema.validate(raw.trim());
  if (error) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'Admin email must be a valid email address',
    });
  }
  const email = emailNormalized;
  if (email !== config.adminEmail) {
    return res.status(403).json({ error: 'Forbidden', message: 'Not an authorized admin' });
  }

  req.adminEmail = email;
  next();
}
