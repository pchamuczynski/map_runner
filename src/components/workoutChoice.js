import { ACTIVITIES, LEGACY_OTHER_ACTIVITY } from '../domain/activities';

/** Identity used to select a workout and to tell that it was already imported. */
export const workoutKey = (workout) =>
  workout.externalId == null ? `id:${workout.id}` : `${workout.source}:${workout.externalId}`;

/** Activity types present in a workout list, in the app's usual order. */
export const activityTypesIn = (workouts) => {
  const present = new Set(workouts.map((workout) => workout.activity));
  const types = ACTIVITIES.filter((activity) => present.has(activity));
  if (present.has(LEGACY_OTHER_ACTIVITY)) types.push(LEGACY_OTHER_ACTIVITY);
  return types;
};

/** Workouts whose activity is one of the selected types. */
export const workoutsOfTypes = (workouts, activities) => {
  const allowed = activities instanceof Set ? activities : new Set(activities);
  return workouts.filter((workout) => allowed.has(workout.activity));
};

/** Checks or unchecks one group of workouts without touching the rest of the selection. */
export const withKeysChecked = (selected, workouts, checked) => {
  const next = new Set(selected);
  for (const workout of workouts) {
    const key = workoutKey(workout);
    if (checked) next.add(key);
    else next.delete(key);
  }
  return next;
};

/** Newest first, limited to the date range and the activity types that can be imported. */
export const workoutsInPeriod = (workouts, { from, to, activities }) => {
  const allowed = new Set(activities);
  return [...workouts]
    .filter((workout) => workout.date >= from && workout.date <= to && allowed.has(workout.activity))
    .sort((a, b) => b.date.localeCompare(a.date) || String(b.startedAt ?? '').localeCompare(String(a.startedAt ?? '')));
};

/** Workouts already stored on every route that would accept them. */
export const takenWorkoutKeys = (workouts, routes) => {
  const taken = new Set();
  for (const workout of workouts) {
    const targets = routes.filter((route) => route.activities.includes(workout.activity));
    if (targets.length === 0) continue;
    const key = workoutKey(workout);
    if (targets.every((route) => route.workouts.some((existing) => workoutKey(existing) === key))) taken.add(key);
  }
  return taken;
};
