/**
 * Each user's routes are stored as one validated JSON document with a version number.
 * Writes must name the version they were based on (optimistic concurrency), so two
 * tabs or devices cannot silently overwrite each other's changes.
 */
import { transaction } from '../db.js';

export const createRouteSetRepository = (db) => {
  const select = db.prepare('SELECT data, version FROM route_sets WHERE user_id = ?');
  const upsert = db.prepare(`
    INSERT INTO route_sets (user_id, data, version, updated_at) VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, version = excluded.version, updated_at = excluded.updated_at
  `);

  const get = (userId) => {
    const row = select.get(userId);
    return row ? { version: row.version, routes: JSON.parse(row.data) } : { version: 0, routes: [] };
  };

  return {
    get,
    /** @returns {{ ok: true, version: number } | { ok: false, version: number }} */
    save(userId, routes, expectedVersion) {
      return transaction(db, () => {
        const current = select.get(userId)?.version ?? 0;
        if (current !== expectedVersion) return { ok: false, version: current };
        const version = current + 1;
        upsert.run(userId, JSON.stringify(routes), version, new Date().toISOString());
        return { ok: true, version };
      });
    },
  };
};
