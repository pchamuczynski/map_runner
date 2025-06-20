/**
 * Workout manager component for tracking individual workouts on routes
 */
import { useState } from 'react';
import './WorkoutManager.css';

const WorkoutManager = ({ route, onUpdateWorkouts, onUpdateProgress, onAddWorkout, onEditWorkout }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const workouts = route.workouts || [];
  const totalWorkouts = workouts.length;
  const totalWorkoutDistance = workouts.reduce((sum, workout) => sum + (workout.distance || 0), 0);

  const formatDistance = (meters) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)}km`;
    }
    return `${Math.round(meters)}m`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const handleDeleteWorkout = (workoutId) => {
    if (confirm('Delete this workout?')) {
      const updatedWorkouts = workouts.filter(w => w.id !== workoutId);
      onUpdateWorkouts(route.id, updatedWorkouts);

      // Update total covered distance for the route
      const newTotalCovered = updatedWorkouts.reduce((sum, w) => sum + (w.distance || 0), 0);
      if (onUpdateProgress) {
        onUpdateProgress(route.id, newTotalCovered);
      }
    }
  };

  const handleAddWorkoutClick = () => {
    if (onAddWorkout) {
      onAddWorkout(route);
    }
  };

  const handleEditWorkout = (workout) => {
    if (onEditWorkout) {
      onEditWorkout(workout, route);
    }
  };

  return (
    <div className="workout-manager">
      <div className="workout-summary" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="workout-stats">
          <span className="workout-count">{totalWorkouts} workout{totalWorkouts !== 1 ? 's' : ''}</span>
          <span className="workout-distance">{formatDistance(totalWorkoutDistance)} covered</span>
        </div>
        <div className="expand-icon">{isExpanded ? '▼' : '▶'}</div>
      </div>

      {isExpanded && (
        <div className="workout-details">
          <div className="workout-list">
            {workouts.length === 0 ? (
              <div className="no-workouts">No workouts recorded yet</div>
            ) : (
              workouts
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .map(workout => (
                  <div key={workout.id} className="workout-text-item">
                    <span className="workout-text-info">
                      <strong>{workout.activity}</strong> - {formatDistance(workout.distance)} on {formatDate(workout.date)}
                    </span>
                    <div className="workout-actions">
                      <button
                        className="edit-workout-btn"
                        onClick={() => handleEditWorkout(workout)}
                        title="Edit workout"
                      >
                        ✏️
                      </button>
                      <button
                        className="delete-workout-btn"
                        onClick={() => handleDeleteWorkout(workout.id)}
                        title="Delete workout"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>

          <div className="workout-actions">
            <button
              className="add-workout-btn"
              onClick={handleAddWorkoutClick}
            >
              + Add Workout
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkoutManager;
