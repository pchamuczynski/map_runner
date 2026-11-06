/**
 * Pulls already-recorded workouts from connected apps onto one route.
 * The route's activity types decide what is listed; the user chooses which to add.
 */
import { useEffect, useState } from 'react';
import { IMPORT_SOURCE_IDS, importSourceLabel, isRouteCompleted } from '../domain/autoImport';
import { countOverlappingImports } from '../domain/overlap';
import { useConnectedSources } from '../hooks/useConnectedSources';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { monthAgoLocalIsoDate, todayLocalIsoDate } from '../lib/format';
import { fetchNewWorkouts } from '../services/integrations';
import { useAuth } from '../state/contexts';
import ActivityFilter from './ActivityFilter';
import { importPeriodError } from './importPeriod';
import ImportPeriodFields from './ImportPeriodFields';
import WorkoutCheckList from './WorkoutCheckList';
import { activityTypesIn, takenWorkoutKeys, withKeysChecked, workoutKey, workoutsInPeriod, workoutsOfTypes } from './workoutChoice';
import './ImportPastDialog.css';

const ImportPastDialog = ({ route, policy, onPolicy, onClose, onImported, connectionVersion = 0 }) => {
  const { user, accountsAvailable } = useAuth();
  const { connected } = useConnectedSources(connectionVersion);
  const [from, setFrom] = useState(monthAgoLocalIsoDate);
  const [to, setTo] = useState(todayLocalIsoDate);
  const [serviceChoice, setServiceChoice] = useState(null);
  const [found, setFound] = useState(null);
  const [typeFilter, setTypeFilter] = useState(() => new Set());
  const [picked, setPicked] = useState(() => new Set());
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [pendingOverlaps, setPendingOverlaps] = useState(0);
  const signedIn = accountsAvailable && user && !user.isGuest;
  const completed = isRouteCompleted(route);
  const activityKey = route.activities.join('\0');
  const selectedServices = serviceChoice ?? connected ?? [];
  const servicesKey = connected == null ? '' : IMPORT_SOURCE_IDS.filter((id) => selectedServices.includes(id)).join('\0');

  useEscapeKey(onClose);

  const clearList = () => {
    setFound(null);
    setTypeFilter(new Set());
    setPicked(new Set());
    setMessage('');
    setError('');
    setPendingOverlaps(0);
  };

  const changeFrom = (value) => {
    setFrom(value);
    clearList();
  };

  const changeTo = (value) => {
    setTo(value);
    clearList();
  };

  const toggleService = (id) => {
    clearList();
    setServiceChoice((current) => {
      const next = new Set(current ?? connected ?? []);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return IMPORT_SOURCE_IDS.filter((sourceId) => next.has(sourceId));
    });
  };

  useEffect(() => {
    if (!signedIn || completed) return undefined;
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

    if (connected === null) return undefined;

    if (!servicesKey) {
      setFound(null);
      setTypeFilter(new Set());
      setPicked(new Set());
      setBusy(false);
      setError('');
      setPendingOverlaps(0);
      setMessage(connected.length === 0 ? 'Connect Strava or Garmin from the account menu first.' : 'Choose a service to import from.');
      return undefined;
    }

    let cancelled = false;
    setBusy(true);
    setError('');
    setMessage('');
    (async () => {
      try {
        const loaded = await Promise.allSettled(
          servicesKey.split('\0').map(async (id) => {
            try {
              return await fetchNewWorkouts(id, { from, to });
            } catch (err) {
              if (err?.status === 404 || err?.status === 503) return [];
              throw err;
            }
          }),
        );
        const failure = loaded.find((result) => result.status === 'rejected');
        const received = loaded.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
        if (received.length === 0 && failure) throw failure.reason;
        const workouts = workoutsInPeriod(received, {
          from,
          to,
          activities: activityKey ? activityKey.split('\0') : [],
        });
        if (cancelled) return;
        setFound(workouts);
        setTypeFilter(new Set(activityTypesIn(workouts)));
        setPicked(new Set(workouts.map(workoutKey)));
        if (workouts.length === 0) setMessage("No workouts of this route's activity types in that period.");
      } catch (err) {
        if (cancelled) return;
        setFound(null);
        setError(err?.message || 'Could not load workouts.');
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [from, to, signedIn, completed, activityKey, servicesKey, connected]);

  const chosenWorkouts = () => workoutsOfTypes(found ?? [], typeFilter).filter((workout) => picked.has(workoutKey(workout)));

  const finishImport = (chosen, nextPolicy) => {
    onImported(chosen, nextPolicy);
    onClose();
  };

  const importSelected = () => {
    setError('');
    setMessage('');
    const chosen = chosenWorkouts();
    if (chosen.length === 0) {
      setError('Select at least one workout.');
      return;
    }
    const overlaps = countOverlappingImports(route.workouts, chosen);
    if (overlaps > 0 && !policy) {
      setPendingOverlaps(overlaps);
      return;
    }
    finishImport(chosen, policy ?? 'both');
  };

  const choosePolicy = (nextPolicy) => {
    const chosen = chosenWorkouts();
    onPolicy(nextPolicy);
    setPendingOverlaps(0);
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
            Sign in to import workouts from Strava or Garmin.
          </p>
        ) : (
          <>
            <fieldset className="form-group">
              <legend className="form-legend">Import from</legend>
              {connected === null && <p className="field-hint">Loading connected services…</p>}
              {connected?.length === 0 && <p className="field-hint">Connect Strava or Garmin from the account menu first.</p>}
              {connected?.map((id) => (
                <label key={id} className="checkbox-row">
                  <input type="checkbox" checked={selectedServices.includes(id)} onChange={() => toggleService(id)} />
                  {importSourceLabel(id)}
                </label>
              ))}
            </fieldset>
            <ImportPeriodFields from={from} to={to} onFrom={changeFrom} onTo={changeTo} />
            {completed && <p className="field-hint">This route is already complete, so no more workouts can be added.</p>}
            {busy && <p className="field-hint">Loading workouts…</p>}
            {found?.length > 0 && (
              <>
                <ActivityFilter types={activityTypesIn(found)} selected={typeFilter} onToggle={toggleType} />
                {visible.length > 0 ? (
                  <>
                    <WorkoutCheckList
                      workouts={visible}
                      selectedKeys={picked}
                      takenKeys={takenWorkoutKeys(visible, [route])}
                      onToggle={toggle}
                      onSetAll={(checked) => setPicked((current) => withKeysChecked(current, visible, checked))}
                    />
                    {pendingOverlaps > 0 && !policy && (
                      <div className="overlap-prompt" role="group" aria-label="Choose what to do with overlapping workouts">
                        <p className="field-hint">
                          {pendingOverlaps === 1
                            ? '1 selected workout overlaps one already on this route.'
                            : `${pendingOverlaps} selected workouts overlap ones already on this route.`}{' '}
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
