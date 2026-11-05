/**
 * Pulls already-recorded workouts from Garmin onto one route.
 * The route's activity types decide what is listed; the user chooses which to add.
 */
import { useState } from 'react';
import { isRouteCompleted } from '../domain/autoImport';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { todayLocalIsoDate } from '../lib/format';
import { fetchNewWorkouts } from '../services/integrations';
import { useAuth } from '../state/contexts';
import { importPeriodError } from './importPeriod';
import WorkoutCheckList from './WorkoutCheckList';
import { takenWorkoutKeys, workoutKey, workoutsInPeriod } from './workoutChoice';
import './ImportPastDialog.css';

const daysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return todayLocalIsoDate(date);
};

const ImportPastDialog = ({ route, onClose, onImported }) => {
  const { user, accountsAvailable } = useAuth();
  const [from, setFrom] = useState(daysAgo(365));
  const [to, setTo] = useState(todayLocalIsoDate());
  const [found, setFound] = useState(null);
  const [picked, setPicked] = useState(() => new Set());
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const signedIn = accountsAvailable && user && !user.isGuest;
  const completed = isRouteCompleted(route);

  useEscapeKey(onClose);

  const changePeriod = (setter) => (event) => {
    setter(event.target.value);
    setFound(null);
    setPicked(new Set());
    setMessage('');
    setError('');
  };

  const showWorkouts = async () => {
    setError('');
    setMessage('');
    const periodError = importPeriodError(from, to, todayLocalIsoDate());
    if (periodError) {
      setError(periodError);
      return;
    }
    if (completed) {
      setError('This route is already complete, so no more workouts can be added.');
      return;
    }
    setBusy(true);
    try {
      const workouts = workoutsInPeriod(await fetchNewWorkouts('garmin', { from, to }), {
        from,
        to,
        activities: route.activities,
      });
      setFound(workouts);
      setPicked(new Set(workouts.map(workoutKey)));
      if (workouts.length === 0) setMessage("No workouts of this route's activity types in that period.");
    } catch (err) {
      setFound(null);
      setError(err?.message || 'Could not load workouts from Garmin.');
    } finally {
      setBusy(false);
    }
  };

  const importSelected = () => {
    setError('');
    setMessage('');
    const chosen = (found ?? []).filter((workout) => picked.has(workoutKey(workout)));
    if (chosen.length === 0) {
      setError('Select at least one workout.');
      return;
    }
    const added = onImported(chosen);
    setMessage(
      added > 0
        ? `Added ${added} workout${added === 1 ? '' : 's'} to ${route.name}.`
        : 'None of the selected workouts were added. They may already be on this route.',
    );
  };

  const toggle = (key) => {
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="dialog-overlay" onMouseDown={onClose}>
      <section
        className="dialog import-past-dialog"
        role="dialog"
        aria-labelledby="import-past-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="dialog-header">
          <h3 id="import-past-title">Import past workouts</h3>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <p className="field-hint import-past-route">
          {route.name}
          {route.activities.length > 0 && <span className="import-past-types">{route.activities.join(', ')}</span>}
        </p>

        {!signedIn ? (
          <p className="field-error" role="alert">
            Sign in to import workouts from Garmin.
          </p>
        ) : (
          <>
            <div className="import-past-dates">
              <label>
                From
                <input type="date" value={from} max={to} onChange={changePeriod(setFrom)} />
              </label>
              <label>
                To
                <input type="date" value={to} min={from} max={todayLocalIsoDate()} onChange={changePeriod(setTo)} />
              </label>
            </div>
            <p className="field-hint">All workouts in this period start checked. Uncheck any you want to leave out.</p>
            {completed && <p className="field-hint">This route is already complete, so no more workouts can be added.</p>}
            <button type="button" className="btn btn-secondary btn-small" onClick={showWorkouts} disabled={busy || completed}>
              {busy ? 'Loading…' : 'Show workouts'}
            </button>
            {found?.length > 0 && (
              <>
                <WorkoutCheckList
                  workouts={found}
                  selectedKeys={picked}
                  takenKeys={takenWorkoutKeys(found, [route])}
                  onToggle={toggle}
                  onSetAll={(checked) => setPicked(checked ? new Set(found.map(workoutKey)) : new Set())}
                />
                <button type="button" className="btn btn-primary btn-small" onClick={importSelected} disabled={busy || picked.size === 0}>
                  Import selected
                </button>
              </>
            )}
            {message && <p className="field-hint import-past-message">{message}</p>}
            {error && (
              <p className="field-error" role="alert">
                {error}
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
};

export default ImportPastDialog;
