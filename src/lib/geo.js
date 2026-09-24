/**
 * Geometry helpers. Coordinates are `[lat, lng]` tuples throughout the app.
 */
const EARTH_RADIUS_M = 6371000;
const toRad = (deg) => (deg * Math.PI) / 180;

export const isValidCoordinate = (point) =>
  Array.isArray(point) &&
  point.length >= 2 &&
  Number.isFinite(point[0]) &&
  Number.isFinite(point[1]) &&
  Math.abs(point[0]) <= 90 &&
  Math.abs(point[1]) <= 180;

export const haversineDistance = ([lat1, lng1], [lat2, lng2]) => {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
};

/** Running distance (meters) from the first point to every point of the path. */
export const cumulativeDistances = (path) => {
  const result = new Array(path.length);
  let total = 0;
  for (let i = 0; i < path.length; i++) {
    if (i > 0) total += haversineDistance(path[i - 1], path[i]);
    result[i] = total;
  }
  return result;
};

/**
 * Point located at `fraction` (0..1) of the path's length, interpolated between vertices.
 * Uses the precomputed cumulative distances so repeated lookups are O(log n).
 */
export const pointAtFraction = (path, cumulative, fraction) => {
  if (!path.length) return null;
  const total = cumulative[cumulative.length - 1];
  const clamped = Math.min(Math.max(fraction, 0), 1);
  if (total === 0 || clamped === 0) return path[0];
  if (clamped === 1) return path[path.length - 1];

  const target = total * clamped;
  let lo = 0;
  let hi = cumulative.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cumulative[mid] < target) lo = mid + 1;
    else hi = mid;
  }

  const prev = path[lo - 1];
  const next = path[lo];
  const segment = cumulative[lo] - cumulative[lo - 1];
  const t = segment === 0 ? 0 : (target - cumulative[lo - 1]) / segment;
  return [prev[0] + (next[0] - prev[0]) * t, prev[1] + (next[1] - prev[1]) * t];
};
