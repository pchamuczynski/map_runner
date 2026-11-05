/**
 * Garmin Health API client (OAuth 1.0a + activity pull and backfill).
 * New activities normally arrive on the push endpoint; backfill asks Garmin to
 * send history, which it delivers the same way.
 */
import { authorizationHeader, oauthParams, signOauth1 } from './oauth1.js';

const REQUEST_TOKEN_URL = 'https://connectapi.garmin.com/oauth-service/oauth/request_token';
const ACCESS_TOKEN_URL = 'https://connectapi.garmin.com/oauth-service/oauth/access_token';
const AUTHORIZE_URL = 'https://connect.garmin.com/oauthConfirm';
const API_URL = 'https://apis.garmin.com/wellness-api/rest';

const DAY = 24 * 60 * 60;
const BACKFILL_DAYS = 30;

export class GarminError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'GarminError';
    this.status = status;
  }
}

const form = (text) => Object.fromEntries(new URLSearchParams(text));

const asSummaries = (body) => {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.activities)) return body.activities.filter((item) => item?.activityType || item?.activityId || item?.summaryId);
  return [];
};

/** Drops the user's access token before a summary is stored or sent to the browser. */
export const publicSummary = (summary) => {
  if (!summary || typeof summary !== 'object') return null;
  const rest = { ...summary };
  delete rest.userAccessToken;
  delete rest.userId;
  return rest;
};

const unixDay = (isoDate, endOfDay) => {
  const time = Date.parse(`${isoDate}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`);
  return Number.isFinite(time) ? Math.floor(time / 1000) : null;
};

const backfillWindows = (from, to) => {
  const start = unixDay(from, false);
  const end = unixDay(to, true);
  if (start == null || end == null || start > end) return [];
  const windows = [];
  for (let cursor = start; cursor <= end; cursor += BACKFILL_DAYS * DAY) {
    windows.push([cursor, Math.min(cursor + BACKFILL_DAYS * DAY - 1, end)]);
  }
  return windows;
};

/**
 * @param {{ consumerKey: string, consumerSecret: string }} credentials
 * @param {typeof fetch} [fetchImpl]
 */
export const createGarminClient = ({ consumerKey = '', consumerSecret = '' } = {}, fetchImpl = fetch) => {
  const configured = Boolean(consumerKey && consumerSecret);

  const signed = async (method, url, query, token) => {
    const { oauth, all } = oauthParams({ consumerKey, token: token?.token, extra: query });
    oauth.oauth_signature = signOauth1({
      method,
      url,
      params: all,
      consumerSecret,
      tokenSecret: token?.secret ?? '',
    });
    // Protocol parameters travel in the header; the request query is only the API's own arguments.
    const requestQuery = {};
    for (const [key, value] of Object.entries(query)) {
      if (key.startsWith('oauth_')) oauth[key] = value;
      else requestQuery[key] = value;
    }
    const qs = new URLSearchParams(Object.entries(requestQuery).map(([key, value]) => [key, String(value)])).toString();
    const response = await fetchImpl(qs ? `${url}?${qs}` : url, {
      method,
      headers: { Authorization: authorizationHeader(oauth), Accept: 'application/json' },
    });
    const text = await response.text();
    if (response.status === 409) return null;
    if (!response.ok) {
      throw new GarminError(response.status, `Garmin request failed (${response.status})`);
    }
    if (!text) return null;
    const json = response.headers.get('content-type')?.includes('json');
    return json ? JSON.parse(text) : form(text);
  };

  return {
    configured,

    async beginConnect(callbackUrl) {
      const body = await signed('POST', REQUEST_TOKEN_URL, { oauth_callback: callbackUrl });
      if (!body?.oauth_token || !body?.oauth_token_secret) throw new GarminError(502, 'Garmin did not return a request token');
      return {
        requestToken: body.oauth_token,
        requestSecret: body.oauth_token_secret,
        authorizeUrl: `${AUTHORIZE_URL}?oauth_token=${encodeURIComponent(body.oauth_token)}`,
      };
    },

    async finishConnect({ requestToken, requestSecret, verifier }) {
      const body = await signed('POST', ACCESS_TOKEN_URL, { oauth_verifier: verifier }, { token: requestToken, secret: requestSecret });
      if (!body?.oauth_token || !body?.oauth_token_secret) throw new GarminError(502, 'Garmin did not return an access token');
      return { token: body.oauth_token, secret: body.oauth_token_secret };
    },

    /**
     * Recent uploads (last 24h, the API's maximum window) plus a backfill request
     * when a history range is given. Backfill is delivered later to the push endpoint.
     */
    async fetchActivities(token, { from, to, since } = {}) {
      const credentials = { token: token.token, secret: token.secret ?? token.token_secret };
      if (from && to) {
        for (const [summaryStartTimeInSeconds, summaryEndTimeInSeconds] of backfillWindows(from, to)) {
          await signed(
            'GET',
            `${API_URL}/backfill/activities`,
            { summaryStartTimeInSeconds, summaryEndTimeInSeconds },
            credentials,
          );
        }
      }
      const end = Math.floor(Date.now() / 1000);
      const sinceSec = since ? Math.floor(Date.parse(since) / 1000) : end - DAY;
      const uploadStartTimeInSeconds = Math.max(end - DAY, Number.isFinite(sinceSec) ? sinceSec : end - DAY);
      const pulled = await signed('GET', `${API_URL}/activities`, { uploadStartTimeInSeconds, uploadEndTimeInSeconds: end }, credentials);
      return asSummaries(pulled).map(publicSummary).filter(Boolean);
    },

    /** Fetches a ping notification's callback, which must stay on Garmin's API host. */
    async pullUrl(token, callbackUrl) {
      const url = new URL(callbackUrl);
      if (url.protocol !== 'https:' || !['apis.garmin.com', 'healthapi.garmin.com'].includes(url.hostname)) {
        throw new GarminError(400, 'Unexpected Garmin callback');
      }
      const credentials = { token: token.token, secret: token.secret ?? token.token_secret };
      const pulled = await signed('GET', `${url.origin}${url.pathname}`, Object.fromEntries(url.searchParams), credentials);
      return asSummaries(pulled).map(publicSummary).filter(Boolean);
    },

    async deregister(token) {
      const credentials = { token: token.token, secret: token.secret ?? token.token_secret };
      try {
        await signed('DELETE', `${API_URL}/user/registration`, {}, credentials);
      } catch (error) {
        if (error?.status !== 401 && error?.status !== 404) throw error;
      }
    },
  };
};
