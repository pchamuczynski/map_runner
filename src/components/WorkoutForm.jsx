/**
 * Add / edit workout dialog.
 */
import { useState } from 'react';
import { ACTIVITIES } from '../domain/activities';
import { WORKOUT_LIMITS, createWorkout, validateWorkoutInput } from '../domain/workout';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { todayLocalIsoDate } from '../lib/format';
import './WorkoutForm.css';

/**
 * @param {{
 *   route: import('../domain/route').Route,
 *   workout?: import('../domain/workout').Workout,  // omitted when adding
 *   onSubmit: (workout: import('../domain/workout').Workout) => void,
 *   onCancel: () => void,
 * }} props
 */
const WorkoutForm = ({ route, workout, onSubmit, onCancel }) => {
  const isEdit = Boolean(workout);
  const today = todayLocalIsoDate();
  // Only the route's activities count; keep an existing (legacy) value selectable when editing.
  const routeActivities = route.activities.length > 0 ? route.activities : ACTIVITIES;
  const options =
    workout && !routeActivities.includes(workout.activity) ? [...routeActivities, workout.activity] : routeActivities;
  const [values, setValues] = useState({
    date: workout?.date ?? today,
    activity: workout?.activity ?? (options.length === 1 ? options[0] : ''),
    distanceKm: workout ? String(workout.distance / 1000) : '',
  });
  const [errors, setErrors] = useState({});

  useEscapeKey(onCancel);

  const setField = (field) => (e) => setValues((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const validation = validateWorkoutInput(values, today, options);
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    const fields = { date: values.date, activity: values.activity, distance: Math.round(Number(values.distanceKm) * 1000) };
    onSubmit(isEdit ? { ...workout, ...fields } : createWorkout(fields));
  };

  return (
    <div className="dialog-overlay" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="workout-form-title">
        <div className="dialog-header">
          <div>
            <h3 id="workout-form-title">{isEdit ? 'Edit Workout' : 'Add Workout'}</h3>
            <p className="dialog-subtitle">for &quot;{route.name}&quot;</p>
          </div>
          <button type="button" className="close-btn" onClick={onCancel} aria-label="Close">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="workout-date">Date</label>
            <input
              id="workout-date"
              type="date"
              value={values.date}
              max={today}
              onChange={setField('date')}
              aria-invalid={Boolean(errors.date)}
              required
            />
            {errors.date && <p className="field-error">{errors.date}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="workout-activity">Activity</label>
            <select
              id="workout-activity"
              value={values.activity}
              onChange={setField('activity')}
              aria-invalid={Boolean(errors.activity)}
              autoFocus
              required
            >
              <option value="">Select activity</option>
              {options.map((activity) => (
                <option key={activity} value={activity}>
                  {activity}
                </option>
              ))}
            </select>
            {errors.activity && <p className="field-error">{errors.activity}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="workout-distance">Distance (km)</label>
            <input
              id="workout-distance"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              max={WORKOUT_LIMITS.MAX_DISTANCE_M / 1000}
              value={values.distanceKm}
              onChange={setField('distanceKm')}
              aria-invalid={Boolean(errors.distance)}
              placeholder="0.0"
              required
            />
            {errors.distance && <p className="field-error">{errors.distance}</p>}
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {isEdit ? 'Save Changes' : 'Add Workout'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WorkoutForm;
