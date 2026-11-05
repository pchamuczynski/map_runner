/**
 * Validation of untrusted data (browser storage today, API responses later).
 * Anything malformed is dropped rather than allowed to crash the UI.
 * Also migrates the legacy v1 shape (numeric ids, `created`, `timestamp`, stored `coveredDistance`).
 */
import { isValidCoordinate } from '../lib/geo.js';
import { isWorkoutActivity, normalizeActivities } from './activities.js';
import { normalizeAutoImport } from './autoImport.js';
import { ROUTE_LIMITS, cleanText } from './route.js';
import { WORKOUT_LIMITS, WORKOUT_SOURCES, durationSeconds, isValidIsoDate, sortWorkoutsByDate } from './workout.js';

const SOURCES = new Set(Object.values(WORKOUT_SOURCES));

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const toId = (value) => (typeof value === 'string' || Number.isFinite(value) ? String(value).slice(0, 64) : null);

const toIsoTimestamp = (value, fallback) => {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? new Date(time).toISOString() : fallback;
};

const nonNegative = (value) => (Number.isFinite(value) && value >= 0 ? value : 0);

export const sanitizeWorkout = (raw) => {
  if (!isPlainObject(raw)) return null;
  const id = toId(raw.id);
  const distance = Number(raw.distance);
  if (
    !id ||
    !isValidIsoDate(raw.date) ||
    !isWorkoutActivity(raw.activity) ||
    !Number.isFinite(distance) ||
    distance <= 0 ||
    distance > WORKOUT_LIMITS.MAX_DISTANCE_M
  ) {
    return null;
  }
  return {
    id,
    date: raw.date,
    activity: raw.activity,
    distance,
    duration: durationSeconds(raw.duration),
    source: SOURCES.has(raw.source) ? raw.source : WORKOUT_SOURCES.MANUAL,
    externalId: raw.externalId == null ? null : toId(raw.externalId),
    startedAt: raw.startedAt == null ? null : toIsoTimestamp(raw.startedAt, null),
    createdAt: toIsoTimestamp(raw.createdAt ?? raw.timestamp, `${raw.date}T00:00:00.000Z`),
  };
};

export const sanitizeRoute = (raw) => {
  if (!isPlainObject(raw)) return null;
  const id = toId(raw.id);
  const from = cleanText(raw.from, ROUTE_LIMITS.MAX_LOCATION_LENGTH);
  const to = cleanText(raw.to, ROUTE_LIMITS.MAX_LOCATION_LENGTH);
  const coordinates = Array.isArray(raw.coordinates)
    ? raw.coordinates.slice(0, ROUTE_LIMITS.MAX_COORDINATES).filter(isValidCoordinate).map(([lat, lng]) => [lat, lng])
    : [];
  if (!id || !from || !to || coordinates.length < 2) return null;

  const workouts = Array.isArray(raw.workouts) ? raw.workouts.map(sanitizeWorkout).filter(Boolean) : [];
  // Legacy free-text tags ("running", "XC ski") are mapped onto supported activities; unknown ones are dropped.
  const activities = normalizeActivities(raw.activities);

  const createdAt = toIsoTimestamp(raw.createdAt ?? raw.created, new Date(0).toISOString());

  return {
    id,
    name: cleanText(raw.name, ROUTE_LIMITS.MAX_NAME_LENGTH) || `${from} → ${to}`.slice(0, ROUTE_LIMITS.MAX_NAME_LENGTH),
    from,
    to,
    activities,
    coordinates,
    distance: nonNegative(Number(raw.distance)),
    duration: nonNegative(Number(raw.duration)),
    provider: cleanText(raw.provider, 20) || 'unknown',
    // Routes saved before auto-import existed get it switched off.
    autoImport: normalizeAutoImport(raw.autoImport, activities),
    workouts: sortWorkoutsByDate(workouts),
    createdAt,
  };
};

export const sanitizeRoutes = (raw) => {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const routes = [];
  for (const item of raw) {
    const route = sanitizeRoute(item);
    if (route && !seen.has(route.id)) {
      seen.add(route.id);
      routes.push(route);
    }
  }
  return routes;
};
