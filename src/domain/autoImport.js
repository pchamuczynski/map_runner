/**
 * Per-route automatic import of workouts from connected providers (Strava, Garmin).
 *
 * Rules:
 *  - Only workouts of the selected types are imported.
 *  - Only workouts recorded after auto-import was switched on are imported, never
 *    older ones. Switching it off and on again starts a new window.
 *  - A completed route (covered distance >= route distance) imports nothing more;
 *    the workout that crosses the finish line is the last one.
 *
 * @typedef {object} AutoImportSettings
 * @property {boolean} enabled
 * @property {string[]} activities    Workout types to import - always a subset of the route's activities.
 *                                    Kept while disabled so re-enabling restores the choice.
 * @property {string | null} since    ISO timestamp of when auto-import was switched on; null while off.
 */
import { ACTIVITIES, normalizeActivities } from './activities.js';
import { mergeImportedWorkouts, sortWorkoutsByDate, totalDistance } from './workout.js';

export const DEFAULT_AUTO_IMPORT = Object.freeze({ enabled: false, activities: [], since: null });

const toIsoTimestamp = (value) => {
  if (typeof value !== 'string') return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
};

const allowedOnly = (activities, allowed) => normalizeActivities(activities).filter((a) => allowed.includes(a));

/**
 * Coerces stored or legacy data into valid settings, keeping only types the route allows.
 * Settings left without a valid `since` or without any type are switched off.
 */
export const normalizeAutoImport = (raw, allowed = ACTIVITIES) => {
  const activities = allowedOnly(raw?.activities, allowed);
  const since = toIsoTimestamp(raw?.since);
  const enabled = raw?.enabled === true && since !== null && activities.length > 0;
  return { enabled, activities, since: enabled ? since : null };
};

/**
 * Applies the form's requested settings to a route's current ones. `since` is never
 * taken from the client: it is stamped when auto-import goes from off to on.
 *
 * @param {AutoImportSettings | null} previous  null for a new route
 * @param {{ enabled?: boolean, activities?: string[] } | undefined} requested
 * @param {Date} now
 * @param {string[]} allowed  The route's activities.
 */
export const resolveAutoImport = (previous, requested, now, allowed = ACTIVITIES) => {
  const activities = allowedOnly(requested?.activities, allowed);
  const enabled = requested?.enabled === true && activities.length > 0;
  if (!enabled) return { enabled: false, activities, since: null };
  const wasEnabled = previous?.enabled === true && previous.since !== null;
  return { enabled: true, activities, since: wasEnabled ? previous.since : now.toISOString() };
};

export const validateAutoImport = (settings) => {
  if (!settings?.enabled) return null;
  if (normalizeActivities(settings.activities).length === 0) return 'Select at least one workout type to import';
  return null;
};

export const isRouteCompleted = (route) => route.distance > 0 && totalDistance(route.workouts) >= route.distance;

/** Calendar date of the workout that crosses the finish line, or null while the route is unfinished. */
export const completionDate = (route) => {
  if (!isRouteCompleted(route)) return null;
  let covered = 0;
  for (const workout of sortWorkoutsByDate(route.workouts)) {
    covered += workout.distance;
    if (covered >= route.distance) return workout.date;
  }
  return null;
};

/** Routes that existed and were unfinished, and are finished now. */
export const newlyCompletedRoutes = (previous, next) => {
  const wasCompleted = new Map(previous.map((route) => [route.id, isRouteCompleted(route)]));
  return next.filter((route) => isRouteCompleted(route) && wasCompleted.get(route.id) === false);
};

/** Whether the route is currently collecting imports. */
export const isAutoImportActive = (route) => route.autoImport?.enabled === true && !isRouteCompleted(route);

/**
 * Was the workout recorded after `since`? Imported workouts carry their exact start
 * time; without one we can only compare calendar days (UTC), which errs on the side
 * of excluding same-day workouts rather than importing past ones.
 */
const recordedAfter = (workout, since) =>
  workout.startedAt ? workout.startedAt >= since : workout.date > since.slice(0, 10);

export const routeAcceptsWorkout = (route, workout) =>
  isAutoImportActive(route) &&
  route.autoImport.activities.includes(workout.activity) &&
  recordedAfter(workout, route.autoImport.since);

const chronological = (a, b) =>
  (a.startedAt ?? a.date).localeCompare(b.startedAt ?? b.date) || a.createdAt.localeCompare(b.createdAt);

/**
 * Adds eligible workouts in the order they happened, stopping once the route is
 * complete. Already imported workouts are skipped. An unchanged route keeps its identity.
 */
const acceptUntilComplete = (route, eligible) => {
  const { added } = mergeImportedWorkouts(route.workouts, eligible);
  let covered = totalDistance(route.workouts);
  const accepted = [];
  for (const workout of [...added].sort(chronological)) {
    if (covered >= route.distance) break;
    accepted.push(workout);
    covered += workout.distance;
  }
  if (accepted.length === 0) return { route, added: 0 };
  return {
    route: { ...route, workouts: sortWorkoutsByDate([...route.workouts, ...accepted]) },
    added: accepted.length,
  };
};

/**
 * Adds each imported workout to every route whose auto-import settings accept it.
 * Workouts are applied in the order they happened and a route stops accepting them
 * once it is completed. Already imported workouts (same source + externalId) are
 * skipped, so syncing is idempotent. Unchanged routes keep their identity.
 *
 * @returns {{ routes: import('./route').Route[], addedCount: number }}
 */
export const distributeImportedWorkouts = (routes, workouts) => {
  let addedCount = 0;
  const updated = routes.map((route) => {
    const eligible = workouts.filter((workout) => routeAcceptsWorkout(route, workout));
    if (eligible.length === 0) return route;
    const result = acceptUntilComplete(route, eligible);
    addedCount += result.added;
    return result.route;
  });
  return { routes: updated, addedCount };
};

/**
 * Puts workouts onto the routes the user picked (a historical import). Matches the
 * route's own activity types and ignores the auto-import window. Same de-duplication
 * and completion rules as automatic import.
 *
 * @param {string[]} routeIds
 * @returns {{ routes: import('./route').Route[], addedCount: number }}
 */
export const assignWorkoutsToRoutes = (routes, workouts, routeIds) => {
  const selected = new Set(routeIds);
  let addedCount = 0;
  const updated = routes.map((route) => {
    if (!selected.has(route.id)) return route;
    const eligible = workouts.filter((workout) => route.activities.includes(workout.activity));
    if (eligible.length === 0) return route;
    const result = acceptUntilComplete(route, eligible);
    addedCount += result.added;
    return result.route;
  });
  return { routes: updated, addedCount };
};

/** Earliest `since` across routes still collecting imports, or null when none are. */
export const earliestImportStart = (routes) => {
  let earliest = null;
  for (const route of routes) {
    if (isAutoImportActive(route) && (!earliest || route.autoImport.since < earliest)) earliest = route.autoImport.since;
  }
  return earliest;
};
