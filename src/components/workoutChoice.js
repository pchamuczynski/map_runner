/** Identity used to select a workout and to tell that it was already imported. */
export const workoutKey = (workout) =>
  workout.externalId == null ? `id:${workout.id}` : `${workout.source}:${workout.externalId}`;

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
