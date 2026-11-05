import { memo, useEffect, useRef, useState } from 'react';
import { completionDate, isRouteCompleted } from '../domain/autoImport';
import { getCoveredDistance, getProgress } from '../domain/route';
import { totalWorkoutDuration } from '../domain/workout';
import { formatDate, formatDateTime, formatDistance, formatDuration, formatPercent, placeCity } from '../lib/format';
import ActivityIcon from './ActivityIcon';

const RouteListItem = memo(function RouteListItem({
  route,
  isSelected,
  isExpanded,
  isDragging,
  dropPlacement,
  onSelect,
  onToggleExpanded,
  onEdit,
  onDelete,
  onAddWorkout,
  onEditWorkout,
  onDeleteWorkout,
  onDeleteWorkouts,
  dragHandlers,
}) {
  const progress = getProgress(route);
  const workoutCount = route.workouts.length;
  const workoutsId = `workouts-${route.id}`;
  const completed = isRouteCompleted(route);
  const finishedOn = completionDate(route);
  const [folded, setFolded] = useState(completed);
  const [checkedIds, setCheckedIds] = useState(() => new Set());
  const checked = route.workouts.filter((workout) => checkedIds.has(workout.id));
  const allChecked = route.workouts.length > 0 && checked.length === route.workouts.length;
  const selectAllRef = useRef(null);

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = checked.length > 0 && !allChecked;
  }, [checked.length, allChecked]);

  const toggleChecked = (workoutId) => {
    setCheckedIds((current) => {
      const next = new Set(current);
      if (next.has(workoutId)) next.delete(workoutId);
      else next.add(workoutId);
      return next;
    });
  };

  return (
    <li
      className={`route-item ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''} ${dropPlacement ? `drop-${dropPlacement}` : ''}`}
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
        <div className="route-fold-row">
          <button
            type="button"
            className="fold-route-btn"
            onClick={() => setFolded((value) => !value)}
            aria-expanded={!folded}
            title={folded ? 'Unfold route' : 'Fold route'}
            aria-label={folded ? `Unfold ${route.name}` : `Fold ${route.name}`}
          >
            {folded ? '▶' : '▼'}
          </button>
          <button type="button" className="route-select" onClick={() => onSelect(route.id)} aria-pressed={isSelected}>
            <span className="route-title">{route.name}</span>
            {folded ? (
              <span className="route-details">
                <span className="route-path">
                  {placeCity(route.from)} → {placeCity(route.to)}
                </span>
                <span className="route-covered">
                  {formatDistance(getCoveredDistance(route))} / {formatDistance(route.distance)}
                </span>
              </span>
            ) : (
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
            )}
          </button>
        </div>

        {!folded && <div className="route-progress">
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
              <span className="workout-time-mini" title="Total time elapsed on workouts">
                {' '}
                · {formatDuration(totalWorkoutDuration(route.workouts))}
              </span>
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
          {isExpanded && workoutCount > 0 && (
            <label className="workout-select-all">
              <input
                ref={selectAllRef}
                type="checkbox"
                checked={allChecked}
                onChange={() => setCheckedIds(allChecked ? new Set() : new Set(route.workouts.map((workout) => workout.id)))}
              />
              Select all
            </label>
          )}
          {isExpanded && (
            <ul className="expanded-workouts" id={workoutsId}>
              {workoutCount > 0 ? (
                route.workouts.map((workout) => (
                  <li key={workout.id} className="workout-text-item">
                    <label className="workout-row-check">
                      <input
                        type="checkbox"
                        checked={checkedIds.has(workout.id)}
                        onChange={() => toggleChecked(workout.id)}
                        aria-label={`Select ${workout.activity} on ${formatDate(workout.date)}`}
                      />
                    </label>
                    <span className="workout-text-body">
                      <span className="workout-date">{formatDate(workout.date)}</span>
                      <span className="workout-text-info">
                        <ActivityIcon activity={workout.activity} size={14} />
                        <strong>{workout.activity}</strong>
                        <span className="workout-distance">{formatDistance(workout.distance)}</span>
                      </span>
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
          {isExpanded && checked.length > 0 && (
            <button
              type="button"
              className="delete-workouts-btn"
              onClick={(event) => onDeleteWorkouts(route.id, checked.map((workout) => workout.id), event.currentTarget)}
            >
              Delete selected
            </button>
          )}
        </div>}
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
