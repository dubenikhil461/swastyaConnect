import { verifyToken } from '../services/jwtService.js';

/**
 * Expects Authorization: Bearer <jwt>
 * Attaches req.user = { sub: phone } on success.
 */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  const token =
    header && header.startsWith('Bearer ')
      ? header.slice(7)
      : null;

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or missing token' });
  }
  req.user = {
    sub: decoded.sub,
    userId: decoded.userId || null,
  };
  next();
}
