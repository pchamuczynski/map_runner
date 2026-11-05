/**
 * Maps Strava activities (https://developers.strava.com/docs/reference/#api-models-SummaryActivity)
 * onto app workouts. Unsupported sport types are skipped.
 */
import { WORKOUT_SOURCES, createWorkout } from '../../domain/workout';

const SPORT_TYPE_TO_ACTIVITY = Object.freeze({
  Run: 'Running',
  TrailRun: 'Running',
  VirtualRun: 'Running',
  Walk: 'Walking',
  Hike: 'Hiking',
  Ride: 'Cycling',
  MountainBikeRide: 'Cycling',
  GravelRide: 'Cycling',
  EBikeRide: 'Cycling',
  EMountainBikeRide: 'Cycling',
  VirtualRide: 'Cycling',
  Swim: 'Swimming',
  Kayaking: 'Kayaking',
  RollerSki: 'Rollerski',
  NordicSki: 'Cross-country skiing',
});

export const mapStravaActivity = (activity) => {
  const kind = SPORT_TYPE_TO_ACTIVITY[activity?.sport_type ?? activity?.type];
  const distance = Number(activity?.distance);
  const startedAt = Date.parse(activity?.start_date);
  if (!kind || !(distance > 0) || activity.id == null || typeof activity.start_date_local !== 'string') return null;

  return createWorkout({
    // start_date_local is local wall-clock time, so its date part is the user's calendar day.
    date: activity.start_date_local.slice(0, 10),
    activity: kind,
    distance,
    duration: activity.elapsed_time,
    source: WORKOUT_SOURCES.STRAVA,
    externalId: activity.id,
    startedAt: Number.isFinite(startedAt) ? new Date(startedAt).toISOString() : null,
  });
};
