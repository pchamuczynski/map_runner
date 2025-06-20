import { useState } from 'react';
import './Sidebar.css';

const Sidebar = ({ onAddRoute, routes = [], onRouteSelect, selectedRoute, isLoadingRoute, onDeleteRoute, onReorderRoutes, onUpdateRouteProgress, onUpdateWorkouts, onAddWorkout, onEditWorkout, onEditRoute }) => {
  const [draggedItem, setDraggedItem] = useState(null);
  const [expandedWorkouts, setExpandedWorkouts] = useState(null); // Track which route has expanded workouts

  const handleDragStart = (e, routeId) => {
    setDraggedItem(routeId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetRouteId) => {
    e.preventDefault();
    
    if (!draggedItem || draggedItem === targetRouteId) return;

    const draggedIndex = routes.findIndex(r => r.id === draggedItem);
    const targetIndex = routes.findIndex(r => r.id === targetRouteId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;

    const newRoutes = [...routes];
    const [draggedRoute] = newRoutes.splice(draggedIndex, 1);
    newRoutes.splice(targetIndex, 0, draggedRoute);
    
    onReorderRoutes && onReorderRoutes(newRoutes);
    setDraggedItem(null);
  };

  const formatDistance = (meters) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)}km`;
    }
    return `${Math.round(meters)}m`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: '2-digit'
    });
  };

  const handleDeleteWorkout = (route, workoutId) => {
    if (confirm('Delete this workout?')) {
      const updatedWorkouts = route.workouts
        .filter(w => w.id !== workoutId)
        .sort((a, b) => new Date(a.date) - new Date(b.date)); // Ensure sorting after deletion (oldest first)
      
      onUpdateWorkouts(route.id, updatedWorkouts);

      // Update total covered distance for the route
      const newTotalCovered = updatedWorkouts.reduce((sum, w) => sum + (w.distance || 0), 0);
      if (onUpdateRouteProgress) {
        onUpdateRouteProgress(route.id, newTotalCovered);
      }
    }
  };

  const toggleWorkoutExpansion = (routeId) => {
    setExpandedWorkouts(expandedWorkouts === routeId ? null : routeId);
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>ROUTES</h2>
        {isLoadingRoute && (
          <div className="loading-indicator">
            <span className="loading-spinner"></span>
          </div>
        )}
      </div>
      <div className="sidebar-content">
        <button className="add-route-btn" onClick={onAddRoute}>
          Add Route
        </button>
        
        {routes.length > 0 && (
          <div className="routes-list">
            {routes.map((route) => (
              <div 
                key={route.id} 
                className={`route-item ${selectedRoute?.id === route.id ? 'selected' : ''} ${draggedItem === route.id ? 'dragging' : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(e, route.id)}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, route.id)}
              >
                <div className="drag-handle">⋮⋮</div>
                <div 
                  className="route-content"
                  onClick={() => onRouteSelect && onRouteSelect(route)}
                >
                  <div className="route-name">{route.name}</div>
                  <div className="route-details">
                    <span className="route-distance">
                      {route.distance ? `${(route.distance / 1000).toFixed(1)}km` : '0km'}
                    </span>
                    <div className="route-path">{route.from} → {route.to}</div>
                    <div className="route-activities">
                      {route.activities && route.activities.length > 0 ? route.activities.join(', ') : 'No activities'}
                    </div>
                  </div>
                  
                  {/* Always visible progress and workout info */}
                  <div className="route-progress-always">
                    <div className="progress-bar-mini">
                      <div 
                        className="progress-fill-mini"
                        style={{ 
                          width: `${route.coveredDistance && route.distance 
                            ? Math.min((route.coveredDistance / route.distance) * 100, 100) 
                            : 0}%` 
                        }}
                      />
                    </div>
                    <div className="route-stats-row">
                      <span className="workout-count-mini">
                        {route.workouts ? route.workouts.length : 0} workout{(route.workouts ? route.workouts.length : 0) !== 1 ? 's' : ''}
                      </span>
                      <span className="progress-percentage">
                        {route.coveredDistance 
                          ? `${(route.coveredDistance / 1000).toFixed(1)}km (${route.distance ? ((route.coveredDistance / route.distance) * 100).toFixed(0) : 0}%)`
                          : '0km (0%)'
                        }
                      </span>
                      <div className="progress-actions">
                        <button 
                          className="expand-workouts-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleWorkoutExpansion(route.id);
                          }}
                          title="View workouts"
                        >
                          {expandedWorkouts === route.id ? '▼' : '▶'}
                        </button>
                        <button 
                          className="add-workout-mini-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddWorkout && onAddWorkout(route);
                          }}
                          title="Add workout"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    
                    {/* Expandable workout list */}
                    {expandedWorkouts === route.id && (
                      <div className="expanded-workouts">
                        {route.workouts && route.workouts.length > 0 ? (
                          route.workouts
                            .sort((a, b) => new Date(a.date) - new Date(b.date))
                            .map(workout => (
                              <div key={workout.id} className="workout-text-item">
                                <span className="workout-text-info">
                                  <strong>{workout.activity}</strong> {formatDistance(workout.distance)} • {formatDate(workout.date)}
                                </span>
                                <div className="workout-actions-aligned">
                                  <button
                                    className="edit-workout-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onEditWorkout && onEditWorkout(workout, route);
                                    }}
                                    title="Edit workout"
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    className="delete-workout-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteWorkout(route, workout.id);
                                    }}
                                    title="Delete workout"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </div>
                            ))
                        ) : (
                          <div className="no-workouts">No workouts recorded yet</div>
                        )}
                      </div>
                    )}
                  </div>

                  {selectedRoute && selectedRoute.id === route.id && (
                    <div className="route-expanded-info">
                      {/* Additional expanded content can be added here if needed */}
                    </div>
                  )}
                </div>
                <div className="route-buttons">
                  <button
                    className="edit-route-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditRoute && onEditRoute(route);
                    }}
                    title="Edit route"
                  >
                    ✏️
                  </button>
                  <button 
                    className="delete-route-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteRoute && onDeleteRoute(route.id);
                    }}
                    title="Delete route"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
