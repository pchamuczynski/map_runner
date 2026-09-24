import { describe, expect, it } from 'vitest';
import { StorageError, createLocalRouteRepository } from './routeRepository';

const memoryStorage = (initial = {}) => {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
    data,
  };
};

const route = {
  id: 'r1',
  name: 'R',
  from: 'A',
  to: 'B',
  activities: ['Cycling'],
  coordinates: [
    [0, 0],
    [0, 1],
  ],
  distance: 1,
  duration: 1,
  provider: 'osrm',
  autoImport: { enabled: true, activities: ['Cycling'], since: '2025-01-01T10:00:00.000Z' },
  workouts: [],
  createdAt: '2025-01-01T00:00:00.000Z',
};

describe('local route repository', () => {
  it('round-trips routes per user', async () => {
    const storage = memoryStorage();
    await createLocalRouteRepository('alice', storage).save([route]);
    expect(await createLocalRouteRepository('alice', storage).load()).toEqual([route]);
    expect(await createLocalRouteRepository('bob', storage).load()).toEqual([]);
  });

  it('migrates the legacy key once', async () => {
    const storage = memoryStorage({ mapRunnerRoutes: JSON.stringify([{ ...route, id: 5 }]) });
    const routes = await createLocalRouteRepository('guest', storage).load();
    expect(routes.map((r) => r.id)).toEqual(['5']);
    expect(storage.data.has('mapRunnerRoutes')).toBe(false);
  });

  it('survives corrupted storage', async () => {
    const storage = memoryStorage({ 'mapRunner:v2:guest:routes': '{not json' });
    expect(await createLocalRouteRepository('guest', storage).load()).toEqual([]);
  });

  it('reports quota errors', async () => {
    const storage = {
      ...memoryStorage(),
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    await expect(createLocalRouteRepository('guest', storage).save([route])).rejects.toBeInstanceOf(StorageError);
  });
});
