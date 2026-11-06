/**
 * Create / edit route panel. Shown beside the map so the calculated route can be previewed.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { ACTIVITIES } from '../domain/activities';
import { IMPORT_SOURCE_IDS, importSourceLabel, isRouteCompleted } from '../domain/autoImport';
import { DEFAULT_ROUTE_ACTIVITIES, ROUTE_LIMITS, createRoute, updateRoute, validateRouteInput } from '../domain/route';
import { useConnectedSources } from '../hooks/useConnectedSources';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { useRouteCalculation } from '../hooks/useRouteCalculation';
import { formatDistance } from '../lib/format';
import ActivityPicker from './ActivityPicker';
import LocationAutocomplete from './LocationAutocomplete';
import './RouteForm.css';

const importHint = (route) => {
  if (route && isRouteCompleted(route)) return 'This route is completed, so no more workouts will be imported.';
  if (route) return 'New workouts from the selected services are added automatically. Import past workouts to add older ones.';
  return 'New workouts from the selected services are added automatically.';
};

/**
 * @param {{
 *   route?: import('../domain/route').Route,  // omitted when creating
 *   onSubmit: (route: import('../domain/route').Route) => void,
 *   onCancel: () => void,
 *   onPreview: (route: object | null) => void,
 *   onImportPast?: (routeId: string) => void,
 *   connectionVersion?: number,
 * }} props
 */
const RouteForm = ({ route, onSubmit, onCancel, onPreview, onImportPast, connectionVersion = 0 }) => {
  const isEdit = Boolean(route);
  const [name, setName] = useState(route?.name ?? '');
  const [from, setFrom] = useState(route?.from ?? '');
  const [to, setTo] = useState(route?.to ?? '');
  const [activities, setActivities] = useState(route?.activities ?? DEFAULT_ROUTE_ACTIVITIES);
  const [sources, setSources] = useState(() => new Set(route?.autoImport.sources ?? []));
  const sourcesTouched = useRef(isEdit);
  const [errors, setErrors] = useState({});
  const { signedIn, connected } = useConnectedSources(connectionVersion);

  const completed = isEdit && isRouteCompleted(route);
  const endpointsChanged = !isEdit || from.trim() !== route.from || to.trim() !== route.to;
  const calculation = useRouteCalculation(from, to, { skip: !endpointsChanged });
  const geometry = endpointsChanged ? calculation.geometry : route;

  const preview = useMemo(
    () => (geometry ? { id: 'preview', coordinates: geometry.coordinates, distance: geometry.distance, workouts: route?.workouts ?? [] } : null),
    [geometry, route],
  );

  useEffect(() => {
    onPreview(preview);
  }, [preview, onPreview]);

  useEffect(() => () => onPreview(null), [onPreview]);

  useEscapeKey(onCancel);

  useEffect(() => {
    if (sourcesTouched.current || connected == null) return;
    setSources(new Set(connected));
  }, [connected]);

  const toggleActivity = (activity, checked) => {
    const next = ACTIVITIES.filter((a) => (a === activity ? checked : activities.includes(a)));
    setActivities(next);
    setErrors((prev) => ({ ...prev, activities: undefined, autoImport: undefined }));
  };

  const toggleSource = (id, checked) => {
    sourcesTouched.current = true;
    setSources((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
    setErrors((prev) => ({ ...prev, autoImport: undefined }));
  };

  const chosenSourcesVisible = (connected ?? []).some((id) => sources.has(id));

  const handleSubmit = (e) => {
    e.preventDefault();
    const chosen =
      connected == null
        ? IMPORT_SOURCE_IDS.filter((id) => sources.has(id))
        : connected.filter((id) => sources.has(id));
    const details = {
      name,
      from,
      to,
      activities,
      autoImport: { enabled: chosen.length > 0, activities, sources: chosen },
    };
    const validation = validateRouteInput(details);
    setErrors(validation);
    if (Object.keys(validation).length > 0 || !geometry) return;
    onSubmit(isEdit ? updateRoute(route, details, geometry) : createRoute(details, geometry));
  };

  return (
    <section className="route-form-panel" aria-labelledby="route-form-title">
      <div className="dialog-header">
        <h3 id="route-form-title">{isEdit ? 'Edit Route' : 'Create New Route'}</h3>
        <button type="button" className="close-btn" onClick={onCancel} aria-label="Close">
          ×
        </button>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label htmlFor="route-name">Route Name{isEdit ? '' : ' (optional)'}</label>
          <input
            id="route-name"
            type="text"
            value={name}
            maxLength={ROUTE_LIMITS.MAX_NAME_LENGTH}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Route"
          />
        </div>

        <div className="form-group">
          <LocationAutocomplete
            label="From"
            value={from}
            onChange={setFrom}
            placeholder="Warsaw, Poland"
            maxLength={ROUTE_LIMITS.MAX_LOCATION_LENGTH}
            error={errors.from}
            required
          />
        </div>

        <div className="form-group">
          <LocationAutocomplete
            label="To"
            value={to}
            onChange={setTo}
            placeholder="Krakow, Poland"
            maxLength={ROUTE_LIMITS.MAX_LOCATION_LENGTH}
            error={errors.to}
            required
          />
        </div>

        <fieldset className="form-group">
          <legend className="form-legend">Activities</legend>
          <ActivityPicker
            label="Activities counted on this route"
            options={ACTIVITIES}
            selected={activities}
            onToggle={toggleActivity}
            invalid={Boolean(errors.activities)}
          />
          {errors.activities && <p className="field-error">{errors.activities}</p>}
        </fieldset>

        <fieldset className="form-group auto-import">
          <legend className="form-legend">Import new workouts from</legend>
          {!signedIn && <p className="field-hint">Sign in to import workouts from Strava or Garmin.</p>}
          {signedIn && connected === null && <p className="field-hint">Loading connected services…</p>}
          {signedIn && connected?.length === 0 && (
            <p className="field-hint">Connect Strava or Garmin from the account menu, then choose them here.</p>
          )}
          {signedIn && connected?.length > 0 && (
            <div className="auto-import-options">
              {connected.map((id) => (
                <label key={id} className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={sources.has(id)}
                    disabled={completed}
                    onChange={(event) => toggleSource(id, event.target.checked)}
                  />
                  {importSourceLabel(id)}
                </label>
              ))}
            </div>
          )}
          {chosenSourcesVisible && <p className="field-hint">{importHint(route)}</p>}
          {isEdit && !completed && (
            <button type="button" className="btn btn-secondary btn-small import-past-form-btn" onClick={() => onImportPast(route.id)}>
              Import past workouts
            </button>
          )}
          {errors.autoImport && <p className="field-error">{errors.autoImport}</p>}
        </fieldset>

        {calculation.isCalculating && (
          <div className="alert alert-info" role="status">
            <div className="spinner" />
            {isEdit ? 'Recalculating route...' : 'Calculating route...'}
          </div>
        )}

        {geometry && (
          <div className="alert alert-success">
            <div className="route-stats">
              <span>📏 Distance: {formatDistance(geometry.distance)}</span>
            </div>
            {isEdit && endpointsChanged && (
              <p className="alert alert-warning">
                ⚠️ Route endpoints changed - saving will replace the route. Your workouts are kept.
              </p>
            )}
          </div>
        )}

        {calculation.error && (
          <div className="alert alert-error" role="alert">
            {calculation.error}
          </div>
        )}

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={!geometry || calculation.isCalculating}>
            {isEdit ? 'Save Changes' : 'Create Route'}
          </button>
        </div>
      </form>
    </section>
  );
};

export default RouteForm;
