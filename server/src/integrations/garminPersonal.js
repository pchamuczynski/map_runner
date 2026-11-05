/**
 * Garmin Connect Personal API. One key reads the key owner's activities only.
 * Summaries are reduced to the Health API fields the rest of the app already stores.
 */
import { GarminError } from './garmin.js';

const BASE_URL = 'https://personal.connectapi.garmin.com';
const TOKEN_URL = `${BASE_URL}/personalapitoken-service/personal-api/personal-api-key/token`;
const SEARCH_URL = `${BASE_URL}/activitylist-service/activities/search/activities`;

const PAGE_SIZE = 100;
const MAX_PAGES = 20;
const REFRESH_BEFORE_MS = 60 * 60 * 1000;

const TYPE_KEYS = Object.freeze({
  running: 'RUNNING',
  trail_running: 'TRAIL_RUNNING',
  treadmill_running: 'TREADMILL_RUNNING',
  street_running: 'STREET_RUNNING',
  track_running: 'TRACK_RUNNING',
  walking: 'WALKING',
  casual_walking: 'CASUAL_WALKING',
  speed_walking: 'SPEED_WALKING',
  hiking: 'HIKING',
  cycling: 'CYCLING',
  road_biking: 'ROAD_BIKING',
  mountain_biking: 'MOUNTAIN_BIKING',
  gravel_cycling: 'GRAVEL_CYCLING',
  indoor_cycling: 'INDOOR_CYCLING',
  virtual_ride: 'INDOOR_CYCLING',
  swimming: 'SWIMMING',
  lap_swimming: 'LAP_SWIMMING',
  open_water_swimming: 'OPEN_WATER_SWIMMING',
  kayaking: 'KAYAKING',
  kayaking_v2: 'KAYAKING',
  cross_country_skiing: 'CROSS_COUNTRY_SKIING_WS',
  cross_country_skiing_ws: 'CROSS_COUNTRY_SKIING_WS',
  skate_skiing: 'SKATE_SKIING_WS',
  skate_skiing_ws: 'SKATE_SKIING_WS',
});

const parseClock = (value) => {
  const match = typeof value === 'string' && value.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/);
  if (!match) return null;
  const ms = Date.parse(`${match[1]}T${match[2]}Z`);
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : null;
};

const healthType = (activityType) => {
  if (typeof activityType === 'string' && activityType) return TYPE_KEYS[activityType.toLowerCase()] || activityType;
  const key = activityType?.typeKey;
  if (typeof key !== 'string' || !key) return null;
  return TYPE_KEYS[key.toLowerCase()] || key.toUpperCase();
};

/** Keeps the fields the workout mapper needs and drops account and location details. */
export const toHealthSummary = (activity) => {
  const activityType = healthType(activity?.activityType);
  const start = Number.isFinite(Number(activity?.startTimeInSeconds)) ? Number(activity.startTimeInSeconds) : parseClock(activity?.startTimeGMT);
  const local = parseClock(activity?.startTimeLocal);
  if (activity?.activityId == null || !activityType || start == null) return null;
  const distance = Number(activity.distanceInMeters ?? activity.distance);
  return {
    activityId: activity.activityId,
    activityType,
    distanceInMeters: Number.isFinite(distance) ? distance : 0,
    startTimeInSeconds: start,
    startTimeOffsetInSeconds: local == null ? Number(activity.startTimeOffsetInSeconds) || 0 : local - start,
  };
};

const jwtExpiry = (token) => {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    const exp = Number(payload.exp);
    return Number.isFinite(exp) ? exp * 1000 : 0;
  } catch {
    return 0;
  }
};

const isoDate = (value) => {
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString().slice(0, 10) : null;
};

/**
 * @param {{ apiKey?: string, pageSize?: number }} [options]
 * @param {typeof fetch} [fetchImpl]
 */
export const createPersonalGarminClient = ({ apiKey = '', pageSize = PAGE_SIZE } = {}, fetchImpl = fetch) => {
  const configured = Boolean(apiKey);
  let cached = null;

  const accessToken = async () => {
    if (cached && cached.expiresAt - Date.now() > REFRESH_BEFORE_MS) return cached.token;
    const response = await fetchImpl(TOKEN_URL, {
      method: 'POST',
      headers: { Authorization: `ApiKey ${apiKey}`, Accept: '*/*' },
    });
    const text = (await response.text()).trim();
    if (!response.ok || !text) throw new GarminError(response.status || 502, 'Garmin personal token request failed');
    const expiresAt = jwtExpiry(text);
    if (!expiresAt) throw new GarminError(502, 'Garmin did not return a token');
    cached = { token: text, expiresAt };
    return text;
  };

  const searchPage = async (token, { startDate, endDate, start }) => {
    const params = new URLSearchParams({
      start: String(start),
      limit: String(pageSize),
      startDate,
      endDate,
    });
    const response = await fetchImpl(`${SEARCH_URL}?${params}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    if (response.status === 401) {
      cached = null;
      throw new GarminError(401, 'Garmin rejected the personal key');
    }
    if (!response.ok) throw new GarminError(response.status, `Garmin request failed (${response.status})`);
    const body = await response.json();
    return Array.isArray(body) ? body : [];
  };

  return {
    configured,
    personal: true,

    async fetchActivities(_credentials, { from, to, since } = {}) {
      const endDate = to || new Date().toISOString().slice(0, 10);
      const startDate = from || isoDate(since) || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const sinceMs = since ? Date.parse(since) : NaN;

      const load = async () => {
        const token = await accessToken();
        const activities = [];
        for (let page = 0; page < MAX_PAGES; page += 1) {
          const batch = await searchPage(token, { startDate, endDate, start: page * pageSize });
          activities.push(...batch);
          if (batch.length < pageSize) break;
        }
        return activities;
      };

      let activities;
      try {
        activities = await load();
      } catch (error) {
        if (error?.status !== 401) throw error;
        cached = null;
        activities = await load();
      }

      return activities
        .map(toHealthSummary)
        .filter(Boolean)
        .filter((summary) => !Number.isFinite(sinceMs) || summary.startTimeInSeconds * 1000 >= sinceMs);
    },

    async deregister() {},
  };
};
