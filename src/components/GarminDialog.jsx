/**
 * After Garmin is connected: choose which routes receive new workouts, and
 * optionally pull workouts from a date range onto those routes.
 */
import { useState } from 'react';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { todayLocalIsoDate } from '../lib/format';
import { disconnectIntegration, fetchNewWorkouts } from '../services/integrations';
import { importPeriodError } from './importPeriod';
import WorkoutCheckList from './WorkoutCheckList';
import { takenWorkoutKeys, workoutKey, workoutsInPeriod } from './workoutChoice';
import './GarminDialog.css';

const daysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return todayLocalIsoDate(date);
};

const GarminDialog = ({ routes, notice, onClose, onSaveRoutes, onImported, onDisconnected }) => {
  const [pickedRoutes, setPickedRoutes] = useState(null);
  const selected = pickedRoutes ?? new Set(routes.filter((route) => route.autoImport.enabled).map((route) => route.id));
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(todayLocalIsoDate());
  const [found, setFound] = useState(null);
  const [picked, setPicked] = useState(() => new Set());
  const [error, setError] = useState(notice ?? '');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEscapeKey(onClose);

  const clearFound = () => {
    setFound(null);
    setPicked(new Set());
    setMessage('');
  };

  const toggle = (routeId) => {
    clearFound();
    setPickedRoutes(() => {
      const next = new Set(selected);
      if (next.has(routeId)) next.delete(routeId);
      else next.add(routeId);
      return next;
    });
  };

  const changePeriod = (setter) => (event) => {
    setter(event.target.value);
    clearFound();
    setError('');
  };

  const saveRoutes = () => {
    setError('');
    onSaveRoutes([...selected]);
    setMessage('New workouts will be added to the selected routes.');
  };

  const chosenRoutes = routes.filter((route) => selected.has(route.id));

  const showWorkouts = async () => {
    setError('');
    setMessage('');
    const periodError = importPeriodError(from, to, todayLocalIsoDate());
    if (periodError) {
      setError(periodError);
      return;
    }
    if (chosenRoutes.length === 0) {
      setError('Select at least one route to receive the workouts.');
      return;
    }
    setBusy(true);
    try {
      const workouts = workoutsInPeriod(await fetchNewWorkouts('garmin', { from, to }), {
        from,
        to,
        activities: chosenRoutes.flatMap((route) => route.activities),
      });
      setFound(workouts);
      setPicked(new Set(workouts.map(workoutKey)));
      if (workouts.length === 0) setMessage("No workouts of the selected routes' activity types in that period.");
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
    const added = onImported(chosen, [...selected]);
    setMessage(
      added > 0
        ? `Added ${added} workout${added === 1 ? '' : 's'} to the selected routes.`
        : 'None of the selected workouts were added. They may already be on those routes.',
    );
  };

  const toggleWorkout = (key) => {
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const disconnect = async () => {
    setBusy(true);
    setError('');
    try {
      await disconnectIntegration('garmin');
      onDisconnected();
    } catch (err) {
      setError(err?.message || 'Could not disconnect Garmin.');
      setBusy(false);
    }
  };

  return (
    <div className="dialog-overlay" onMouseDown={onClose}>
      <section
        className="dialog garmin-dialog"
        role="dialog"
        aria-labelledby="garmin-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="dialog-header">
          <h3 id="garmin-dialog-title">Garmin</h3>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <fieldset className="form-group">
          <legend className="form-legend">Add new workouts to these routes</legend>
          {routes.length === 0 ? (
            <p className="field-hint">Create a route first. New routes import workouts of their activity types.</p>
          ) : (
            <ul className="garmin-routes">
              {routes.map((route) => (
                <li key={route.id}>
                  <label className="checkbox-row">
                    <input type="checkbox" checked={selected.has(route.id)} onChange={() => toggle(route.id)} />
                    <span>
                      {route.name}
                      <span className="garmin-route-types">{route.activities.join(', ')}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          <button type="button" className="btn btn-secondary btn-small" onClick={saveRoutes} disabled={busy || routes.length === 0}>
            Save routes
          </button>
        </fieldset>

        <fieldset className="form-group">
          <legend className="form-legend">Import existing workouts</legend>
          <div className="garmin-dates">
            <label>
              From
              <input type="date" value={from} max={to} onChange={changePeriod(setFrom)} />
            </label>
            <label>
              To
              <input type="date" value={to} min={from} max={todayLocalIsoDate()} onChange={changePeriod(setTo)} />
            </label>
          </div>
          <p className="field-hint">Show the workouts in this period, then choose which ones to add to the routes checked above.</p>
          <button type="button" className="btn btn-secondary btn-small" onClick={showWorkouts} disabled={busy}>
            {busy ? 'Loading…' : 'Show workouts'}
          </button>
          {found?.length > 0 && (
            <>
              <WorkoutCheckList
                workouts={found}
                selectedKeys={picked}
                takenKeys={takenWorkoutKeys(found, chosenRoutes)}
                onToggle={toggleWorkout}
                onSetAll={(checked) => setPicked(checked ? new Set(found.map(workoutKey)) : new Set())}
              />
              <button type="button" className="btn btn-primary btn-small" onClick={importSelected} disabled={busy || picked.size === 0}>
                Import selected
              </button>
            </>
          )}
        </fieldset>

        {message && <p className="field-hint garmin-message">{message}</p>}
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}

        <div className="form-actions">
          <button type="button" className="btn btn-danger btn-small" onClick={disconnect} disabled={busy}>
            Disconnect
          </button>
        </div>
      </section>
    </div>
  );
};

export default GarminDialog;
