/**
 * After Garmin is connected: choose which routes receive new workouts, and
 * optionally pull workouts from a date range onto those routes.
 */
import { useEffect, useState } from 'react';
import { countOverlappingImports } from '../domain/overlap';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { monthAgoLocalIsoDate, todayLocalIsoDate } from '../lib/format';
import { disconnectIntegration, fetchNewWorkouts } from '../services/integrations';
import ActivityFilter from './ActivityFilter';
import { importPeriodError } from './importPeriod';
import ImportPeriodFields from './ImportPeriodFields';
import OverlapPolicyPicker from './OverlapPolicyPicker';
import WorkoutCheckList from './WorkoutCheckList';
import { activityTypesIn, takenWorkoutKeys, withKeysChecked, workoutKey, workoutsInPeriod, workoutsOfTypes } from './workoutChoice';
import './GarminDialog.css';

const GarminDialog = ({ routes, notice, policy, onPolicy, onClose, onSaveRoutes, onImported, onDisconnected }) => {
  const [pickedRoutes, setPickedRoutes] = useState(null);
  const selected = pickedRoutes ?? new Set(routes.filter((route) => route.autoImport.enabled).map((route) => route.id));
  const [from, setFrom] = useState(monthAgoLocalIsoDate);
  const [to, setTo] = useState(todayLocalIsoDate);
  const [found, setFound] = useState(null);
  const [typeFilter, setTypeFilter] = useState(() => new Set());
  const [picked, setPicked] = useState(() => new Set());
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [pendingOverlaps, setPendingOverlaps] = useState(0);

  useEscapeKey(onClose);

  const clearFound = () => {
    setFound(null);
    setTypeFilter(new Set());
    setPicked(new Set());
    setMessage('');
    setPendingOverlaps(0);
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

  const changeFrom = (value) => {
    setFrom(value);
    clearFound();
    setError('');
  };

  const changeTo = (value) => {
    setTo(value);
    clearFound();
    setError('');
  };

  const saveRoutes = () => {
    setError('');
    onSaveRoutes([...selected]);
    setMessage('New workouts will be added to the selected routes.');
  };

  const chosenRoutes = routes.filter((route) => selected.has(route.id));
  const selectedKey = chosenRoutes.map((route) => route.id).join('\0');
  const activityKey = chosenRoutes.flatMap((route) => route.activities).join('\0');

  useEffect(() => {
    if (!selectedKey) {
      setBusy(false);
      return undefined;
    }
    const periodError = importPeriodError(from, to, todayLocalIsoDate());
    if (periodError) {
      setFound(null);
      setTypeFilter(new Set());
      setPicked(new Set());
      setMessage('');
      setError(periodError);
      setBusy(false);
      return undefined;
    }

    let cancelled = false;
    setBusy(true);
    setError('');
    setMessage('');
    (async () => {
      try {
        const workouts = workoutsInPeriod(await fetchNewWorkouts('garmin', { from, to }), {
          from,
          to,
          activities: activityKey ? activityKey.split('\0') : [],
        });
        if (cancelled) return;
        setFound(workouts);
        setTypeFilter(new Set(activityTypesIn(workouts)));
        setPicked(new Set(workouts.map(workoutKey)));
        if (workouts.length === 0) setMessage("No workouts of the selected routes' activity types in that period.");
      } catch (err) {
        if (cancelled) return;
        setFound(null);
        setError(err?.message || 'Could not load workouts from Garmin.');
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [from, to, selectedKey, activityKey]);

  const chosenWorkouts = () => workoutsOfTypes(found ?? [], typeFilter).filter((workout) => picked.has(workoutKey(workout)));

  const finishImport = (chosen, nextPolicy) => {
    setMessage(onImported(chosen, [...selected], nextPolicy) || '');
    setPendingOverlaps(0);
  };

  const importSelected = () => {
    setError('');
    setMessage('');
    const chosen = chosenWorkouts();
    if (chosen.length === 0) {
      setError('Select at least one workout.');
      return;
    }
    const overlaps = chosenRoutes.reduce(
      (count, route) => count + countOverlappingImports(route.workouts, chosen.filter((workout) => route.activities.includes(workout.activity))),
      0,
    );
    if (overlaps > 0 && !policy) {
      setPendingOverlaps(overlaps);
      return;
    }
    finishImport(chosen, policy ?? 'both');
  };

  const choosePolicy = (nextPolicy) => {
    const chosen = chosenWorkouts();
    onPolicy(nextPolicy);
    if (chosen.length === 0) return;
    finishImport(chosen, nextPolicy);
  };

  const visible = workoutsOfTypes(found ?? [], typeFilter);
  const visibleSelected = visible.filter((workout) => picked.has(workoutKey(workout)));

  const toggleType = (activity) => {
    setTypeFilter((current) => {
      const next = new Set(current);
      if (next.has(activity)) next.delete(activity);
      else next.add(activity);
      return next;
    });
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
          <ImportPeriodFields from={from} to={to} onFrom={changeFrom} onTo={changeTo} />
          {chosenRoutes.length === 0 && <p className="field-hint">Select at least one route to receive the workouts.</p>}
          {busy && <p className="field-hint">Loading workouts…</p>}
          {found?.length > 0 && (
            <>
              <ActivityFilter types={activityTypesIn(found)} selected={typeFilter} onToggle={toggleType} />
              {visible.length > 0 ? (
                <>
                  <WorkoutCheckList
                    workouts={visible}
                    selectedKeys={picked}
                    takenKeys={takenWorkoutKeys(visible, chosenRoutes)}
                    onToggle={toggleWorkout}
                    onSetAll={(checked) => setPicked((current) => withKeysChecked(current, visible, checked))}
                  />
                  <OverlapPolicyPicker policy={policy} onChange={onPolicy} name="garmin-overlap-policy" />
                  {pendingOverlaps > 0 && !policy && (
                    <div className="overlap-prompt" role="group" aria-label="Choose what to do with overlapping workouts">
                      <p className="field-hint">
                        {pendingOverlaps === 1
                          ? '1 selected workout overlaps one already on the selected routes.'
                          : `${pendingOverlaps} selected workouts overlap ones already on the selected routes.`}{' '}
                        This choice is remembered for every route.
                      </p>
                      <button type="button" className="btn btn-secondary btn-small" onClick={() => choosePolicy('old')}>
                        Keep old
                      </button>
                      <button type="button" className="btn btn-secondary btn-small" onClick={() => choosePolicy('new')}>
                        Keep new
                      </button>
                      <button type="button" className="btn btn-secondary btn-small" onClick={() => choosePolicy('both')}>
                        Keep both
                      </button>
                    </div>
                  )}
                  <button type="button" className="btn btn-primary btn-small" onClick={importSelected} disabled={busy || visibleSelected.length === 0}>
                    Import selected
                  </button>
                </>
              ) : (
                <p className="field-hint">No workouts of the selected activity types.</p>
              )}
            </>
          )}
        </fieldset>

        {notice && (
          <p className="field-error" role="alert">
            {notice}
          </p>
        )}
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
