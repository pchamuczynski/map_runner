import { describe, expect, it } from 'vitest';
import { createWorkout } from '../domain/workout';
import { takenWorkoutKeys, workoutKey, workoutsInPeriod } from './workoutChoice';

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

  it('marks a workout taken only when every matching route already has it', () => {
    const workout = run('2025-06-01', 'a');
    const route = (id, workouts) => ({ id, activities: ['Running'], workouts });
    expect(takenWorkoutKeys([workout], [route('1', []), route('2', [workout])]).has(workoutKey(workout))).toBe(false);
    expect(takenWorkoutKeys([workout], [route('1', [workout]), route('2', [workout])]).has(workoutKey(workout))).toBe(true);
  });
});
