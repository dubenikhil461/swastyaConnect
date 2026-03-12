/**
 * JWT in HttpOnly cookie — set on login/signup, read in requireAuth, cleared on logout.
 * Cookie name must match what the auth middleware parses.
 */
export const AUTH_COOKIE_NAME = 'access_token';

/** Max-Age in seconds (7 days) — align with JWT_EXPIRES_IN */
const MAX_AGE_SEC = 7 * 24 * 60 * 60;

/**
 * SameSite + Secure policy:
 * - Production (API on Render, frontend on another origin): SameSite=None; Secure is required
 *   or the browser will not send the cookie on cross-site XHR/fetch.
 * - Local dev over http: Lax without Secure avoids rejecting the cookie (None requires Secure).
 * - Optional: COOKIE_SAMESITE=lax|none — force policy (none implies Secure in production).
 */
function cookieAttributeSuffix(maxAgeSec) {
  const sameSiteNone =
    process.env.COOKIE_SAMESITE === 'none' ||
    (process.env.NODE_ENV === 'production' && process.env.COOKIE_SAMESITE !== 'lax');
  if (sameSiteNone) {
    // Browsers require Secure when SameSite=None
    return `Path=/; HttpOnly; SameSite=None; Secure; Max-Age=${maxAgeSec}`;
  }
  const secure = process.env.NODE_ENV === 'production';
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${secure ? '; Secure' : ''}`;
}

/**
 * Append Set-Cookie for JWT (call before res.json on login/signup).
 */
export function setAuthCookie(res, token) {
  const value = encodeURIComponent(token);
  res.append('Set-Cookie', `${AUTH_COOKIE_NAME}=${value}; ${cookieAttributeSuffix(MAX_AGE_SEC)}`);
}

/**
 * Clear auth cookie (logout).
 * Must use the same Path/SameSite/Secure as setAuthCookie or the browser keeps the old cookie.
 */
export function clearAuthCookie(res) {
  res.append(
    'Set-Cookie',
    `${AUTH_COOKIE_NAME}=; ${cookieAttributeSuffix(0)}`,
  );
}

/**
 * Parse token from Cookie header.
 */
export function getTokenFromCookie(req) {
  const cookie = req.headers.cookie;
  if (!cookie) return null;
  const parts = cookie.split(';').map((p) => p.trim());
  for (const p of parts) {
    const eq = p.indexOf('=');
    if (eq === -1) continue;
    const name = p.slice(0, eq);
    if (name === AUTH_COOKIE_NAME) {
      try {
        return decodeURIComponent(p.slice(eq + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
}
