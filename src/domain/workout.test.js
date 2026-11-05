import { describe, expect, it } from 'vitest';
import { createWorkout, latestWorkout, mergeImportedWorkouts, sortWorkoutsByDate, validateWorkoutInput } from './workout';

const TODAY = '2025-06-20';

describe('validateWorkoutInput', () => {
  it('accepts valid input', () => {
    expect(validateWorkoutInput({ date: TODAY, activity: 'Running', distanceKm: '5.2' }, TODAY)).toEqual({});
  });

  it('rejects zero, negative and absurd distances', () => {
    for (const distanceKm of ['0', '-3', 'abc', '', '5000']) {
      expect(validateWorkoutInput({ date: TODAY, activity: 'Running', distanceKm }, TODAY)).toHaveProperty('distance');
    }
  });

  it('rejects future and invalid dates, and unknown activities', () => {
    const errors = validateWorkoutInput({ date: '2025-06-21', activity: 'Flying', distanceKm: '1' }, TODAY);
    expect(errors).toHaveProperty('date');
    expect(errors).toHaveProperty('activity');
    expect(validateWorkoutInput({ date: '2025-02-30', activity: 'Running', distanceKm: '1' }, TODAY)).toHaveProperty('date');
  });
});

describe('workout helpers', () => {
  const a = { ...createWorkout({ date: '2025-01-02', activity: 'Running', distance: 1000 }) };
  const b = { ...createWorkout({ date: '2025-01-01', activity: 'Cycling', distance: 2000 }) };

  it('sorts without mutating the input', () => {
    const input = [a, b];
    expect(sortWorkoutsByDate(input)).toEqual([b, a]);
    expect(input).toEqual([a, b]);
  });

  it('finds the latest workout', () => {
    expect(latestWorkout([b, a])).toBe(a);
    expect(latestWorkout([])).toBeNull();
  });

  it('de-duplicates imported workouts by source and external id', () => {
    const imported = createWorkout({ date: '2025-01-03', activity: 'Running', distance: 5000, source: 'strava', externalId: 42 });
    const first = mergeImportedWorkouts([a], [imported]);
    expect(first.added).toHaveLength(1);

    const again = createWorkout({ date: '2025-01-03', activity: 'Running', distance: 5000, source: 'strava', externalId: '42' });
    const second = mergeImportedWorkouts(first.workouts, [again]);
    expect(second.added).toHaveLength(0);
    expect(second.workouts).toHaveLength(2);
    expect(second.filled).toBe(false);
    expect(second.workouts).toBe(first.workouts);
  });

  it('fills elapsed time onto a workout that was imported before duration was stored', () => {
    const imported = createWorkout({ date: '2025-01-03', activity: 'Running', distance: 5000, source: 'garmin', externalId: '7' });
    const withTime = createWorkout({ date: '2025-01-03', activity: 'Running', distance: 5000, duration: 1830, source: 'garmin', externalId: '7' });
    const merged = mergeImportedWorkouts([imported], [withTime]);
    expect(merged.added).toHaveLength(0);
    expect(merged.filled).toBe(true);
    expect(merged.workouts[0].duration).toBe(1830);
    expect(merged.workouts[0].id).toBe(imported.id);
  });
});
