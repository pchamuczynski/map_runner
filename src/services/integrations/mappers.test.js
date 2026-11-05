import { describe, expect, it } from 'vitest';
import { mapGarminActivity } from './garmin';
import { mapStravaActivity } from './strava';

describe('Strava mapper', () => {
  it('maps a run using the local start date', () => {
    const workout = mapStravaActivity({
      id: 123,
      sport_type: 'TrailRun',
      distance: 10432.5,
      elapsed_time: 5400,
      start_date: '2025-06-01T21:30:00Z',
      start_date_local: '2025-06-01T23:30:00Z',
    });
    expect(workout).toMatchObject({
      date: '2025-06-01',
      activity: 'Running',
      distance: 10433,
      duration: 5400,
      source: 'strava',
      externalId: '123',
      startedAt: '2025-06-01T21:30:00.000Z',
    });
  });

  it('maps the new activity types', () => {
    const base = { id: 1, distance: 1000, start_date: '2025-01-01T08:00:00Z', start_date_local: '2025-01-01T09:00:00Z' };
    expect(['Swim', 'Kayaking', 'RollerSki', 'NordicSki'].map((sport_type) => mapStravaActivity({ ...base, sport_type }).activity)).toEqual([
      'Swimming',
      'Kayaking',
      'Rollerski',
      'Cross-country skiing',
    ]);
  });

  it('skips unsupported or empty activities', () => {
    expect(mapStravaActivity({ id: 1, sport_type: 'Yoga', distance: 0, start_date_local: '2025-06-01T08:00:00Z' })).toBeNull();
    expect(mapStravaActivity({ id: 1, sport_type: 'Run', distance: 0, start_date_local: '2025-06-01T08:00:00Z' })).toBeNull();
  });
});

describe('Garmin mapper', () => {
  it('maps a ride using the recorded timezone offset', () => {
    // 2025-06-01T23:30:00Z, recorded at UTC+2 -> local date is June 2nd
    const workout = mapGarminActivity({
      summaryId: 's-1',
      activityId: 987,
      activityType: 'ROAD_BIKING',
      distanceInMeters: 42000,
      durationInSeconds: 3661,
      startTimeInSeconds: Date.UTC(2025, 5, 1, 23, 30) / 1000,
      startTimeOffsetInSeconds: 7200,
    });
    expect(workout).toMatchObject({
      date: '2025-06-02',
      activity: 'Cycling',
      duration: 3661,
      source: 'garmin',
      externalId: '987',
      startedAt: '2025-06-01T23:30:00.000Z',
    });
  });

  it('skips unsupported activity types', () => {
    expect(mapGarminActivity({ activityId: 1, activityType: 'YOGA', distanceInMeters: 1, startTimeInSeconds: 0 })).toBeNull();
  });
});
