import { verifyToken } from '../services/jwtService.js';
import { getTokenFromCookie } from '../services/cookieAuth.js';

/**
 * Token from:
 * 1) Authorization: Bearer <jwt>
 * 2) Cookie: access_token=<jwt>
 */
export function requireAuth(req, res, next) {
  let token = null;
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    token = header.slice(7);
  }
  if (!token) {
    token = getTokenFromCookie(req);
  }

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
