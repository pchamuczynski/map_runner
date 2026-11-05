import { useCallback, useEffect, useRef, useState } from 'react';
import AccountMenu from '../components/AccountMenu';
import GarminDialog from '../components/GarminDialog';
import ImportPastDialog from '../components/ImportPastDialog';
import RouteMap from '../components/map/RouteMap';
import RouteForm from '../components/RouteForm';
import Sidebar from '../components/Sidebar';
import WorkoutForm from '../components/WorkoutForm';
import { assignWorkoutsToRoutes, newlyCompletedRoutes } from '../domain/autoImport';
import { useAuth, useConfirm, useRoutes } from '../state/contexts';
import './HomePage.css';

/**
 * @typedef {null
 *   | { type: 'createRoute' }
 *   | { type: 'editRoute', routeId: string }
 *   | { type: 'addWorkout', routeId: string }
 *   | { type: 'editWorkout', routeId: string, workoutId: string }} Dialog
 */

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
  const seenRoutes = useRef(null);
  const [connectionVersion, setConnectionVersion] = useState(0);

  const selectedRoute = routes.find((route) => route.id === selectedRouteId) ?? null;
  const importRoute = routes.find((route) => route.id === importRouteId) ?? null;
  const dialogRoute = dialog?.routeId ? routes.find((route) => route.id === dialog.routeId) : null;
  const dialogWorkout =
    dialog?.type === 'editWorkout' ? dialogRoute?.workouts.find((workout) => workout.id === dialog.workoutId) : null;

  const showRouteForm = dialog?.type === 'createRoute' || (dialog?.type === 'editRoute' && dialogRoute);
  const showWorkoutForm = Boolean(dialogRoute) && (dialog.type === 'addWorkout' || (dialog.type === 'editWorkout' && dialogWorkout));

  const closeDialog = useCallback(() => setDialog(null), []);

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

  const handleAddRoute = useCallback(() => setDialog({ type: 'createRoute' }), []);
  const handleEditRoute = useCallback((routeId) => setDialog({ type: 'editRoute', routeId }), []);
  const handleAddWorkout = useCallback((routeId) => setDialog({ type: 'addWorkout', routeId }), []);
  const handleEditWorkout = useCallback(
    (routeId, workoutId) => setDialog({ type: 'editWorkout', routeId, workoutId }),
    [],
  );

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
    <div className="home-page">
      <Sidebar
        routes={routes}
        status={status}
        selectedRouteId={selectedRouteId}
        onSelectRoute={setSelectedRouteId}
        onAddRoute={handleAddRoute}
        onEditRoute={handleEditRoute}
        onDeleteRoute={handleDeleteRoute}
        onMoveRoute={actions.moveRoute}
        onAddWorkout={handleAddWorkout}
        onImportPast={setImportRouteId}
        onEditWorkout={handleEditWorkout}
        onDeleteWorkout={handleDeleteWorkout}
      />

      <main className="map-area">
        <header className="map-header">
          <h1>Map Runner v2</h1>
          <AccountMenu
            connectionVersion={connectionVersion}
            onManageIntegration={(id) => id === 'garmin' && setGarminDialog({ notice: '' })}
          />
        </header>

        {completedNotice.length > 0 && (
          <div className="page-alert alert alert-success completion-notice" role="status">
            <span className="page-alert-text">{completionMessage(completedNotice)}</span>
            <button type="button" className="close-btn" onClick={() => setCompletedNotice([])} aria-label="Dismiss">
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
          {showRouteForm && (
            <RouteForm
              key={dialog.routeId ?? 'new'}
              route={dialogRoute ?? undefined}
              onSubmit={handleRouteSubmit}
              onCancel={closeDialog}
              onPreview={setPreview}
            />
          )}
        </div>
      </main>

      {importRoute && (
        <ImportPastDialog
          route={importRoute}
          onClose={() => setImportRouteId(null)}
          onImported={(workouts) => {
            const { addedCount } = assignWorkoutsToRoutes(routes, workouts, [importRoute.id]);
            actions.assignWorkouts(workouts, [importRoute.id]);
            return addedCount;
          }}
        />
      )}

      {garminDialog && (
        <GarminDialog
          routes={routes}
          notice={garminDialog.notice}
          onClose={() => setGarminDialog(null)}
          onSaveRoutes={actions.setAutoImportRoutes}
          onImported={(workouts, routeIds) => {
            const { addedCount } = assignWorkoutsToRoutes(routes, workouts, routeIds);
            actions.assignWorkouts(workouts, routeIds);
            return addedCount;
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
