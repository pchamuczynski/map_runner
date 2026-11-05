/**
 * Scrollable checklist of workouts the user can choose to import.
 * Everything starts checked; Check all and Uncheck all apply to the whole list.
 */
import { formatDate, formatDistance } from '../lib/format';
import ActivityIcon from './ActivityIcon';
import { workoutKey } from './workoutChoice';
import './WorkoutCheckList.css';

const WorkoutCheckList = ({ workouts, selectedKeys, takenKeys, onToggle, onSetAll }) => {
  const selectedCount = workouts.reduce((count, workout) => count + (selectedKeys.has(workoutKey(workout)) ? 1 : 0), 0);
  const allChecked = workouts.length > 0 && selectedCount === workouts.length;

  return (
    <div className="workout-check">
      <div className="workout-check-toolbar">
        <button type="button" className="workout-check-action" onClick={() => onSetAll(true)} disabled={allChecked}>
          Check all
        </button>
        <button type="button" className="workout-check-action" onClick={() => onSetAll(false)} disabled={selectedCount === 0}>
          Uncheck all
        </button>
        <span className="workout-check-count">
          {selectedCount} of {workouts.length}
        </span>
      </div>
      <ul className="workout-check-list">
        {workouts.map((workout) => {
          const key = workoutKey(workout);
          return (
            <li key={key}>
              <label>
                <input type="checkbox" checked={selectedKeys.has(key)} onChange={() => onToggle(key)} />
                <span className="workout-check-main">
                  <ActivityIcon activity={workout.activity} size={14} />
                  <strong>{workout.activity}</strong>
                  <span>{formatDistance(workout.distance)}</span>
                  <span className="workout-check-date">{formatDate(workout.date)}</span>
                  {takenKeys?.has(key) && <span className="workout-check-taken">Already added</span>}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default WorkoutCheckList;
