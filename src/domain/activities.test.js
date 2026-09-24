import { describe, expect, it } from 'vitest';
import { ACTIVITIES, isWorkoutActivity, normalizeActivities, normalizeActivity } from './activities';
import { validateRouteInput } from './route';
import { validateWorkoutInput } from './workout';

describe('activities', () => {
  it('supports the full list', () => {
    expect(ACTIVITIES).toEqual(['Running', 'Walking', 'Hiking', 'Cycling', 'Swimming', 'Kayaking', 'Rollerski', 'Cross-country skiing']);
  });

  it('maps free text and aliases onto supported activities', () => {
    expect(normalizeActivity('cycling')).toBe('Cycling');
    expect(normalizeActivity(' Roller-ski ')).toBe('Rollerski');
    expect(normalizeActivity('XC ski')).toBe('Cross-country skiing');
    expect(normalizeActivity('Nordic skiing')).toBe('Cross-country skiing');
    expect(normalizeActivity('Yoga')).toBeNull();
  });

  it('normalizes lists: unknown dropped, duplicates removed, canonical order', () => {
    expect(normalizeActivities(['swim', 'Running', 'yoga', 'run', 'Kayak'])).toEqual(['Running', 'Swimming', 'Kayaking']);
    expect(normalizeActivities(undefined)).toEqual([]);
  });

  it('keeps legacy "Other" valid for stored workouts only', () => {
    expect(isWorkoutActivity('Other')).toBe(true);
    expect(ACTIVITIES).not.toContain('Other');
  });

  it('requires at least one supported activity on a route', () => {
    expect(validateRouteInput({ from: 'A', to: 'B', activities: [] })).toHaveProperty('activities');
    expect(validateRouteInput({ from: 'A', to: 'B', activities: ['Swimming'] })).not.toHaveProperty('activities');
  });

  it('limits workouts to the allowed activities', () => {
    const input = { date: '2025-01-01', activity: 'Kayaking', distanceKm: '3' };
    expect(validateWorkoutInput(input, '2025-01-02', ['Running'])).toHaveProperty('activity');
    expect(validateWorkoutInput(input, '2025-01-02', ['Running', 'Kayaking'])).toEqual({});
  });
});
