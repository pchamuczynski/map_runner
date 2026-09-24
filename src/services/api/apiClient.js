/**
 * Client for the (future) Map Runner backend.
 *
 * Security model:
 *  - The backend owns the session in an HttpOnly, Secure, SameSite cookie; the
 *    browser never stores auth or provider tokens (no localStorage tokens -> no
 *    token theft via XSS).
 *  - Strava/Garmin OAuth code exchange, client secrets and refresh tokens live
 *    only on the backend.
 *  - The custom header makes every request "non-simple", so cross-site forms
 *    cannot forge it and the backend can reject requests without it (CSRF).
 */
import { config } from '../../config/env';
import { fetchJson } from '../../lib/http';

export const isApiConfigured = () => Boolean(config.apiBaseUrl);

export const apiUrl = (path) => {
  if (!isApiConfigured()) throw new Error('API base URL is not configured');
  return `${config.apiBaseUrl}${path}`;
};

export const apiRequest = (path, { method = 'GET', body, signal } = {}) =>
  fetchJson(apiUrl(path), {
    method,
    signal,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'X-Requested-With': 'map-runner',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
