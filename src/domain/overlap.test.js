import { describe, expect, it } from 'vitest';
import { countOverlappingImports, describeImportResult, intervalsOverlap, workoutInterval } from './overlap';
import { createWorkout } from './workout';

const at = (startedAt, externalId, duration) =>
  createWorkout({ date: startedAt.slice(0, 10), activity: 'Running', distance: 1000, duration, source: 'garmin', externalId, startedAt });

describe('workout intervals', () => {
  it('treats a missing duration as an instant and ignores a workout with no start', () => {
    expect(workoutInterval(at('2025-06-01T08:00:00.000Z', 'a', 60))).toEqual({
      start: Date.parse('2025-06-01T08:00:00.000Z'),
      end: Date.parse('2025-06-01T08:01:00.000Z'),
    });
    expect(workoutInterval(at('2025-06-01T08:00:00.000Z', 'a', null)).end).toBe(Date.parse('2025-06-01T08:00:00.000Z'));
    expect(workoutInterval(createWorkout({ date: '2025-06-01', activity: 'Running', distance: 1000 }))).toBeNull();
  });

  it('overlaps a shared start and not a back-to-back pair', () => {
    const first = { start: 0, end: 1000 };
    expect(intervalsOverlap(first, { start: 500, end: 1500 })).toBe(true);
    expect(intervalsOverlap(first, { start: 1000, end: 2000 })).toBe(false);
    expect(intervalsOverlap(first, { start: 0, end: 0 })).toBe(true);
    expect(intervalsOverlap({ start: 1000, end: 1000 }, { start: 1000, end: 1000 })).toBe(true);
  });

  it('does not treat a repeat of the same recording as an overlap', () => {
    const stored = at('2025-06-01T08:00:00.000Z', 'a', 3600);
    const again = at('2025-06-01T08:00:00.000Z', 'a', 3600);
    const other = at('2025-06-01T08:30:00.000Z', 'b', 600);
    expect(countOverlappingImports([stored], [again, other])).toBe(1);
  });

  it('describes what an import did', () => {
    expect(describeImportResult({ added: 2, name: 'Berlin' })).toBe('Added 2 workouts to Berlin.');
    expect(describeImportResult({ filled: 1 })).toBe('Recorded the elapsed time on 1 workout.');
    expect(describeImportResult({ overlaps: 2, policy: 'old' })).toBe('2 overlapping workouts were left out.');
    expect(describeImportResult({ overlaps: 1, removed: 1, policy: 'new' })).toBe(
      '1 overlapping workout replaced 1 already on the route.',
    );
    expect(describeImportResult({})).toBe('Nothing new was added. These workouts may already be on the route.');
  });
});
