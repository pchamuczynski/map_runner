import { describe, expect, it } from 'vitest';
import { createPersonalGarminClient } from '../src/integrations/garminPersonal.js';

const jwt = (expSeconds) => {
  const payload = Buffer.from(JSON.stringify({ exp: expSeconds })).toString('base64url');
  return `header.${payload}.sig`;
};

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('Garmin personal API client', () => {
  it('exchanges the key for a token and keeps only workout fields', async () => {
    const calls = [];
    const fetchImpl = async (url, options) => {
      calls.push({ url, authorization: options.headers.Authorization });
      if (String(url).includes('/token')) return new Response(jwt(Math.floor(Date.now() / 1000) + 86_400), { status: 200 });
      const start = Number(new URL(url).searchParams.get('start'));
      if (start === 0) {
        return jsonResponse([
          {
            activityId: 1,
            activityType: { typeKey: 'running', typeId: 1 },
            distance: 5000.4,
            startTimeGMT: '2025-06-01 21:30:00',
            startTimeLocal: '2025-06-01 23:30:00',
            ownerFullName: 'Patryk',
            startLatitude: 52.2,
          },
        ]);
      }
      return jsonResponse([]);
    };

    const client = createPersonalGarminClient({ apiKey: 'personal-key', pageSize: 1 }, fetchImpl);
    const summaries = await client.fetchActivities(null, { from: '2025-06-01', to: '2025-06-02' });

    expect(client.configured).toBe(true);
    expect(calls[0].authorization).toBe('ApiKey personal-key');
    expect(calls[0].url).not.toContain('personal-key');
    expect(calls.filter((call) => call.url.includes('/activities'))).toHaveLength(2);
    expect(summaries).toEqual([
      {
        activityId: 1,
        activityType: 'RUNNING',
        distanceInMeters: 5000.4,
        startTimeInSeconds: Date.parse('2025-06-01T21:30:00Z') / 1000,
        startTimeOffsetInSeconds: 7200,
      },
    ]);
    expect(JSON.stringify(summaries)).not.toMatch(/Patryk|startLatitude/);
  });

  it('requests a new token once when a search is rejected', async () => {
    let searches = 0;
    const fetchImpl = async (url) => {
      if (String(url).includes('/token')) return new Response(jwt(Math.floor(Date.now() / 1000) + 86_400), { status: 200 });
      searches += 1;
      if (searches === 1) return jsonResponse({ message: 'expired' }, 401);
      return jsonResponse([]);
    };
    const client = createPersonalGarminClient({ apiKey: 'personal-key' }, fetchImpl);
    await expect(client.fetchActivities(null, { from: '2025-06-01', to: '2025-06-02' })).resolves.toEqual([]);
    expect(searches).toBe(2);
  });

  it('is unconfigured without a key', () => {
    expect(createPersonalGarminClient().configured).toBe(false);
  });
});
