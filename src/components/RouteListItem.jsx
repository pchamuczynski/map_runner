import { memo } from 'react';
import { completionDate, isRouteCompleted } from '../domain/autoImport';
import { getCoveredDistance, getProgress } from '../domain/route';
import { formatDate, formatDateTime, formatDistance, formatPercent } from '../lib/format';
import ActivityIcon from './ActivityIcon';

const RouteListItem = memo(function RouteListItem({
  route,
  isSelected,
  isExpanded,
  isDragging,
  onSelect,
  onToggleExpanded,
  onEdit,
  onDelete,
  onAddWorkout,
  onImportPast,
  onEditWorkout,
  onDeleteWorkout,
  dragHandlers,
}) {
  const progress = getProgress(route);
  const workoutCount = route.workouts.length;
  const workoutsId = `workouts-${route.id}`;
  const completed = isRouteCompleted(route);
  const finishedOn = completionDate(route);

  return (
    <li
      className={`route-item ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
      draggable
      onDragStart={(e) => dragHandlers.onDragStart(e, route.id)}
      onDragEnd={dragHandlers.onDragEnd}
      onDragOver={(e) => dragHandlers.onDragOver(e, route.id)}
      onDrop={(e) => dragHandlers.onDrop(e, route.id)}
    >
      <div className="drag-handle" aria-hidden="true">
        ⋮⋮
      </div>

      <div className="route-content">
        <button type="button" className="route-select" onClick={() => onSelect(route.id)} aria-pressed={isSelected}>
          <span className="route-title">{route.name}</span>
          <span className="route-details">
            <span className="route-distance">{formatDistance(route.distance)}</span>
            <span className="route-path">
              {route.from} → {route.to}
            </span>
            <span className="route-activities">
              {route.activities.length > 0
                ? route.activities.map((activity) => (
                    <span key={activity} className="route-activity">
                      <ActivityIcon activity={activity} size={12} />
                      {activity}
                    </span>
                  ))
                : 'No activities'}
            </span>
            {completed && finishedOn && (
              <span className="route-auto-import route-completed">Completed on {formatDate(finishedOn)}</span>
            )}
            {!completed && route.autoImport.enabled && (
              <span className="route-auto-import" title={`Importing workouts recorded since ${formatDateTime(route.autoImport.since)}`}>
                🔄 Auto-import: {route.autoImport.activities.join(', ')}
              </span>
            )}
          </span>
        </button>

        <div className="route-progress">
          <div
            className="progress-bar-mini"
            role="progressbar"
            aria-label="Route progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
          >
            <div className="progress-fill-mini" style={{ width: `${progress * 100}%` }} />
          </div>
          <div className="route-stats-row">
            <span className="workout-count-mini">
              {workoutCount} workout{workoutCount !== 1 ? 's' : ''}
            </span>
            <span className="progress-percentage">
              {formatDistance(getCoveredDistance(route))} ({formatPercent(progress)})
            </span>
            <div className="progress-actions">
              <button
                type="button"
                className="expand-workouts-btn"
                onClick={() => onToggleExpanded(route.id)}
                aria-expanded={isExpanded}
                aria-controls={workoutsId}
                title="View workouts"
              >
                {isExpanded ? '▼' : '▶'}
              </button>
              <button
                type="button"
                className="add-workout-mini-btn"
                onClick={() => onAddWorkout(route.id)}
                title="Add workout"
                aria-label={`Add workout to ${route.name}`}
              >
                +
              </button>
            </div>
          </div>
          {!completed && (
            <button type="button" className="import-past-btn" onClick={() => onImportPast(route.id)}>
              Import past workouts
            </button>
          )}

          {isExpanded && (
            <ul className="expanded-workouts" id={workoutsId}>
              {workoutCount > 0 ? (
                route.workouts.map((workout) => (
                  <li key={workout.id} className="workout-text-item">
                    <span className="workout-text-info">
                      <ActivityIcon activity={workout.activity} size={12} />
                      <strong>{workout.activity}</strong> {formatDistance(workout.distance)} • {formatDate(workout.date)}
                    </span>
                    <span className="item-actions">
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => onEditWorkout(route.id, workout.id)}
                        title="Edit workout"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        className="icon-btn icon-btn-danger"
                        onClick={(e) => onDeleteWorkout(route.id, workout.id, e.currentTarget)}
                        title="Delete workout"
                      >
                        🗑️
                      </button>
                    </span>
                  </li>
                ))
              ) : (
                <li className="no-workouts">No workouts recorded yet</li>
              )}
            </ul>
          )}
        </div>
      </div>

      <div className="item-actions">
        <button type="button" className="icon-btn" onClick={() => onEdit(route.id)} title="Edit route">
          ✏️
        </button>
        <button type="button" className="icon-btn icon-btn-danger" onClick={(e) => onDelete(route.id, e.currentTarget)} title="Delete route">
          🗑️
        </button>
      </div>
    </li>
  );
});

export default RouteListItem;
