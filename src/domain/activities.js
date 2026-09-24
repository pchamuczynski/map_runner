/**
 * Supported activities. Routes choose from this list, workouts use it, and
 * imported Strava/Garmin activities are mapped onto it.
 */
export const ACTIVITIES = Object.freeze([
  'Running',
  'Walking',
  'Hiking',
  'Cycling',
  'Swimming',
  'Kayaking',
  'Rollerski',
  'Cross-country skiing',
]);

/** Legacy catch-all: still valid on stored workouts, no longer offered for new ones. */
export const LEGACY_OTHER_ACTIVITY = 'Other';

export const isActivity = (value) => ACTIVITIES.includes(value);

export const isWorkoutActivity = (value) => isActivity(value) || value === LEGACY_OTHER_ACTIVITY;

const key = (text) => String(text ?? '').toLowerCase().replace(/[^a-z]/g, '');

const ALIASES = new Map(
  Object.entries({
    Running: ['run', 'running', 'jog', 'jogging'],
    Walking: ['walk', 'walking'],
    Hiking: ['hike', 'hiking', 'trekking'],
    Cycling: ['cycling', 'bike', 'biking', 'ride', 'bicycle'],
    Swimming: ['swim', 'swimming'],
    Kayaking: ['kayak', 'kayaking'],
    Rollerski: ['rollerski', 'rollerskis', 'rollerskiing'],
    'Cross-country skiing': ['crosscountryskiing', 'crosscountryski', 'xcski', 'xcskiing', 'nordicski', 'nordicskiing'],
  }).flatMap(([activity, aliases]) => aliases.map((alias) => [alias, activity])),
);

/** Maps free text (e.g. legacy route tags like "cycling" or "XC ski") to a supported activity, or null. */
export const normalizeActivity = (text) => ALIASES.get(key(text)) ?? null;

/** Normalizes a list, dropping unknown entries and duplicates, in the canonical order. */
export const normalizeActivities = (values) => {
  const wanted = new Set((Array.isArray(values) ? values : []).map(normalizeActivity).filter(Boolean));
  return ACTIVITIES.filter((activity) => wanted.has(activity));
};
