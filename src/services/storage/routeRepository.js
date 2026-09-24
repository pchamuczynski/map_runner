/**
 * Route persistence.
 *
 * A repository is any object implementing:
 *   load(): Promise<Route[]>
 *   save(routes: Route[]): Promise<void>
 *
 * The app currently uses the localStorage implementation below, namespaced per user.
 * When accounts land, add an API-backed repository (see services/api/apiClient.js)
 * and select it in createRouteRepository() - the UI and state layers stay unchanged.
 */
import { sanitizeRoutes } from '../../domain/schema';

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
  };
};

export const createRouteRepository = (user) => createLocalRouteRepository(user.id);
