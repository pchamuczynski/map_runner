/**
 * Route model and rules.
 *
 * @typedef {object} RouteGeometry
 * @property {Array<[number, number]>} coordinates  `[lat, lng]` points.
 * @property {number} distance  Meters along the road network.
 * @property {number} duration  Seconds (as estimated by the routing provider).
 * @property {string} provider  Routing provider id.
 *
 * @typedef {RouteGeometry & {
 *   id: string,
 *   name: string,
 *   from: string,
 *   to: string,
 *   activities: string[],   // supported activities (see activities.js) this route counts
 *   autoImport: import('./autoImport').AutoImportSettings,
 *   workouts: import('./workout').Workout[],
 *   createdAt: string,
 * }} Route
 */
import { createId } from '../lib/id';
import { normalizeActivities } from './activities';
import { resolveAutoImport, validateAutoImport } from './autoImport';
import { sortWorkoutsByDate, totalDistance } from './workout';

export const ROUTE_LIMITS = Object.freeze({
  MAX_NAME_LENGTH: 100,
  MAX_LOCATION_LENGTH: 200,
  MAX_COORDINATES: 50_000,
});

export const DEFAULT_ROUTE_ACTIVITIES = Object.freeze(['Running']);

/** Collapses whitespace and strips control characters from user-entered text. */
export const cleanText = (value, maxLength) =>
  String(value ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);

export const validateRouteInput = ({ from, to, activities, autoImport }) => {
  const errors = {};
  if (!cleanText(from, ROUTE_LIMITS.MAX_LOCATION_LENGTH)) errors.from = 'Enter a start location';
  if (!cleanText(to, ROUTE_LIMITS.MAX_LOCATION_LENGTH)) errors.to = 'Enter a destination';
  if (normalizeActivities(activities).length === 0) errors.activities = 'Select at least one activity';
  const autoImportError = validateAutoImport(autoImport);
  if (autoImportError) errors.autoImport = autoImportError;
  return errors;
};

const buildDetails = ({ name, from, to, activities }) => {
  const cleanFrom = cleanText(from, ROUTE_LIMITS.MAX_LOCATION_LENGTH);
  const cleanTo = cleanText(to, ROUTE_LIMITS.MAX_LOCATION_LENGTH);
  return {
    name: cleanText(name, ROUTE_LIMITS.MAX_NAME_LENGTH) || `${cleanFrom} → ${cleanTo}`.slice(0, ROUTE_LIMITS.MAX_NAME_LENGTH),
    from: cleanFrom,
    to: cleanTo,
    activities: normalizeActivities(activities),
  };
};

const pickGeometry = ({ coordinates, distance, duration, provider }) => ({ coordinates, distance, duration, provider });

/** @returns {Route} */
export const createRoute = (details, geometry, now = new Date()) => {
  const clean = buildDetails(details);
  return {
    id: createId(),
    ...clean,
    ...pickGeometry(geometry),
    autoImport: resolveAutoImport(null, details.autoImport, now, clean.activities),
    workouts: [],
    createdAt: new Date().toISOString(),
  };
};

/** Applies edited details and (optionally recalculated) geometry, keeping id and workouts. */
export const updateRoute = (route, details, geometry = route, now = new Date()) => {
  const clean = buildDetails(details);
  return {
    ...route,
    ...clean,
    ...pickGeometry(geometry),
    autoImport: resolveAutoImport(route.autoImport, details.autoImport, now, clean.activities),
  };
};

export const withWorkouts = (route, workouts) => ({ ...route, workouts: sortWorkoutsByDate(workouts) });

export const getCoveredDistance = (route) => totalDistance(route.workouts);

/** Progress ratio in 0..1. */
export const getProgress = (route) =>
  route.distance > 0 ? Math.min(getCoveredDistance(route) / route.distance, 1) : 0;
