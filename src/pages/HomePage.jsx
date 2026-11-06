import { useCallback, useEffect, useRef, useState } from 'react';
import AccountMenu from '../components/AccountMenu';
import GarminDialog from '../components/GarminDialog';
import ImportPastDialog from '../components/ImportPastDialog';
import RouteMap from '../components/map/RouteMap';
import RouteForm from '../components/RouteForm';
import Sidebar from '../components/Sidebar';
import WorkoutForm from '../components/WorkoutForm';
import { assignWorkoutsToRoutes, newlyCompletedRoutes } from '../domain/autoImport';
import { describeImportResult } from '../domain/overlap';
import { readOverlapPolicy, subscribeOverlapPolicy, writeOverlapPolicy } from '../domain/overlapPolicy';
import { useAuth, useConfirm, useRoutes } from '../state/contexts';
import './HomePage.css';

/**
 * @typedef {null
 *   | { type: 'createRoute' }
 *   | { type: 'editRoute', routeId: string }
 *   | { type: 'addWorkout', routeId: string }
 *   | { type: 'editWorkout', routeId: string, workoutId: string }} Dialog
 */

const SIDEBAR_WIDTH = { min: 240, max: 640, fallback: 290 };
const SIDEBAR_WIDTH_KEY = 'mapRunner:v2:sidebar-width';
const COMPACT_QUERY = '(max-width: 760px)';

const readSidebarWidth = () => {
  try {
    const value = Number(localStorage.getItem(SIDEBAR_WIDTH_KEY));
    if (value >= SIDEBAR_WIDTH.min && value <= SIDEBAR_WIDTH.max) return value;
  } catch {
    // Storage can be blocked; the default width still works.
  }
  return SIDEBAR_WIDTH.fallback;
};

const completionMessage = (finished) => {
  const names = finished.map((route) => route.name);
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
  return `Congratulations! You completed ${list}.`;
};

const HomePage = () => {
  const { routes, status, error, saveError, actions } = useRoutes();
  const { notice, dismissNotice } = useAuth();
  const confirm = useConfirm();
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  /** @type {[Dialog, Function]} */
  const [dialog, setDialog] = useState(null);
  const [preview, setPreview] = useState(null);
  const [garminDialog, setGarminDialog] = useState(null);
  const [importRouteId, setImportRouteId] = useState(null);
  const [completedNotice, setCompletedNotice] = useState([]);
  const [importNotice, setImportNotice] = useState('');
  const [overlapPolicy, setOverlapPolicy] = useState(readOverlapPolicy);
  const seenRoutes = useRef(null);
  const [connectionVersion, setConnectionVersion] = useState(0);
  const [sidebarWidth, setSidebarWidth] = useState(readSidebarWidth);
  const [compact, setCompact] = useState(() => window.matchMedia(COMPACT_QUERY).matches);
  const [routesOpen, setRoutesOpen] = useState(false);

  const selectedRoute = routes.find((route) => route.id === selectedRouteId) ?? null;
  const importRoute = routes.find((route) => route.id === importRouteId) ?? null;
  const dialogRoute = dialog?.routeId ? routes.find((route) => route.id === dialog.routeId) : null;
  const dialogWorkout =
    dialog?.type === 'editWorkout' ? dialogRoute?.workouts.find((workout) => workout.id === dialog.workoutId) : null;

  const showRouteForm = dialog?.type === 'createRoute' || (dialog?.type === 'editRoute' && dialogRoute);
  const showWorkoutForm = Boolean(dialogRoute) && (dialog.type === 'addWorkout' || (dialog.type === 'editWorkout' && dialogWorkout));

  const closeDialog = useCallback(() => setDialog(null), []);
  const closeRoutes = useCallback(() => setRoutesOpen(false), []);

  useEffect(() => {
    const media = window.matchMedia(COMPACT_QUERY);
    const apply = () => {
      setCompact(media.matches);
      if (!media.matches) setRoutesOpen(false);
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    if (status !== 'ready') {
      seenRoutes.current = null;
      setCompletedNotice((current) => (current.length === 0 ? current : []));
      return;
    }
    const previous = seenRoutes.current;
    seenRoutes.current = routes;
    if (!previous) return;
    const finished = newlyCompletedRoutes(previous, routes);
    if (finished.length > 0) setCompletedNotice(finished);
  }, [routes, status]);

  useEffect(() => subscribeOverlapPolicy(setOverlapPolicy), []);

  const chooseOverlapPolicy = useCallback((policy) => writeOverlapPolicy(policy), []);

  const reportImport = useCallback((result, policy, name) => {
    const text = describeImportResult({
      added: result.addedCount,
      filled: result.filledCount,
      overlaps: result.overlapCount,
      removed: result.removedCount,
      policy,
      name,
    });
    setImportNotice(text);
    return text;
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const garmin = params.get('garmin');
    if (!garmin) return;
    setGarminDialog({ notice: garmin === 'error' ? params.get('reason') || 'Garmin could not be connected.' : '' });
    params.delete('garmin');
    params.delete('reason');
    const next = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${next ? `?${next}` : ''}`);
  }, []);

  const handleAddRoute = useCallback(() => {
    setDialog({ type: 'createRoute' });
    setRoutesOpen(false);
  }, []);
  const handleEditRoute = useCallback((routeId) => {
    setDialog({ type: 'editRoute', routeId });
    setRoutesOpen(false);
  }, []);
  const handleSelectRoute = useCallback((routeId) => {
    setSelectedRouteId(routeId);
    setRoutesOpen(false);
  }, []);
  const handleAddWorkout = useCallback((routeId) => {
    setDialog({ type: 'addWorkout', routeId });
    setRoutesOpen(false);
  }, []);
  const handleEditWorkout = useCallback((routeId, workoutId) => {
    setDialog({ type: 'editWorkout', routeId, workoutId });
    setRoutesOpen(false);
  }, []);

  const handleDeleteRoute = useCallback(
    async (routeId, anchor) => {
      const confirmed = await confirm({ anchor, message: 'Delete this route and all its workouts?' });
      if (!confirmed) return;
      actions.deleteRoute(routeId);
      setSelectedRouteId((current) => (current === routeId ? null : current));
      setDialog((current) => (current?.routeId === routeId ? null : current));
    },
    [actions, confirm],
  );

  const handleDeleteWorkout = useCallback(
    async (routeId, workoutId, anchor) => {
      if (await confirm({ anchor, message: 'Delete this workout?' })) actions.deleteWorkout(routeId, workoutId);
    },
    [actions, confirm],
  );

  const handleDeleteWorkouts = useCallback(
    async (routeId, workoutIds, anchor) => {
      const count = workoutIds.length;
      const message = count === 1 ? 'Delete this workout?' : `Delete ${count} workouts?`;
      if (await confirm({ anchor, message, confirmLabel: 'Delete selected' })) actions.deleteWorkouts(routeId, workoutIds);
    },
    [actions, confirm],
  );

  const handleSidebarWidth = useCallback((width) => {
    const next = Math.min(SIDEBAR_WIDTH.max, Math.max(SIDEBAR_WIDTH.min, Math.round(width)));
    setSidebarWidth(next);
    try {
      localStorage.setItem(SIDEBAR_WIDTH_KEY, String(next));
    } catch {
      // The new width still applies for this visit.
    }
  }, []);

  const handleRouteSubmit = (route) => {
    if (dialog.type === 'createRoute') actions.addRoute(route);
    else actions.updateRoute(route);
    setSelectedRouteId(route.id);
    closeDialog();
  };

  const handleWorkoutSubmit = (workout) => {
    if (dialog.type === 'addWorkout') actions.addWorkout(dialog.routeId, workout);
    else actions.updateWorkout(dialog.routeId, workout);
    closeDialog();
  };

  return (
    <div className={`home-page${compact && routesOpen ? ' routes-open' : ''}`} style={{ '--sidebar-width': `${sidebarWidth}px` }}>
      <Sidebar
        width={sidebarWidth}
        onWidthChange={handleSidebarWidth}
        onClose={closeRoutes}
        routes={routes}
        status={status}
        selectedRouteId={selectedRouteId}
        onSelectRoute={handleSelectRoute}
        onAddRoute={handleAddRoute}
        onEditRoute={handleEditRoute}
        onDeleteRoute={handleDeleteRoute}
        onMoveRoute={actions.moveRoute}
        onAddWorkout={handleAddWorkout}
        onEditWorkout={handleEditWorkout}
        onDeleteWorkout={handleDeleteWorkout}
        onDeleteWorkouts={handleDeleteWorkouts}
      />

      <main className="map-area">

        {completedNotice.length > 0 && (
          <div className="page-alert alert alert-success completion-notice" role="status">
            <span className="page-alert-text">{completionMessage(completedNotice)}</span>
            <button type="button" className="close-btn" onClick={() => setCompletedNotice([])} aria-label="Dismiss">
              ×
            </button>
          </div>
        )}
        {importNotice && (
          <div className="page-alert alert alert-info" role="status">
            <span className="page-alert-text">{importNotice}</span>
            <button type="button" className="close-btn" onClick={() => setImportNotice('')} aria-label="Dismiss">
              ×
            </button>
          </div>
        )}
        {notice && (
          <div className="page-alert alert alert-info" role="status">
            <span className="page-alert-text">{notice}</span>
            <button type="button" className="close-btn" onClick={dismissNotice} aria-label="Dismiss">
              ×
            </button>
          </div>
        )}
        {status === 'error' && (
          <div className="page-alert alert alert-error" role="alert">
            Your routes could not be loaded: {error?.message}
          </div>
        )}
        {saveError && (
          <div className="page-alert alert alert-error" role="alert">
            {saveError.message}
          </div>
        )}

        <div className="map-stage">
          <RouteMap route={preview ?? selectedRoute} />
          {compact && routesOpen && (
            <button type="button" className="routes-backdrop" aria-label="Close routes" onClick={closeRoutes} />
          )}
          {compact && !routesOpen && !showRouteForm && !showWorkoutForm && (
            <button type="button" className="routes-toggle" onClick={() => setRoutesOpen(true)}>
              Routes
            </button>
          )}
          <div className="map-account">
            <AccountMenu
              connectionVersion={connectionVersion}
              overlapPolicy={overlapPolicy}
              onOverlapPolicy={chooseOverlapPolicy}
              onManageIntegration={(id) => id === 'garmin' && setGarminDialog({ notice: '' })}
            />
          </div>
          {showRouteForm && (
            <RouteForm
              key={dialog.routeId ?? 'new'}
              route={dialogRoute ?? undefined}
              onSubmit={handleRouteSubmit}
              onCancel={closeDialog}
              onPreview={setPreview}
              onImportPast={setImportRouteId}
            />
          )}
        </div>
      </main>

      {importRoute && (
        <ImportPastDialog
          route={importRoute}
          policy={overlapPolicy}
          onPolicy={chooseOverlapPolicy}
          onClose={() => setImportRouteId(null)}
          onImported={(workouts, policy) => {
            const result = assignWorkoutsToRoutes(routes, workouts, [importRoute.id], policy);
            actions.assignWorkouts(workouts, [importRoute.id], policy);
            reportImport(result, policy, importRoute.name);
          }}
        />
      )}

      {garminDialog && (
        <GarminDialog
          routes={routes}
          notice={garminDialog.notice}
          policy={overlapPolicy}
          onPolicy={chooseOverlapPolicy}
          onClose={() => setGarminDialog(null)}
          onSaveRoutes={actions.setAutoImportRoutes}
          onImported={(workouts, routeIds, policy) => {
            const result = assignWorkoutsToRoutes(routes, workouts, routeIds, policy);
            actions.assignWorkouts(workouts, routeIds, policy);
            return reportImport(result, policy, '');
          }}
          onDisconnected={() => {
            setGarminDialog(null);
            setConnectionVersion((version) => version + 1);
          }}
        />
      )}

      {showWorkoutForm && (
        <WorkoutForm
          key={dialog.workoutId ?? 'new'}
          route={dialogRoute}
          workout={dialogWorkout ?? undefined}
          onSubmit={handleWorkoutSubmit}
          onCancel={closeDialog}
        />
      )}
    </div>
  );
};

export default HomePage;
