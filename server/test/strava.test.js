import { describe, expect, it } from 'vitest';
import { activityWindow, createStravaClient, publicActivity } from '../src/integrations/strava.js';
import { createTestServer } from './helpers.js';

const register = (c) => c.post('/api/auth/register', { email: 'runner@example.com', password: 'correct horse battery', name: 'Runner' });

const activity = {
  id: 123,
  sport_type: 'Run',
  type: 'Run',
  name: 'Morning run',
  distance: 5000,
  elapsed_time: 1800,
  start_date: '2025-06-01T06:00:00Z',
  start_date_local: '2025-06-01T08:00:00Z',
  map: { summary_polyline: 'secret' },
};

const strava = {
  configured: true,
  authorizeUrl: (redirectUri, state) => `https://www.strava.com/oauth/authorize?redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`,
  exchangeCode: async (code) => {
    if (code !== 'ok') throw Object.assign(new Error('denied'), { status: 400 });
    return { accessToken: 'access', refreshToken: 'refresh', expiresAt: '2000-01-01T00:00:00.000Z', scope: 'read,activity:read_all' };
  },
  refresh: async (refreshToken) => {
    if (refreshToken !== 'refresh') throw new Error('bad refresh');
    return { accessToken: 'refreshed', refreshToken: 'refresh-2', expiresAt: '2099-01-01T00:00:00.000Z' };
  },
  deauthorize: async () => {},
  fetchActivities: async (token) => {
    if (token !== 'refreshed') throw new Error('stale token');
    return [activity];
  },
};

describe('Strava client', () => {
  it('asks Strava for the activity window around the chosen dates', () => {
    const window = activityWindow({ from: '2025-06-01', to: '2025-06-01' });
    expect(window.before - window.after).toBeGreaterThan(24 * 60 * 60);
  });

  it('drops fields the workout mapper does not use', () => {
    expect(publicActivity(activity)).toEqual({
      id: 123,
      sport_type: 'Run',
      type: 'Run',
      distance: 5000,
      elapsed_time: 1800,
      start_date: '2025-06-01T06:00:00Z',
      start_date_local: '2025-06-01T08:00:00Z',
    });
  });

  it('exchanges a code without putting the secret in the query string', async () => {
    const calls = [];
    const client = createStravaClient({
      clientId: 'id',
      clientSecret: 'secret',
      fetchImpl: async (url, options) => {
        calls.push({ url: String(url), body: options.body?.toString() });
        return { ok: true, status: 200, json: async () => ({ access_token: 'a', refresh_token: 'r', expires_at: 2_000_000_000 }) };
      },
    });
    const token = await client.exchangeCode('code');
    expect(token.accessToken).toBe('a');
    expect(calls[0].url).toBe('https://www.strava.com/oauth/token');
    expect(calls[0].body).toContain('client_secret=secret');
    expect(client.authorizeUrl('https://treklin.com/api/integrations/strava/callback', 'state')).not.toContain('secret');
  });
});

describe('Strava connection', () => {
  it('connects, returns activities, and disconnects', async () => {
    const { client } = createTestServer({ strava });
    const c = client();
    await register(c);

    const connect = await c.get('/api/integrations/strava/connect');
    expect(connect.status).toBe(302);
    const redirect = new URL(connect.headers.location);
    expect(redirect.origin).toBe('https://www.strava.com');
    const state = redirect.searchParams.get('state');
    expect(redirect.searchParams.get('redirect_uri')).toBe('http://localhost:5173/api/integrations/strava/callback');

    const callback = await c.get(`/api/integrations/strava/callback?code=ok&state=${state}&scope=read,activity:read_all`);
    expect(callback.status).toBe(302);
    expect(callback.headers.location).toContain('strava=connected');
    expect((await c.get('/api/integrations')).body.connected).toEqual(['strava']);

    const activities = await c.get('/api/integrations/strava/activities?from=2025-06-01&to=2025-06-02');
    expect(activities.status).toBe(200);
    expect(activities.body).toEqual([publicActivity(activity)]);
    expect(JSON.stringify(activities.body)).not.toContain('secret');

    expect((await c.del('/api/integrations/strava')).status).toBe(204);
    expect((await c.get('/api/integrations')).body.connected).toEqual([]);
    expect((await c.get('/api/integrations/strava/activities?from=2025-06-01&to=2025-06-02')).status).toBe(404);
  });

  it('refuses a connection that cannot read activities', async () => {
    const { client } = createTestServer({ strava });
    const c = client();
    await register(c);
    const connect = await c.get('/api/integrations/strava/connect');
    const state = new URL(connect.headers.location).searchParams.get('state');
    const callback = await c.get(`/api/integrations/strava/callback?code=ok&state=${state}&scope=read`);
    expect(callback.headers.location).toContain('strava=error');
    expect((await c.get('/api/integrations')).body.connected).toEqual([]);
  });

  it('tells the athlete to add server credentials when Strava is not configured', async () => {
    const { client } = createTestServer();
    const c = client();
    await register(c);
    const connect = await c.get('/api/integrations/strava/connect');
    expect(connect.status).toBe(302);
    expect(connect.headers.location).toContain('strava=error');
    expect(connect.headers.location).toContain('credentials');
  });
});
