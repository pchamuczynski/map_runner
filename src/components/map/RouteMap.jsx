import { Suspense, lazy } from 'react';
import { useRouteDisplay } from './useRouteDisplay';
import './RouteMap.css';

// Leaflet (~150 kB) loads in parallel with the rest of the UI instead of blocking it.
const LeafletRouteMap = lazy(() => import('./LeafletRouteMap'));

const MapFallback = () => (
  <div className="route-map">
    <div className="map-loading">
      <div className="spinner" />
      <p>Loading map...</p>
    </div>
  </div>
);

/** Shows a route with its start, finish and the user's current progress. */
const RouteMap = ({ route }) => {
  const display = useRouteDisplay(route);
  return (
    <Suspense fallback={<MapFallback />}>
      <LeafletRouteMap {...display} />
    </Suspense>
  );
};

export default RouteMap;
