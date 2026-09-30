/**
 * Server-side sessions. The browser holds a random 256-bit token in an HttpOnly cookie;
 * the database only stores its SHA-256 hash, so a leaked database cannot be used to
 * hijack sessions.
 */
import { createHash, randomBytes } from 'node:crypto';

const hashToken = (token) => createHash('sha256').update(token).digest('hex');

export const createSessionStore = (db, { ttlMs }) => {
  const insert = db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)');
  const findValid = db.prepare(`
    SELECT users.* FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > ?
  `);
  const remove = db.prepare('DELETE FROM sessions WHERE token_hash = ?');
  const removeForUser = db.prepare('DELETE FROM sessions WHERE user_id = ?');
  const removeExpired = db.prepare('DELETE FROM sessions WHERE expires_at <= ?');

  return {
    /** @returns {{ token: string, expiresAt: Date }} */
    create(userId, now = new Date()) {
      const token = randomBytes(32).toString('base64url');
      const expiresAt = new Date(now.getTime() + ttlMs);
      insert.run(hashToken(token), userId, now.toISOString(), expiresAt.toISOString());
      return { token, expiresAt };
    },

    /** The user row for a valid, unexpired session token, or null. */
    findUser(token, now = new Date()) {
      if (typeof token !== 'string' || token.length === 0 || token.length > 100) return null;
      return findValid.get(hashToken(token), now.toISOString()) ?? null;
    },

    revoke(token) {
      if (typeof token === 'string') remove.run(hashToken(token));
    },

    revokeAllForUser(userId) {
      removeForUser.run(userId);
    },

    purgeExpired(now = new Date()) {
      return removeExpired.run(now.toISOString()).changes;
    },
  };
};
