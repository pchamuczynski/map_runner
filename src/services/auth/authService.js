/**
 * Authentication.
 *
 * Today every visitor is the local guest user and data stays in the browser.
 *
 * Planned Google sign-in flow (enabled by config.features.googleSignIn):
 *  1. Load Google Identity Services (https://accounts.google.com/gsi/client) and
 *     obtain an ID token (JWT) for config.googleClientId.
 *  2. POST it to `/auth/google`; the backend verifies signature, `aud` and `exp`,
 *     upserts the user and sets an HttpOnly session cookie.
 *  3. `getCurrentUser()` reads `/auth/me`; the route repository switches to the API.
 * The ID token is never persisted in the browser.
 *
 * @typedef {{ id: string, name: string, email?: string, avatarUrl?: string, isGuest: boolean }} User
 */
import { config } from '../../config/env';
import { apiRequest } from '../api/apiClient';

/** @type {User} */
export const GUEST_USER = Object.freeze({ id: 'guest', name: 'Guest', isGuest: true });

export const isSignInAvailable = () => config.features.googleSignIn;

/** @returns {Promise<User>} */
export const getCurrentUser = async ({ signal } = {}) => {
  if (!isSignInAvailable()) return GUEST_USER;
  try {
    const user = await apiRequest('/auth/me', { signal });
    return user?.id ? { ...user, id: String(user.id), isGuest: false } : GUEST_USER;
  } catch (error) {
    if (error?.status === 401) return GUEST_USER;
    throw error;
  }
};

/** @returns {Promise<User>} */
export const signInWithGoogle = async () => {
  if (!isSignInAvailable()) throw new Error('Google sign-in is not configured');
  throw new Error('Google sign-in is not implemented yet'); // see flow above
};

export const signOut = async () => {
  if (isSignInAvailable()) await apiRequest('/auth/logout', { method: 'POST' });
  return GUEST_USER;
};
