import { useCallback, useState } from 'react';
import RouteMap from '../components/map/RouteMap';
import RouteForm from '../components/RouteForm';
import Sidebar from '../components/Sidebar';
import WorkoutForm from '../components/WorkoutForm';
import { useRoutes } from '../state/contexts';
import './HomePage.css';

/**
 * @typedef {null
 *   | { type: 'createRoute' }
 *   | { type: 'editRoute', routeId: string }
 *   | { type: 'addWorkout', routeId: string }
 *   | { type: 'editWorkout', routeId: string, workoutId: string }} Dialog
 */

const HomePage = () => {
  const { routes, status, error, saveError, actions } = useRoutes();
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  /** @type {[Dialog, Function]} */
  const [dialog, setDialog] = useState(null);
  const [preview, setPreview] = useState(null);

  const selectedRoute = routes.find((route) => route.id === selectedRouteId) ?? null;
  const dialogRoute = dialog?.routeId ? routes.find((route) => route.id === dialog.routeId) : null;
  const dialogWorkout =
    dialog?.type === 'editWorkout' ? dialogRoute?.workouts.find((workout) => workout.id === dialog.workoutId) : null;

  const showRouteForm = dialog?.type === 'createRoute' || (dialog?.type === 'editRoute' && dialogRoute);
  const showWorkoutForm = Boolean(dialogRoute) && (dialog.type === 'addWorkout' || (dialog.type === 'editWorkout' && dialogWorkout));

  const closeDialog = useCallback(() => setDialog(null), []);

  const handleAddRoute = useCallback(() => setDialog({ type: 'createRoute' }), []);
  const handleEditRoute = useCallback((routeId) => setDialog({ type: 'editRoute', routeId }), []);
  const handleAddWorkout = useCallback((routeId) => setDialog({ type: 'addWorkout', routeId }), []);
  const handleEditWorkout = useCallback(
    (routeId, workoutId) => setDialog({ type: 'editWorkout', routeId, workoutId }),
    [],
  );

  const handleDeleteRoute = useCallback(
    (routeId) => {
      if (!window.confirm('Delete this route and all its workouts?')) return;
      actions.deleteRoute(routeId);
      setSelectedRouteId((current) => (current === routeId ? null : current));
      setDialog((current) => (current?.routeId === routeId ? null : current));
    },
    [actions],
  );

  const handleDeleteWorkout = useCallback(
    (routeId, workoutId) => {
      if (window.confirm('Delete this workout?')) actions.deleteWorkout(routeId, workoutId);
    },
    [actions],
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
        onEditWorkout={handleEditWorkout}
        onDeleteWorkout={handleDeleteWorkout}
      />

      <main className="map-area">
        <header className="map-header">
          <h1>Map Runner v2</h1>
        </header>

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

        <RouteMap route={preview ?? selectedRoute} />
      </main>

      {showRouteForm && (
        <RouteForm
          key={dialog.routeId ?? 'new'}
          route={dialogRoute ?? undefined}
          onSubmit={handleRouteSubmit}
          onCancel={closeDialog}
          onPreview={setPreview}
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
