/**
 * Strava OAuth 2 and activity pull. The client secret and refresh token stay on the server.
 * https://developers.strava.com/docs/authentication/
 */
const AUTHORIZE_URL = 'https://www.strava.com/oauth/authorize';
const TOKEN_URL = 'https://www.strava.com/oauth/token';
const DEAUTHORIZE_URL = 'https://www.strava.com/oauth/deauthorize';
const ACTIVITIES_URL = 'https://www.strava.com/api/v3/athlete/activities';

const SCOPE = 'read,activity:read_all';
const PAGE_SIZE = 200;
const MAX_PAGES = 5;
const PAD_MS = 14 * 60 * 60 * 1000;

export class StravaError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'StravaError';
    this.status = status;
  }
}

/** Epoch-second window Strava uses to filter activities. Dates are widened so a local day is not cut off. */
export const activityWindow = ({ from, to, since, now = Date.now() }) => {
  if (from && to) {
    const start = Date.parse(`${from}T00:00:00.000Z`);
    const end = Date.parse(`${to}T23:59:59.999Z`);
    return { after: Math.floor((start - PAD_MS) / 1000), before: Math.floor((end + PAD_MS) / 1000) };
  }
  const afterMs = Date.parse(since || '1970-01-01T00:00:00.000Z');
  return { after: Math.floor((Number.isFinite(afterMs) ? afterMs : 0) / 1000), before: Math.floor(now / 1000) + 60 };
};

/** Keeps only the fields the workout mapper reads. */
export const publicActivity = (activity) => {
  if (!activity || activity.id == null || typeof activity.start_date !== 'string') return null;
  return {
    id: activity.id,
    sport_type: activity.sport_type ?? activity.type ?? null,
    type: activity.type ?? null,
    distance: activity.distance ?? 0,
    elapsed_time: activity.elapsed_time ?? 0,
    start_date: activity.start_date,
    start_date_local: activity.start_date_local ?? activity.start_date,
  };
};

const tokensFrom = (payload, previousRefresh = '') => ({
  accessToken: payload.access_token,
  refreshToken: payload.refresh_token || previousRefresh,
  expiresAt: new Date(Number(payload.expires_at) * 1000).toISOString(),
  scope: typeof payload.scope === 'string' ? payload.scope : '',
});

export const createStravaClient = ({ clientId = '', clientSecret = '', fetchImpl = fetch } = {}) => {
  const configured = Boolean(clientId && clientSecret);

  const tokenRequest = async (fields) => {
    const response = await fetchImpl(TOKEN_URL, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(fields),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new StravaError(response.status, 'Strava rejected the request');
    if (!payload.access_token) throw new StravaError(502, 'Strava returned no access token');
    return payload;
  };

  return {
    configured,

    authorizeUrl(redirectUri, state) {
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        approval_prompt: 'auto',
        scope: SCOPE,
        state,
      });
      return `${AUTHORIZE_URL}?${params}`;
    },

    async exchangeCode(code) {
      const payload = await tokenRequest({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
      });
      return tokensFrom(payload);
    },

    async refresh(refreshToken) {
      const payload = await tokenRequest({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      });
      return tokensFrom(payload, refreshToken);
    },

    async deauthorize(accessToken) {
      const response = await fetchImpl(DEAUTHORIZE_URL, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ access_token: accessToken }),
      });
      if (!response.ok && response.status !== 401) throw new StravaError(response.status, 'Strava could not disconnect');
    },

    async fetchActivities(accessToken, range) {
      const { after, before } = activityWindow(range);
      const activities = [];
      for (let page = 1; page <= MAX_PAGES; page += 1) {
        const url = new URL(ACTIVITIES_URL);
        url.searchParams.set('after', String(after));
        url.searchParams.set('before', String(before));
        url.searchParams.set('page', String(page));
        url.searchParams.set('per_page', String(PAGE_SIZE));
        const response = await fetchImpl(url, { headers: { Accept: 'application/json', Authorization: `Bearer ${accessToken}` } });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new StravaError(response.status, 'Strava could not list activities');
        const batch = Array.isArray(payload) ? payload : [];
        activities.push(...batch);
        if (batch.length < PAGE_SIZE) break;
      }
      return activities;
    },
  };
};
