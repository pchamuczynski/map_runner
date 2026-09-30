/**
 * Route persistence.
 *
 * A repository is any object implementing:
 *   load(): Promise<Route[]>
 *   save(routes: Route[]): Promise<void>
 *
 * Guests store routes in this browser (localStorage); signed-in users store them in
 * their account on the server. The UI and state layers do not know the difference.
 */
import { sanitizeRoutes } from '../../domain/schema';
import { apiRequest } from '../api/apiClient';

const SCHEMA_VERSION = 2;
const LEGACY_KEY = 'mapRunnerRoutes';
const storageKey = (userId) => `mapRunner:v${SCHEMA_VERSION}:${userId}:routes`;

export class StorageError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'StorageError';
    this.cause = cause;
  }
}

const readJson = (storage, key) => {
  const text = storage.getItem(key);
  if (text == null) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined; // corrupted entry: treat as missing instead of crashing the app
  }
};

export const createLocalRouteRepository = (userId, storage = globalThis.localStorage) => {
  const key = storageKey(userId);

  return {
    async load() {
      const stored = readJson(storage, key);
      if (stored !== undefined) {
        return stored?.version === SCHEMA_VERSION ? sanitizeRoutes(stored.routes) : [];
      }
      // One-time migration of data saved by the previous version of the app.
      const legacy = readJson(storage, LEGACY_KEY);
      if (legacy === undefined) return [];
      const routes = sanitizeRoutes(legacy);
      await this.save(routes);
      return routes;
    },

    async save(routes) {
      try {
        storage.setItem(key, JSON.stringify({ version: SCHEMA_VERSION, routes }));
        storage.removeItem(LEGACY_KEY);
      } catch (error) {
        throw new StorageError('Could not save your routes - browser storage may be full.', error);
      }
    },

    async clear() {
      storage.removeItem(key);
    },
  };
};

/**
 * Routes stored in the signed-in user's account. Every write names the version it is based
 * on; the server rejects it if another tab or device saved in between (HTTP 409), so changes
 * are never silently overwritten. Saves are sent one at a time so each uses the latest version.
 */
export const createApiRouteRepository = (request = apiRequest) => {
  let version = null;
  let queue = Promise.resolve();

  const put = async (routes) => {
    if (version === null) throw new StorageError('Your routes have not been loaded yet.');
    try {
      ({ version } = await request('/routes', { method: 'PUT', body: { version, routes }, timeoutMs: 30000 }));
    } catch (error) {
      if (error?.status === 409) {
        throw new StorageError('Your routes were changed on another device or tab. Reload the page to see the latest version.', error);
      }
      if (error?.status === 401) throw new StorageError('You were signed out. Sign in again to save your changes.', error);
      throw new StorageError('Could not save your routes to your account. Check your connection and try again.', error);
    }
  };

  return {
    async load() {
      const data = await request('/routes');
      version = data.version;
      return sanitizeRoutes(data.routes);
    },

    save(routes) {
      const run = queue.then(() => put(routes));
      queue = run.catch(() => {});
      return run;
    },
  };
};

export const createRouteRepository = (user) =>
  user.isGuest ? createLocalRouteRepository(user.id) : createApiRouteRepository();

/**
 * After signing in, moves routes created as a guest in this browser into the account
 * (skipping ids the account already has) and clears the guest copy.
 * @returns {Promise<number>} how many routes were added
 */
export const importGuestRoutes = async ({ guest, account }) => {
  const guestRoutes = await guest.load();
  if (guestRoutes.length === 0) return 0;

  const existing = await account.load();
  const known = new Set(existing.map((route) => route.id));
  const added = guestRoutes.filter((route) => !known.has(route.id));
  if (added.length > 0) await account.save([...existing, ...added]);
  await guest.clear();
  return added.length;
};
