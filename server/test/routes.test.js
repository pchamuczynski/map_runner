import { describe, expect, it } from 'vitest';
import { createTestServer } from './helpers.js';

const route = (id, extra = {}) => ({
  id,
  name: `Route ${id}`,
  from: 'Warsaw',
  to: 'Krakow',
  activities: ['Running'],
  coordinates: [
    [52.2297, 21.0122],
    [50.0647, 19.945],
  ],
  distance: 295000,
  duration: 10000,
  provider: 'osrm',
  workouts: [],
  createdAt: '2025-01-01T00:00:00.000Z',
  ...extra,
});

const signedIn = async (server, email = 'runner@example.com') => {
  const c = server.client();
  await c.post('/api/auth/register', { email, password: 'correct horse battery' });
  return c;
};

describe('/api/routes', () => {
  it('requires a session', async () => {
    const server = createTestServer();
    expect((await server.client().get('/api/routes')).status).toBe(401);
  });

  it('stores routes per user with versions', async () => {
    const server = createTestServer();
    const alice = await signedIn(server, 'alice@example.com');
    const bob = await signedIn(server, 'bob@example.com');

    expect((await alice.get('/api/routes')).body).toEqual({ version: 0, routes: [] });
    const saved = await alice.put('/api/routes', { version: 0, routes: [route('r1')] });
    expect(saved.body).toEqual({ version: 1 });

    const loaded = (await alice.get('/api/routes')).body;
    expect(loaded.version).toBe(1);
    expect(loaded.routes.map((r) => r.id)).toEqual(['r1']);
    expect((await bob.get('/api/routes')).body.routes).toEqual([]);
  });

  it('rejects writes based on an outdated version', async () => {
    const server = createTestServer();
    const c = await signedIn(server);
    await c.put('/api/routes', { version: 0, routes: [route('r1')] });
    const stale = await c.put('/api/routes', { version: 0, routes: [route('r2')] });
    expect(stale.status).toBe(409);
    expect(stale.body.version).toBe(1);
  });

  it('validates routes with the shared domain schema', async () => {
    const server = createTestServer();
    const c = await signedIn(server);
    await c.put('/api/routes', {
      version: 0,
      routes: [route('ok'), route('bad', { coordinates: [[999, 999]] }), 'junk', route('tags', { activities: ['running', 'Yoga'] })],
    });
    const { routes } = (await c.get('/api/routes')).body;
    expect(routes.map((r) => r.id)).toEqual(['ok', 'tags']);
    expect(routes[1].activities).toEqual(['Running']);
  });

  it('rejects malformed bodies', async () => {
    const server = createTestServer();
    const c = await signedIn(server);
    expect((await c.put('/api/routes', { version: -1, routes: [] })).status).toBe(400);
    expect((await c.put('/api/routes', { routes: 'nope' })).status).toBe(400);
  });
});
