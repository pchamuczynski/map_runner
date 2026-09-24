/**
 * Create / edit route panel. Shown beside the map so the calculated route can be previewed.
 */
import { useEffect, useMemo, useState } from 'react';
import { ACTIVITIES } from '../domain/activities';
import { DEFAULT_AUTO_IMPORT, isRouteCompleted } from '../domain/autoImport';
import { DEFAULT_ROUTE_ACTIVITIES, ROUTE_LIMITS, createRoute, updateRoute, validateRouteInput } from '../domain/route';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { useRouteCalculation } from '../hooks/useRouteCalculation';
import { formatDateTime, formatDistance, formatDuration } from '../lib/format';
import { enabledIntegrations } from '../services/integrations';
import ActivityPicker from './ActivityPicker';
import LocationAutocomplete from './LocationAutocomplete';
import './RouteForm.css';

const PROVIDER_LABELS = { google: 'Google Maps', osrm: 'OpenStreetMap (OSRM)' };

const autoImportStatus = (route) => {
  if (route && isRouteCompleted(route)) return 'This route is completed, so no more workouts will be imported.';
  if (route?.autoImport.enabled) return `Importing workouts recorded since ${formatDateTime(route.autoImport.since)}.`;
  return 'Only workouts recorded after you save will be imported - past workouts are not.';
};

/**
 * @param {{
 *   route?: import('../domain/route').Route,  // omitted when creating
 *   onSubmit: (route: import('../domain/route').Route) => void,
 *   onCancel: () => void,
 *   onPreview: (route: object | null) => void,
 * }} props
 */
const RouteForm = ({ route, onSubmit, onCancel, onPreview }) => {
  const isEdit = Boolean(route);
  const [name, setName] = useState(route?.name ?? '');
  const [from, setFrom] = useState(route?.from ?? '');
  const [to, setTo] = useState(route?.to ?? '');
  const [activities, setActivities] = useState(route?.activities ?? DEFAULT_ROUTE_ACTIVITIES);
  const [autoImport, setAutoImport] = useState(route?.autoImport ?? DEFAULT_AUTO_IMPORT);
  const [errors, setErrors] = useState({});

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

  const changeAutoImport = (update) => {
    setAutoImport(update);
    setErrors((prev) => ({ ...prev, autoImport: undefined }));
  };

  const toggleActivity = (activity, checked) => {
    setActivities((prev) => ACTIVITIES.filter((a) => (a === activity ? checked : prev.includes(a))));
    setErrors((prev) => ({ ...prev, activities: undefined }));
    // Auto-import can only import what the route allows.
    if (!checked) changeAutoImport((prev) => ({ ...prev, activities: prev.activities.filter((a) => a !== activity) }));
  };

  const toggleAutoImport = (enabled) =>
    changeAutoImport((prev) => ({
      ...prev,
      enabled,
      // First time on: import everything the route counts.
      activities: enabled && prev.activities.length === 0 ? activities : prev.activities,
    }));

  const toggleImportActivity = (activity, checked) =>
    changeAutoImport((prev) => ({
      ...prev,
      activities: activities.filter((a) => (a === activity ? checked : prev.activities.includes(a))),
    }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const details = { name, from, to, activities, autoImport };
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
          <legend className="visually-hidden">Automatic import</legend>
          <label className="checkbox-row">
            <input type="checkbox" checked={autoImport.enabled} onChange={(e) => toggleAutoImport(e.target.checked)} />
            Automatically import workouts
          </label>

          {autoImport.enabled && (
            <div className="auto-import-options">
              {activities.length > 0 ? (
                <ActivityPicker
                  label="Workout types to import"
                  options={activities}
                  selected={autoImport.activities}
                  onToggle={toggleImportActivity}
                  invalid={Boolean(errors.autoImport)}
                />
              ) : (
                <p className="field-hint">Select the route&apos;s activities first.</p>
              )}
              <p className="field-hint">{autoImportStatus(route)}</p>
              {enabledIntegrations().length === 0 && (
                <p className="field-hint">Takes effect once Strava or Garmin is connected.</p>
              )}
            </div>
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
              <span>⏱️ Duration: {formatDuration(geometry.duration)}</span>
              <span>🗺️ Provider: {PROVIDER_LABELS[geometry.provider] ?? geometry.provider}</span>
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
