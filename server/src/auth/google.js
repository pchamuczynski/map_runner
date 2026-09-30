/**
 * Verifies Google ID tokens (from Google Identity Services in the browser).
 * google-auth-library checks the signature against Google's keys, the issuer,
 * expiry and that the audience is our OAuth client id.
 */
import { OAuth2Client } from 'google-auth-library';

/** @returns {((credential: string) => Promise<GoogleIdentity>) | null}  null when Google sign-in is not configured. */
export const createGoogleVerifier = (clientId) => {
  if (!clientId) return null;
  const client = new OAuth2Client();

  /**
   * @typedef {{ sub: string, email: string | null, emailVerified: boolean, name: string | null, picture: string | null }} GoogleIdentity
   */
  return async (credential) => {
    const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
    const payload = ticket.getPayload() ?? {};
    return {
      sub: String(payload.sub),
      email: typeof payload.email === 'string' ? payload.email.toLowerCase() : null,
      emailVerified: payload.email_verified === true,
      name: typeof payload.name === 'string' ? payload.name : null,
      picture: typeof payload.picture === 'string' && payload.picture.startsWith('https://') ? payload.picture : null,
    };
  };
};
