/**
 * Route edit dialog component
 */
import { useState, useEffect } from 'react';
import { isGoogleMapsEnabled } from '../utils/mapConfig';
import LocationAutocomplete from './LocationAutocomplete';
import './SimpleRouteForm.css'; // Reuse the same styling

const RouteEdit = ({ route, onAccept, onCancel }) => {
  const [start, setStart] = useState(route.from || '');
  const [end, setEnd] = useState(route.to || '');
  const [routeName, setRouteName] = useState(route.name || '');
  const [activities, setActivities] = useState(route.activities || ['Running']);
  const [newActivity, setNewActivity] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculatedRoute, setCalculatedRoute] = useState(null);
  const [error, setError] = useState('');
  const [hasRouteChanged, setHasRouteChanged] = useState(false);

  // Track if the route endpoints have changed
  useEffect(() => {
    const routeChanged = start.trim() !== route.from || end.trim() !== route.to;
    setHasRouteChanged(routeChanged);
    
    if (routeChanged && start.trim() && end.trim()) {
      calculateRoute();
    } else if (!routeChanged) {
      // If route hasn't changed, keep the original route data
      setCalculatedRoute({
        coordinates: route.coordinates,
        distance: route.distance,
        duration: route.duration,
        provider: route.provider
      });
    }
  }, [start, end, route]);

  const calculateRoute = async () => {
    setIsCalculating(true);
    setError('');

    try {
      // Use appropriate service based on configuration
      let routingService;
      if (isGoogleMapsEnabled()) {
        routingService = await import('../services/simpleGoogleMaps');
      } else {
        routingService = await import('../services/simpleOSRM');
      }

      const result = await routingService.calculateRoute([start.trim(), end.trim()]);
      setCalculatedRoute(result);
      console.log('Route recalculated:', result);
    } catch (err) {
      console.error('Route calculation failed:', err);
      setError(err.message);
      setCalculatedRoute(null);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!start.trim() || !end.trim()) {
      setError('Please enter both start and end locations');
      return;
    }

    if (hasRouteChanged && !calculatedRoute) {
      setError('Please wait for route calculation to complete');
      return;
    }

    // Use calculated route if endpoints changed, otherwise keep original
    const routeData = hasRouteChanged ? calculatedRoute : {
      coordinates: route.coordinates,
      distance: route.distance,
      duration: route.duration,
      provider: route.provider
    };

    const updatedRoute = {
      ...route, // Keep original id, workouts, coveredDistance, etc.
      name: routeName.trim() || `${start} → ${end}`,
      from: start.trim(),
      to: end.trim(),
      activities: activities,
      coordinates: routeData.coordinates,
      distance: routeData.distance,
      duration: routeData.duration,
      provider: routeData.provider
    };

    onAccept(updatedRoute);
  };

  const addActivity = () => {
    if (newActivity.trim() && !activities.includes(newActivity.trim())) {
      setActivities([...activities, newActivity.trim()]);
      setNewActivity('');
    }
  };

  const removeActivity = (activityToRemove) => {
    setActivities(activities.filter(activity => activity !== activityToRemove));
  };

  const handleActivityKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addActivity();
    }
  };

  const handleCancel = () => {
    onCancel();
  };

  return (
    <div className="simple-route-form">
      <div className="form-header">
        <h3>Edit Route</h3>
        <button type="button" className="close-btn" onClick={handleCancel}>×</button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Route Name</label>
          <input
            type="text"
            value={routeName}
            onChange={(e) => setRouteName(e.target.value)}
            placeholder="My Route"
          />
        </div>

        <div className="form-group">
          <LocationAutocomplete
            label="From"
            value={start}
            onChange={setStart}
            placeholder="Warsaw, Poland"
            required
          />
        </div>

        <div className="form-group">
          <LocationAutocomplete
            label="To"
            value={end}
            onChange={setEnd}
            placeholder="Krakow, Poland"
            required
          />
        </div>

        <div className="form-group">
          <label>Activities</label>
          <div className="activities-section">
            {activities.length > 0 && (
              <div className="activity-tags">
                {activities.map((activity, index) => (
                  <span key={index} className="activity-tag">
                    {activity}
                    <button
                      type="button"
                      className="remove-activity-btn"
                      onClick={() => removeActivity(activity)}
                      title="Remove activity"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="activity-input">
              <input
                type="text"
                value={newActivity}
                onChange={(e) => setNewActivity(e.target.value)}
                onKeyPress={handleActivityKeyPress}
                placeholder="Add activity (e.g., Running, Cycling)"
              />
              <button
                type="button"
                onClick={addActivity}
                disabled={!newActivity.trim()}
                className="add-activity-btn"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {isCalculating && (
          <div className="calculating">
            <div className="spinner"></div>
            {hasRouteChanged ? 'Recalculating route...' : 'Calculating route...'}
          </div>
        )}

        {(calculatedRoute || (!hasRouteChanged && route)) && (
          <div className="route-info">
            <div className="route-stats">
              <span>📏 Distance: {formatDistance(hasRouteChanged ? calculatedRoute.distance : route.distance)}</span>
              <span>⏱️ Duration: {formatDuration(hasRouteChanged ? calculatedRoute.duration : route.duration)}</span>
              <span>🗺️ Provider: {hasRouteChanged ? calculatedRoute.provider : route.provider}</span>
              {activities.length > 0 && (
                <span>🏃 Activities: {activities.join(', ')}</span>
              )}
            </div>
            {hasRouteChanged && (
              <div className="route-warning">
                ⚠️ Route endpoints changed - this will recalculate the route and may affect your progress tracking.
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        <div className="form-actions">
          <button type="button" onClick={handleCancel}>Cancel</button>
          <button type="submit" disabled={(hasRouteChanged && !calculatedRoute) || isCalculating}>
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
};

// Helper functions
const formatDistance = (meters) => {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)}km`;
  }
  return `${meters}m`;
};

const formatDuration = (seconds) => {
  const minutes = Math.round(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  return `${minutes}m`;
};

export default RouteEdit;
