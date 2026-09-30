/**
 * CSRF protection for cookie-authenticated requests, in addition to SameSite=Lax cookies:
 *  - state-changing requests must carry the custom `X-Requested-With: map-runner` header,
 *    which cross-site forms cannot send and cross-origin scripts cannot send without CORS;
 *  - if the browser sends an Origin header, it must be one of the app's origins.
 */
import { HttpError } from '../middleware/errors.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
export const CSRF_HEADER_VALUE = 'map-runner';

export const csrfProtection = (allowedOrigins) => (req, _res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();
  const origin = req.get('Origin');
  if (origin && !allowedOrigins.includes(origin)) return next(new HttpError(403, 'Origin not allowed'));
  if (req.get('X-Requested-With') !== CSRF_HEADER_VALUE) return next(new HttpError(403, 'Missing CSRF header'));
  return next();
};
