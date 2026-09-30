import { randomUUID } from 'node:crypto';

/** The shape returned to the client - never includes hashes or provider ids. */
export const toPublicUser = (row) => ({
  id: row.id,
  email: row.email,
  name: row.name,
  avatarUrl: row.avatar_url ?? null,
  hasPassword: Boolean(row.password_hash),
  googleLinked: Boolean(row.google_sub),
});

export const createUserRepository = (db) => {
  const byId = db.prepare('SELECT * FROM users WHERE id = ?');
  const byEmail = db.prepare('SELECT * FROM users WHERE email = ?');
  const byGoogleSub = db.prepare('SELECT * FROM users WHERE google_sub = ?');
  const insert = db.prepare(`
    INSERT INTO users (id, email, email_verified, password_hash, google_sub, name, avatar_url, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const linkGoogle = db.prepare(`
    UPDATE users SET google_sub = ?, email_verified = 1, avatar_url = COALESCE(avatar_url, ?),
      password_hash = CASE WHEN ? THEN NULL ELSE password_hash END, updated_at = ?
    WHERE id = ?
  `);

  const create = ({ email, name, passwordHash = null, googleSub = null, emailVerified = false, avatarUrl = null }) => {
    const id = randomUUID();
    const now = new Date().toISOString();
    insert.run(id, email, emailVerified ? 1 : 0, passwordHash, googleSub, name, avatarUrl, now, now);
    return byId.get(id);
  };

  return {
    findById: (id) => byId.get(id) ?? null,
    findByEmail: (email) => byEmail.get(email) ?? null,
    findByGoogleSub: (sub) => byGoogleSub.get(sub) ?? null,
    create,
    /** Attaches a Google identity; `clearPassword` removes a password set before the email was verified. */
    linkGoogle(id, { googleSub, avatarUrl, clearPassword }) {
      linkGoogle.run(googleSub, avatarUrl ?? null, clearPassword ? 1 : 0, new Date().toISOString(), id);
      return byId.get(id);
    },
  };
};
