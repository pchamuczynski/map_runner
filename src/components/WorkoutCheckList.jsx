/**
 * Checklist of workouts the user can choose to import.
 * Everything starts checked. Select all toggles the visible list.
 */
import { useEffect, useRef } from 'react';
import { formatDate, formatDistance } from '../lib/format';
import ActivityIcon from './ActivityIcon';
import { workoutKey } from './workoutChoice';
import './WorkoutCheckList.css';

const WorkoutCheckList = ({ workouts, selectedKeys, takenKeys, onToggle, onSetAll }) => {
  const selectedCount = workouts.reduce((count, workout) => count + (selectedKeys.has(workoutKey(workout)) ? 1 : 0), 0);
  const allChecked = workouts.length > 0 && selectedCount === workouts.length;
  const selectAllRef = useRef(null);

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = selectedCount > 0 && !allChecked;
  }, [selectedCount, allChecked]);

  return (
    <div className="workout-check">
      <div className="workout-check-toolbar">
        <label className="workout-select-all">
          <input ref={selectAllRef} type="checkbox" checked={allChecked} onChange={() => onSetAll(!allChecked)} />
          Select all
        </label>
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
                  <span className="workout-check-date">{formatDate(workout.date)}</span>
                  <span className="workout-check-activity">
                    <ActivityIcon activity={workout.activity} size={14} />
                    <strong>{workout.activity}</strong>
                  </span>
                  <span>{formatDistance(workout.distance)}</span>
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
