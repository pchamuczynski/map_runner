import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { getRoutingService } from '../utils/mapConfig';
import './RouteCreationForm.css';

const RouteCreationForm = ({ 
  onAccept, 
  onCancel, 
  selectedMapLocation, 
  onSetActiveField, 
  activeField,
  onUpdateRoute,
  onUpdateMarkers 
}) => {
  const [routeName, setRouteName] = useState('');
  const [routePoints, setRoutePoints] = useState([
    { id: 'start', type: 'start', location: '', label: 'From' },
    { id: 'end', type: 'end', location: '', label: 'To' }
  ]);
  const [activities, setActivities] = useState(['Running']);
  const [newActivity, setNewActivity] = useState('');
  const [showCustomActivity, setShowCustomActivity] = useState(false);
  const [routeCalculation, setRouteCalculation] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState('');
  const [draggedItem, setDraggedItem] = useState(null);
  const [routingService, setRoutingService] = useState(null);

  // Refs for optimization and cleanup
  const dragCounter = useRef(0);
  const calculateRouteTimeout = useRef(null);
  const routeCalculationAbortController = useRef(null);

  // Load the appropriate routing service
  useEffect(() => {
    const loadRoutingService = async () => {
      try {
        console.log('🔧 RouteCreationForm - Loading routing service...');
        const service = await getRoutingService();
        setRoutingService(service);
        console.log('✅ Routing service loaded successfully:', service);
      } catch (error) {
        console.error('❌ Error loading routing service:', error);
        setError('Failed to load routing service');
      }
    };

    loadRoutingService();
  }, []);

  // Memoize locations to prevent unnecessary recalculations
  const routeLocations = useMemo(() => {
    return routePoints
      .filter(p => p.location?.trim())
      .map(p => p.location.trim());
  }, [routePoints]);

  // Debounced and optimized route calculation
  const calculateRouteData = useCallback(async () => {
    console.log('🚀 RouteCreationForm - Starting route calculation');
    console.log('🔧 Routing service available:', !!routingService);
    console.log('📍 Route locations:', routeLocations);
    
    if (!routingService) {
      console.log('⏳ Routing service not loaded yet');
      return;
    }

    // Cancel any ongoing calculation
    if (routeCalculationAbortController.current) {
      console.log('🚫 Cancelling previous route calculation');
      routeCalculationAbortController.current.abort();
    }

    if (routeLocations.length < 2) {
      console.log('❌ Not enough locations for route calculation');
      setRouteCalculation(null);
      if (onUpdateRoute) {
        onUpdateRoute(null);
      }
      return;
    }

    setIsCalculating(true);
    setError('');
    
    // Create new abort controller for this calculation
    routeCalculationAbortController.current = new AbortController();
    
    try {
      console.log('🛣️ Starting route calculation for:', routeLocations);
      
      // Pass optimization options for long routes
      const result = await routingService.calculateRoute(routeLocations, {
        maxPoints: 1000, // Limit points for performance
        signal: routeCalculationAbortController.current.signal
      });
      
      console.log('📊 Route calculation result:', result);
      
      // Check if this calculation was aborted
      if (routeCalculationAbortController.current?.signal.aborted) {
        console.log('🚫 Route calculation was aborted');
        return;
      }
      
      const calculationResult = {
        distance: result.distance,
        duration: result.duration,
        coordinates: result.coordinates,
        fallback: result.fallback || false,
        simplificationApplied: result.simplificationApplied || false,
        originalCoordinateCount: result.originalCoordinateCount,
        provider: result.provider || 'unknown'
      };
      
      setRouteCalculation(calculationResult);
      
      console.log('Route calculation completed:', {
        ...calculationResult,
        coordinateCount: result.coordinates?.length || 0
      });
      
      // Notify parent component about the route
      if (onUpdateRoute && result.coordinates) {
        console.log('📤 RouteCreationForm - Sending route data to parent:', {
          coordinateCount: result.coordinates.length,
          provider: result.provider,
          firstCoord: result.coordinates[0],
          lastCoord: result.coordinates[result.coordinates.length - 1]
        });
        onUpdateRoute(result);
      } else if (onUpdateRoute) {
        console.log('⚠️ RouteCreationForm - Sending route data without coordinates');
        onUpdateRoute(result);
      }
      
    } catch (error) {
      // Ignore aborted requests
      if (error.name === 'AbortError') {
        return;
      }
      
      console.error('Route calculation failed:', error);
      setError(`Route calculation failed: ${error.message}`);
      setRouteCalculation({
        distance: 0,
        duration: 0,
        coordinates: [],
        error: error.message
      });
    } finally {
      setIsCalculating(false);
      routeCalculationAbortController.current = null;
    }
  }, [routeLocations, onUpdateRoute, routingService]);

  // Optimized debounced route calculation
  const debouncedCalculateRoute = useCallback(() => {
    if (calculateRouteTimeout.current) {
      clearTimeout(calculateRouteTimeout.current);
    }
    
    // Use longer debounce for better UX during rapid changes
    calculateRouteTimeout.current = setTimeout(calculateRouteData, 1500);
  }, [calculateRouteData]);

  // Effect to trigger route calculation when locations change
  useEffect(() => {
    debouncedCalculateRoute();
    
    return () => {
      if (calculateRouteTimeout.current) {
        clearTimeout(calculateRouteTimeout.current);
      }
      if (routeCalculationAbortController.current) {
        routeCalculationAbortController.current.abort();
      }
    };
  }, [debouncedCalculateRoute]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (calculateRouteTimeout.current) {
        clearTimeout(calculateRouteTimeout.current);
      }
      if (routeCalculationAbortController.current) {
        routeCalculationAbortController.current.abort();
      }
    };
  }, []);

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    // First and last points are always start and end
    const startPoint = routePoints[0];
    const endPoint = routePoints[routePoints.length - 1];
    
    if (!startPoint?.location?.trim()) {
      setError('Please enter a starting location');
      return;
    }
    
    if (!endPoint?.location?.trim()) {
      setError('Please enter a destination');
      return;
    }

    // Middle points are stops
    const stops = routePoints.slice(1, -1).filter(p => p.location?.trim());

    const routeData = {
      name: routeName.trim() || `${startPoint.location.trim()} - ${endPoint.location.trim()}`,
      from: startPoint.location.trim(),
      to: endPoint.location.trim(),
      stops: stops.map(stop => ({ location: stop.location.trim() })),
      activities: activities,
      distance: routeCalculation ? routingService?.formatDistance(routeCalculation.distance) || '0km' : '0km',
      duration: routeCalculation ? formatDuration(routeCalculation.duration) : '0m',
      coordinates: routeCalculation ? routeCalculation.coordinates : [],
      calculatedDistance: routeCalculation ? routeCalculation.distance : 0
    };

    onAccept(routeData);
  };

  // Handle map click location
  useEffect(() => {
    if (selectedMapLocation && activeField) {
      if (activeField.startsWith('route-point-')) {
        const pointId = activeField.replace('route-point-', '');
        setRoutePoints(prev => prev.map(point => 
          point.id === pointId 
            ? { ...point, location: selectedMapLocation.display_name }
            : point
        ));
      }
      onSetActiveField(null);
    }
  }, [selectedMapLocation, activeField]);

  // Add stop
  const addStop = () => {
    const newStop = {
      id: `stop-${Date.now()}`,
      type: 'stop',
      location: '',
      label: 'Via'
    };
    
    // Insert stop before the end point
    const endIndex = routePoints.findIndex(p => p.type === 'end');
    const newPoints = [...routePoints];
    newPoints.splice(endIndex, 0, newStop);
    setRoutePoints(newPoints);
  };

  // Remove point
  const removePoint = (pointId) => {
    // Can't remove first or last points (start/end)
    const pointIndex = routePoints.findIndex(p => p.id === pointId);
    if (pointIndex === 0 || pointIndex === routePoints.length - 1) return;
    
    setRoutePoints(prev => prev.filter(point => point.id !== pointId));
  };

  // Drag and drop handlers
  const handleDragStart = (e, pointId) => {
    setDraggedItem(pointId);
    e.dataTransfer.effectAllowed = 'move';
    e.target.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedItem(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    dragCounter.current++;
    if (e.target.closest('.route-point-item')) {
      e.target.closest('.route-point-item').classList.add('drag-over');
    }
  };

  const handleDragLeave = (e) => {
    dragCounter.current--;
    if (dragCounter.current === 0) {
      if (e.target.closest('.route-point-item')) {
        e.target.closest('.route-point-item').classList.remove('drag-over');
      }
    }
  };

  const handleDrop = (e, targetId) => {
    e.preventDefault();
    dragCounter.current = 0;
    
    // Remove drag-over class
    if (e.target.closest('.route-point-item')) {
      e.target.closest('.route-point-item').classList.remove('drag-over');
    }
    
    if (!draggedItem || draggedItem === targetId) return;

    const draggedIndex = routePoints.findIndex(p => p.id === draggedItem);
    const targetIndex = routePoints.findIndex(p => p.id === targetId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;

    const newPoints = [...routePoints];
    const [draggedPoint] = newPoints.splice(draggedIndex, 1);
    newPoints.splice(targetIndex, 0, draggedPoint);
    
    // Ensure first and last items always have correct labels
    if (newPoints.length > 0) {
      newPoints[0] = { ...newPoints[0], label: 'From', type: 'start' };
      newPoints[newPoints.length - 1] = { ...newPoints[newPoints.length - 1], label: 'To', type: 'end' };
      
      // Update intermediate points to be stops with "Via" label
      for (let i = 1; i < newPoints.length - 1; i++) {
        newPoints[i] = { ...newPoints[i], label: 'Via', type: 'stop' };
      }
    }
    
    setRoutePoints(newPoints);
    setDraggedItem(null);
  };

  // Update location for a route point
  const updatePointLocation = (pointId, location) => {
    setRoutePoints(prev => prev.map(point => 
      point.id === pointId 
        ? { ...point, location }
        : point
    ));
  };

  // Add activity
  const addActivity = () => {
    if (newActivity.trim() && !activities.includes(newActivity.trim())) {
      setActivities([...activities, newActivity.trim()]);
      setNewActivity('');
      setShowCustomActivity(false);
    }
  };

  // Handle activity selection
  const handleActivitySelect = (value) => {
    if (value === 'Custom') {
      setShowCustomActivity(true);
      setNewActivity('');
    } else {
      setNewActivity(value);
      setShowCustomActivity(false);
    }
  };

  // Remove activity
  const removeActivity = (activityToRemove) => {
    setActivities(activities.filter(activity => activity !== activityToRemove));
  };

  return (
    <div className="route-creation-overlay">
      <div className="route-creation-form">
        <div className="form-header">
          <h3>Create New Route</h3>
          {routeCalculation && (
            <div className="route-info">
              {isCalculating ? (
                <div className="calculating">
                  <span className="loading-spinner"></span>
                  Calculating...
                </div>
              ) : (
                <div className="route-stats">
                  <span className="distance">{routingService?.formatDistance(routeCalculation.distance) || '0km'}</span>
                  {routeCalculation.duration > 0 && (
                    <span className="duration">{routingService?.formatDuration(routeCalculation.duration) || '0m'}</span>
                  )}
                  {routeCalculation.fallback && (
                    <span className="fallback-note" title="Using straight-line distance - routing service unavailable">⚠ Fallback</span>
                  )}
                  {routeCalculation.simplificationApplied && (
                    <span className="performance-note" title="Route simplified for better performance">🚀 Optimized</span>
                  )}
                  {routeCalculation.originalCoordinateCount && routeCalculation.originalCoordinateCount > 1000 && (
                    <span className="coordinate-count" title={`Original: ${routeCalculation.originalCoordinateCount.toLocaleString()} points, Displayed: ${routeCalculation.coordinates?.length?.toLocaleString() || 0} points`}>
                      📍 {(routeCalculation.coordinates?.length || 0).toLocaleString()}
                    </span>
                  )}
                  {routeCalculation.provider && (
                    <span className="provider-info" title={`Using ${routeCalculation.provider} for routing`}>
                      {routeCalculation.provider === 'google' ? '🗺️ Google' : '🌍 OSM'}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="form-content">
          <div className="form-group">
            <label htmlFor="routeName">Route name</label>
            <input
              id="routeName"
              type="text"
              value={routeName}
              onChange={(e) => setRouteName(e.target.value)}
              placeholder="My route"
            />
          </div>

          <div className="form-group">
            <div className="route-points-section">
              <div className="route-points-list">
                {routePoints.map((point, index) => (
                  <div
                    key={point.id}
                    className={`route-point-item ${point.type} ${draggedItem === point.id ? 'dragging' : ''}`}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, point.id)}
                    onDragEnd={handleDragEnd}
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, point.id)}
                  >
                    <div className="drag-handle">⋮⋮</div>
                    <div className="route-point-content">
                      <div className="route-point-label">{point.label}</div>
                      <input
                        type="text"
                        value={point.location || ''}
                        onChange={(e) => updatePointLocation(point.id, e.target.value)}
                        onFocus={() => onSetActiveField(`route-point-${point.id}`)}
                        placeholder="Enter location or click on map"
                        className={activeField === `route-point-${point.id}` ? 'active-field' : ''}
                      />
                    </div>
                    {index > 0 && index < routePoints.length - 1 && (
                      <button
                        type="button"
                        className="remove-point-btn"
                        onClick={() => removePoint(point.id)}
                        title="Remove stop"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
              
              <button type="button" className="add-stop-btn" onClick={addStop}>
                + Add stop
              </button>
            </div>
          </div>

          <div className="form-group">
            <div className="activities-section">
              {activities.length > 0 && (
                <div className="activities-tags">
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
              
              <div className="activities-input">
                {showCustomActivity ? (
                  <input
                    type="text"
                    value={newActivity}
                    onChange={(e) => setNewActivity(e.target.value)}
                    placeholder="Enter custom activity"
                    className="activity-custom-input"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addActivity();
                      }
                    }}
                    onBlur={() => {
                      if (!newActivity.trim()) {
                        setShowCustomActivity(false);
                      }
                    }}
                    autoFocus
                  />
                ) : (
                  <select
                    value={newActivity}
                    onChange={(e) => handleActivitySelect(e.target.value)}
                    className="activity-select"
                  >
                    <option value="">Select activity</option>
                    <option value="Running">Running</option>
                    <option value="Cycling">Cycling</option>
                    <option value="Walking">Walking</option>
                    <option value="Hiking">Hiking</option>
                    <option value="Swimming">Swimming</option>
                    <option value="Custom">Custom</option>
                  </select>
                )}
                <button type="button" className="add-activity-btn" onClick={addActivity}>
                  Add activity
                </button>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="accept-btn">
              Accept
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RouteCreationForm;
