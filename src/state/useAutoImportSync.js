import { useEffect } from 'react';
import { earliestImportStart } from '../domain/autoImport';
import { readOverlapPolicy } from '../domain/overlapPolicy';
import { isAbortError } from '../lib/http';
import { enabledIntegrations, syncEnabledIntegrations } from '../services/integrations';

const SYNC_INTERVAL_MS = 15 * 60 * 1000;

/**
 * Periodically pulls new workouts from connected providers while at least one
 * uncompleted route has auto-import enabled. Inert until an integration is enabled (needs the backend).
 */
export const useAutoImportSync = ({ status, routes, importWorkouts }) => {
  // Re-subscribe only when the fetch window changes, not on every route edit.
  // Stops by itself once every auto-import route is completed.
  const since = status === 'ready' ? earliestImportStart(routes) : null;

  useEffect(() => {
    if (!since || enabledIntegrations().length === 0) return undefined;

    const controller = new AbortController();
    const sync = async () => {
      try {
        const { workouts, errors } = await syncEnabledIntegrations({ since, signal: controller.signal });
        errors
          .filter(({ error }) => error?.status !== 404 && error?.status !== 503)
          .forEach(({ id, error }) => console.warn(`Workout sync from ${id} failed`, error));
        if (workouts.length > 0) importWorkouts(workouts, readOverlapPolicy() ?? 'both');
      } catch (error) {
        if (!isAbortError(error)) console.warn('Workout sync failed', error);
      }
    };

    sync();
    const timer = setInterval(sync, SYNC_INTERVAL_MS);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [since, importWorkouts]);
};
