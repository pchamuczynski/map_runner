/**
 * Pure reducer for route/workout state. Every mutation goes through here, so each
 * user action produces exactly one consistent state update (and one save).
 */
import { distributeImportedWorkouts } from '../domain/autoImport';
import { withWorkouts } from '../domain/route';

export const initialRoutesState = Object.freeze({
  status: 'loading', // 'loading' | 'ready' | 'error'
  routes: [],
  error: null,
  revision: 0, // bumped on every user mutation; drives persistence
  repository: null, // where the current routes were loaded from (and must be saved to)
});

const mutate = (state, routes) => ({ ...state, routes, revision: state.revision + 1 });

const updateRouteById = (state, routeId, update) => {
  let changed = false;
  const routes = state.routes.map((route) => {
    if (route.id !== routeId) return route;
    changed = true;
    return update(route);
  });
  return changed ? mutate(state, routes) : state;
};

export const routesReducer = (state, action) => {
  switch (action.type) {
    case 'LOAD_STARTED':
      return initialRoutesState;
    case 'LOAD_SUCCEEDED':
      return { ...state, status: 'ready', routes: action.routes, error: null, repository: action.repository };
    case 'LOAD_FAILED':
      return { ...state, status: 'error', error: action.error };

    case 'ROUTE_ADDED':
      return mutate(state, [...state.routes, action.route]);
    case 'ROUTE_UPDATED':
      return updateRouteById(state, action.route.id, () => action.route);
    case 'ROUTE_DELETED': {
      const routes = state.routes.filter((route) => route.id !== action.routeId);
      return routes.length === state.routes.length ? state : mutate(state, routes);
    }
    case 'ROUTE_MOVED': {
      const from = state.routes.findIndex((route) => route.id === action.routeId);
      const to = state.routes.findIndex((route) => route.id === action.targetRouteId);
      if (from === -1 || to === -1 || from === to) return state;
      const routes = [...state.routes];
      const [moved] = routes.splice(from, 1);
      routes.splice(to, 0, moved);
      return mutate(state, routes);
    }

    case 'WORKOUT_ADDED':
      return updateRouteById(state, action.routeId, (route) => withWorkouts(route, [...route.workouts, action.workout]));
    case 'WORKOUT_UPDATED':
      return updateRouteById(state, action.routeId, (route) =>
        withWorkouts(
          route,
          route.workouts.map((w) => (w.id === action.workout.id ? action.workout : w)),
        ),
      );
    case 'WORKOUT_DELETED':
      return updateRouteById(state, action.routeId, (route) =>
        withWorkouts(
          route,
          route.workouts.filter((w) => w.id !== action.workoutId),
        ),
      );
    case 'WORKOUTS_IMPORTED': {
      const { routes, addedCount } = distributeImportedWorkouts(state.routes, action.workouts);
      return addedCount > 0 ? mutate(state, routes) : state;
    }

    default:
      return state;
  }
};

/** Action creators - the only API components use to change routes. */
export const createRouteActions = (dispatch) => ({
  addRoute: (route) => dispatch({ type: 'ROUTE_ADDED', route }),
  updateRoute: (route) => dispatch({ type: 'ROUTE_UPDATED', route }),
  deleteRoute: (routeId) => dispatch({ type: 'ROUTE_DELETED', routeId }),
  moveRoute: (routeId, targetRouteId) => dispatch({ type: 'ROUTE_MOVED', routeId, targetRouteId }),
  addWorkout: (routeId, workout) => dispatch({ type: 'WORKOUT_ADDED', routeId, workout }),
  updateWorkout: (routeId, workout) => dispatch({ type: 'WORKOUT_UPDATED', routeId, workout }),
  deleteWorkout: (routeId, workoutId) => dispatch({ type: 'WORKOUT_DELETED', routeId, workoutId }),
  /** Routes each imported workout to the routes whose auto-import settings accept it. */
  importWorkouts: (workouts) => dispatch({ type: 'WORKOUTS_IMPORTED', workouts }),
});
