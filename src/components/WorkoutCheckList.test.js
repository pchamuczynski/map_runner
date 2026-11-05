import { describe, expect, it } from 'vitest';
import { createWorkout } from '../domain/workout';
import { activityTypesIn, takenWorkoutKeys, withKeysChecked, workoutKey, workoutsInPeriod, workoutsOfTypes } from './workoutChoice';

const run = (date, externalId) =>
  createWorkout({ date, activity: 'Running', distance: 5000, source: 'garmin', externalId, startedAt: `${date}T08:00:00.000Z` });

describe('workout checklist', () => {
  it('keeps workouts of the requested types inside the period, newest first', () => {
    const rides = createWorkout({ date: '2025-06-02', activity: 'Cycling', distance: 1000, source: 'garmin', externalId: 'ride' });
    const listed = workoutsInPeriod([run('2025-06-01', 'a'), run('2025-06-03', 'b'), run('2025-07-01', 'c'), rides], {
      from: '2025-06-01',
      to: '2025-06-30',
      activities: ['Running'],
    });
    expect(listed.map((workout) => workout.externalId)).toEqual(['b', 'a']);
  });

  it('lists the activity types that are actually present, in the app order', () => {
    const ride = createWorkout({ date: '2025-06-02', activity: 'Cycling', distance: 1000, source: 'garmin', externalId: 'ride' });
    const other = createWorkout({ date: '2025-06-02', activity: 'Other', distance: 1000, source: 'manual', externalId: 'other' });
    expect(activityTypesIn([ride, run('2025-06-01', 'a'), other])).toEqual(['Running', 'Cycling', 'Other']);
  });

  it('filters the list to the checked activity types and updates only those selections', () => {
    const ride = createWorkout({ date: '2025-06-02', activity: 'Cycling', distance: 1000, source: 'garmin', externalId: 'ride' });
    const workouts = [run('2025-06-01', 'a'), ride];
    expect(workoutsOfTypes(workouts, new Set(['Running'])).map((workout) => workout.externalId)).toEqual(['a']);

    const selected = withKeysChecked(new Set(workouts.map(workoutKey)), [ride], false);
    expect(selected.has(workoutKey(workouts[0]))).toBe(true);
    expect(selected.has(workoutKey(ride))).toBe(false);
  });

  it('marks a workout taken only when every matching route already has it', () => {
    const workout = run('2025-06-01', 'a');
    const route = (id, workouts) => ({ id, activities: ['Running'], workouts });
    expect(takenWorkoutKeys([workout], [route('1', []), route('2', [workout])]).has(workoutKey(workout))).toBe(false);
    expect(takenWorkoutKeys([workout], [route('1', [workout]), route('2', [workout])]).has(workoutKey(workout))).toBe(true);
  });
});
