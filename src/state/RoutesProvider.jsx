import { useEffect, useMemo, useReducer, useState } from 'react';
import { createRouteRepository } from '../services/storage/routeRepository';
import { RoutesContext, useAuth } from './contexts';
import { createRouteActions, initialRoutesState, routesReducer } from './routesReducer';
import { useAutoImportSync } from './useAutoImportSync';

/** Loads the signed-in user's routes, persists every change and keeps auto-imports in sync. */
export const RoutesProvider = ({ children }) => {
  const { user, status: authStatus } = useAuth();
  const [state, dispatch] = useReducer(routesReducer, initialRoutesState);
  const [saveError, setSaveError] = useState(null);
  const repository = useMemo(() => createRouteRepository(user), [user]);

  useEffect(() => {
    if (authStatus !== 'ready') return undefined;
    let cancelled = false;
    dispatch({ type: 'LOAD_STARTED' });
    repository
      .load()
      .then((routes) => !cancelled && dispatch({ type: 'LOAD_SUCCEEDED', routes, repository }))
      .catch((error) => !cancelled && dispatch({ type: 'LOAD_FAILED', error }));
    return () => {
      cancelled = true;
    };
  }, [repository, authStatus]);

  // Saves go to the repository the routes came from, never to one that is still loading.
  useEffect(() => {
    if (state.status !== 'ready' || state.revision === 0) return;
    state.repository
      .save(state.routes)
      .then(() => setSaveError(null))
      .catch(setSaveError);
  }, [state.repository, state.status, state.revision, state.routes]);

  const actions = useMemo(() => createRouteActions(dispatch), []);

  useAutoImportSync({ status: state.status, routes: state.routes, importWorkouts: actions.importWorkouts });

  const value = useMemo(
    () => ({ routes: state.routes, status: state.status, error: state.error, saveError, actions }),
    [state.routes, state.status, state.error, saveError, actions],
  );

  return <RoutesContext.Provider value={value}>{children}</RoutesContext.Provider>;
};
