import { useMemo } from 'react';
import { getCoveredDistance, getProgress } from '../../domain/route';
import { latestWorkout } from '../../domain/workout';
import { formatDistance, formatPercent } from '../../lib/format';
import { cumulativeDistances, isValidCoordinate, pointAtFraction } from '../../lib/geo';
import { FINISH_ICON, START_ICON, progressIcon } from './markerIcons';

/**
 * Derives everything a map renderer needs from a route. The path geometry is only
 * recomputed when the coordinates change, not when workouts change.
 */
export const useRouteDisplay = (route) => {
  const coordinates = route?.coordinates;

  const geometry = useMemo(() => {
    const path = (coordinates ?? []).filter(isValidCoordinate);
    return path.length >= 2 ? { path, cumulative: cumulativeDistances(path) } : null;
  }, [coordinates]);

  const from = route?.from;
  const to = route?.to;

  const endpoints = useMemo(() => {
    if (!geometry) return null;
    const { path } = geometry;
    return {
      start: { position: path[0], icon: START_ICON, title: from ? `Start: ${from}` : 'Start' },
      finish: { position: path[path.length - 1], icon: FINISH_ICON, title: to ? `Finish: ${to}` : 'Finish' },
    };
  }, [geometry, from, to]);

  const progress = route ? getProgress(route) : 0;
  const covered = route ? getCoveredDistance(route) : 0;
  const lastActivity = route ? latestWorkout(route.workouts)?.activity : undefined;

  const progressMarker = useMemo(() => {
    if (!geometry || progress <= 0) return null;
    // The polyline is a simplified path whose length differs from the road distance,
    // so position by fraction of the route rather than by absolute meters.
    return {
      position: pointAtFraction(geometry.path, geometry.cumulative, progress),
      icon: progressIcon(lastActivity),
      title: `Progress: ${formatDistance(covered)} (${formatPercent(progress)})`,
    };
  }, [geometry, progress, covered, lastActivity]);

  return { path: geometry?.path ?? null, endpoints, progressMarker };
};
