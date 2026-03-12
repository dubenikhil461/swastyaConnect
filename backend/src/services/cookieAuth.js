/**
 * JWT in HttpOnly cookie — set on login/signup, read in requireAuth, cleared on logout.
 * Cookie name must match what the auth middleware parses.
 */
export const AUTH_COOKIE_NAME = 'access_token';

/** Max-Age in seconds (7 days) — align with JWT_EXPIRES_IN */
const MAX_AGE_SEC = 7 * 24 * 60 * 60;

function cookieBaseOptions() {
  const secure = process.env.NODE_ENV === 'production';
  // SameSite=Lax works for same-site dev (localhost:5173 -> localhost:3000 is cross-site!)
  // Cross-site requests need SameSite=None; Secure. For local dev, many use SameSite=None without Secure on http - browsers may reject. So for dev cross-origin use Lax won't send cookie on fetch from 5173 to 3000.
  // Actually: different ports = different sites in cookie same-site rules? SameSite is eTLD+1 - localhost is one site, but port doesn't matter for SameSite=Lax - cookies set by localhost:3000 are sent to localhost:3000 from fetch with credentials from localhost:5173 - the request is TO 3000 so the cookie stored for localhost (path /) should be sent when browser makes request to localhost:3000... Wait, the cookie is set by 3000's response, so it's stored for domain localhost, path /. When 5173 does fetch('http://localhost:3000/auth/...', {credentials:'include'}), the request goes to localhost:3000 - the cookie for localhost should be included. SameSite=Lax: cookie sent on top-level navigations and same-site requests. Fetch from 5173 to 3000 - is that same-site? Same host localhost, different port - still same registrable domain, so it's same-site. Good.
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE_SEC}${secure ? '; Secure' : ''}`;
}

/**
 * Append Set-Cookie for JWT (call before res.json on login/signup).
 */
export function setAuthCookie(res, token) {
  const value = encodeURIComponent(token);
  res.append('Set-Cookie', `${AUTH_COOKIE_NAME}=${value}; ${cookieBaseOptions()}`);
}

/**
 * Clear auth cookie (logout).
 */
export function clearAuthCookie(res) {
  res.append(
    'Set-Cookie',
    `${AUTH_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
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
