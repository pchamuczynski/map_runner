/**
 * Workout import integrations (Strava, Garmin).
 *
 * Planned flow (all OAuth work happens on the backend):
 *  1. `connectUrl(id)` -> the browser navigates to the backend, which redirects
 *     to the provider's consent screen and handles the OAuth callback.
 *  2. The backend stores the tokens and receives webhooks (Strava push
 *     subscriptions, Garmin Activity API push) for new activities.
 *  3. `syncEnabledIntegrations()` pulls new activities from the backend; they are
 *     mapped here and applied with the `importWorkouts` state action, which adds
 *     each workout to every route whose auto-import settings accept its type and
 *     date, de-duplicating by source + externalId so re-syncing is safe.
 */
import { config } from '../../config/env';
import { sanitizeWorkout } from '../../domain/schema';
import { apiRequest, apiUrl } from '../api/apiClient';
import { mapGarminActivity } from './garmin';
import { mapStravaActivity } from './strava';

export const INTEGRATIONS = Object.freeze({
  strava: { id: 'strava', label: 'Strava', enabled: config.features.strava, mapActivity: mapStravaActivity },
  // Garmin is offered to every signed-in user. The server refuses to connect until its API credentials are set.
  garmin: { id: 'garmin', label: 'Garmin', enabled: config.features.accounts, mapActivity: mapGarminActivity },
});

const getIntegration = (id) => {
  const integration = INTEGRATIONS[id];
  if (!integration?.enabled) throw new Error(`Integration "${id}" is not enabled`);
  return integration;
};

export const enabledIntegrations = () => Object.values(INTEGRATIONS).filter((i) => i.enabled);

export const connectUrl = (id) => apiUrl(`/integrations/${getIntegration(id).id}/connect`);

/** Raw provider payloads are untrusted: map, then validate like any other stored data. */
export const toWorkouts = (id, rawActivities) => {
  const { mapActivity } = INTEGRATIONS[id];
  return (Array.isArray(rawActivities) ? rawActivities : [])
    .map(mapActivity)
    .map((workout) => workout && sanitizeWorkout(workout))
    .filter(Boolean);
};

/** Providers the signed-in user has already authorised. */
export const listConnections = async () => {
  const body = await apiRequest('/integrations');
  return Array.isArray(body?.connected) ? body.connected : [];
};

export const disconnectIntegration = (id) => apiRequest(`/integrations/${getIntegration(id).id}`, { method: 'DELETE' });

/**
 * @param {string} id  Integration id.
 * @param {{ since?: string, from?: string, to?: string, signal?: AbortSignal }} [options]
 *   `since` is an ISO timestamp for the automatic sync. `from` and `to` are `YYYY-MM-DD` for a history import.
 */
export const fetchNewWorkouts = async (id, { since, from, to, signal } = {}) => {
  const integration = getIntegration(id);
  const params = new URLSearchParams();
  if (since) params.set('since', since);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const query = params.size > 0 ? `?${params}` : '';
  const activities = await apiRequest(`/integrations/${integration.id}/activities${query}`, { signal, timeoutMs: 60_000 });
  return toWorkouts(integration.id, activities);
};

/**
 * Fetches new workouts from every enabled provider. One provider failing does not
 * block the others.
 *
 * @returns {Promise<{ workouts: import('../../domain/workout').Workout[], errors: Array<{ id: string, error: Error }> }>}
 */
export const syncEnabledIntegrations = async ({ since, signal } = {}) => {
  const integrations = enabledIntegrations();
  const results = await Promise.allSettled(integrations.map(({ id }) => fetchNewWorkouts(id, { since, signal })));
  const workouts = [];
  const errors = [];
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') workouts.push(...result.value);
    else errors.push({ id: integrations[index].id, error: result.reason });
  });
  return { workouts, errors };
};
