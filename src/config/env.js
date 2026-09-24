/**
 * Single source of truth for build-time configuration.
 * Everything here ends up in the client bundle - it must never contain secrets.
 */
const env = import.meta.env;

const trimmed = (value) => (typeof value === 'string' ? value.trim() : '');
const flag = (value) => trimmed(value).toLowerCase() === 'true';

const apiBaseUrl = trimmed(env.VITE_API_BASE_URL).replace(/\/+$/, '');
const googleClientId = trimmed(env.VITE_GOOGLE_CLIENT_ID);

export const config = Object.freeze({
  apiBaseUrl,
  googleClientId,
  features: Object.freeze({
    // Accounts and integrations need the backend: tokens and client secrets must never live in the browser.
    googleSignIn: Boolean(apiBaseUrl && googleClientId),
    strava: Boolean(apiBaseUrl) && flag(env.VITE_ENABLE_STRAVA),
    garmin: Boolean(apiBaseUrl) && flag(env.VITE_ENABLE_GARMIN),
  }),
});
