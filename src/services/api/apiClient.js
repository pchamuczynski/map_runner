/**
 * Client for the Map Runner API (server/).
 *
 * Security model:
 *  - The server owns the session in an HttpOnly, SameSite=Lax cookie (Secure in
 *    production); the browser never stores auth or provider tokens, so an XSS bug
 *    cannot steal them.
 *  - Strava/Garmin OAuth code exchange, client secrets and refresh tokens will live
 *    only on the server.
 *  - The custom header makes every request "non-simple", so cross-site forms
 *    cannot forge it and the server rejects requests without it (CSRF).
 */
import { config } from '../../config/env';
import { fetchJson } from '../../lib/http';

export const isApiConfigured = () => Boolean(config.apiBaseUrl);

export const apiUrl = (path) => {
  if (!isApiConfigured()) throw new Error('API base URL is not configured');
  return `${config.apiBaseUrl}${path}`;
};

const unauthorizedListeners = new Set();

/** Called when an authenticated request finds the session gone (expired or revoked elsewhere). */
export const onUnauthorized = (listener) => {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
};

/**
 * @param {string} path
 * @param {{ method?: string, body?: unknown, signal?: AbortSignal, timeoutMs?: number, authenticated?: boolean }} [options]
 *   `authenticated: false` for requests where 401 is an expected answer (sign-in, /auth/me).
 */
export const apiRequest = async (path, { method = 'GET', body, signal, timeoutMs, authenticated = true } = {}) => {
  try {
    return await fetchJson(apiUrl(path), {
      method,
      signal,
      timeoutMs,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'X-Requested-With': 'map-runner',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if (authenticated && error?.status === 401) unauthorizedListeners.forEach((listener) => listener());
    throw error;
  }
};
