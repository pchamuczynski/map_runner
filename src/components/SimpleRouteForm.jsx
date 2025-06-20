/**
 * Simple route creation form
 */
import { useState, useEffect } from 'react';
import { isGoogleMapsEnabled } from '../utils/mapConfig';
import LocationAutocomplete from './LocationAutocomplete';
import './SimpleRouteForm.css';

const SimpleRouteForm = ({ onAccept, onCancel, onRouteCalculated }) => {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [routeName, setRouteName] = useState('');
  const [activities, setActivities] = useState(['Running']);
  const [newActivity, setNewActivity] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [route, setRoute] = useState(null);
  const [error, setError] = useState('');

  // Calculate route when start and end are provided
  useEffect(() => {
    if (start.trim() && end.trim()) {
      calculateRoute();
    } else {
      setRoute(null);
      if (onRouteCalculated) onRouteCalculated(null);
    }
  }, [start, end]);

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
      
      setRoute(result);
      if (onRouteCalculated) onRouteCalculated(result);
      
      console.log('Route calculated:', result);
    } catch (err) {
      console.error('Route calculation failed:', err);
      setError(err.message);
      setRoute(null);
      if (onRouteCalculated) onRouteCalculated(null);
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

    if (!route) {
      setError('Please wait for route calculation to complete');
      return;
    }

    const routeData = {
      name: routeName.trim() || `${start} → ${end}`,
      from: start.trim(),
      to: end.trim(),
      activities: activities,
      coordinates: route.coordinates,
      distance: route.distance,
      duration: route.duration,
      provider: route.provider,
      coveredDistance: 0, // Start with 0 covered distance
      workouts: [] // Initialize empty workouts array
    };

    onAccept(routeData);
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

  return (
    <div className="simple-route-form">
      <div className="form-header">
        <h3>Create New Route</h3>
        <button type="button" className="close-btn" onClick={onCancel}>×</button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Route Name (optional)</label>
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
            Calculating route...
          </div>
        )}

        {route && (
          <div className="route-info">
            <div className="route-stats">
              <span>📏 Distance: {formatDistance(route.distance)}</span>
              <span>⏱️ Duration: {formatDuration(route.duration)}</span>
              <span>🗺️ Provider: {route.provider}</span>
              {activities.length > 0 && (
                <span>🏃 Activities: {activities.join(', ')}</span>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        <div className="form-actions">
          <button type="button" onClick={onCancel}>Cancel</button>
          <button type="submit" disabled={!route || isCalculating}>
            Create Route
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

export default SimpleRouteForm;
