/**
 * Maps Garmin Connect activity summaries (Garmin Activity API) onto app workouts.
 * Unsupported activity types are skipped.
 *
 * TODO: verify the type keys against the Garmin Activity API docs once developer
 * access is granted - in particular a dedicated rollerski type, if Garmin has one.
 */
import { WORKOUT_SOURCES, createWorkout } from '../../domain/workout';

const ACTIVITY_TYPE_TO_ACTIVITY = Object.freeze({
  RUNNING: 'Running',
  TRAIL_RUNNING: 'Running',
  TREADMILL_RUNNING: 'Running',
  STREET_RUNNING: 'Running',
  TRACK_RUNNING: 'Running',
  WALKING: 'Walking',
  CASUAL_WALKING: 'Walking',
  SPEED_WALKING: 'Walking',
  HIKING: 'Hiking',
  CYCLING: 'Cycling',
  ROAD_BIKING: 'Cycling',
  MOUNTAIN_BIKING: 'Cycling',
  GRAVEL_CYCLING: 'Cycling',
  INDOOR_CYCLING: 'Cycling',
  SWIMMING: 'Swimming',
  LAP_SWIMMING: 'Swimming',
  OPEN_WATER_SWIMMING: 'Swimming',
  KAYAKING: 'Kayaking',
  KAYAKING_V2: 'Kayaking',
  CROSS_COUNTRY_SKIING_WS: 'Cross-country skiing',
  SKATE_SKIING_WS: 'Cross-country skiing',
});

export const mapGarminActivity = (summary) => {
  const kind = ACTIVITY_TYPE_TO_ACTIVITY[summary?.activityType];
  const distance = Number(summary?.distanceInMeters);
  const start = Number(summary?.startTimeInSeconds);
  const offset = Number(summary?.startTimeOffsetInSeconds) || 0;
  const externalId = summary?.activityId ?? summary?.summaryId;
  if (!kind || !(distance > 0) || !Number.isFinite(start) || externalId == null) return null;

  return createWorkout({
    // Shift by the recorded UTC offset to get the user's local calendar day.
    date: new Date((start + offset) * 1000).toISOString().slice(0, 10),
    activity: kind,
    distance,
    source: WORKOUT_SOURCES.GARMIN,
    externalId,
    startedAt: new Date(start * 1000).toISOString(),
  });
};
