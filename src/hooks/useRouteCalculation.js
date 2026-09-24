import { useEffect, useState } from 'react';
import { isAbortError } from '../lib/http';
import { calculateRoute } from '../services/geo';
import { useDebouncedValue } from './useDebouncedValue';

const DEBOUNCE_MS = 700;

/**
 * Calculates a route for the given endpoints once the user stops typing.
 * Superseded requests are aborted so a slow, stale response can never
 * overwrite a newer one, and billable API calls are not fired per keystroke.
 *
 * @param {string} from
 * @param {string} to
 * @param {{ skip?: boolean }} options  `skip` disables calculation (e.g. endpoints unchanged while editing).
 */
export const useRouteCalculation = (from, to, { skip = false } = {}) => {
  const endpoints = useDebouncedValue(`${from.trim()}\n${to.trim()}`, DEBOUNCE_MS);
  const [state, setState] = useState({ geometry: null, error: '', isCalculating: false, key: '' });

  useEffect(() => {
    const [start, end] = endpoints.split('\n');
    if (skip || !start || !end) {
      setState({ geometry: null, error: '', isCalculating: false, key: '' });
      return undefined;
    }

    const controller = new AbortController();
    setState({ geometry: null, error: '', isCalculating: true, key: endpoints });
    calculateRoute(start, end, { signal: controller.signal })
      .then((geometry) => setState({ geometry, error: '', isCalculating: false, key: endpoints }))
      .catch((error) => {
        if (isAbortError(error)) return;
        setState({ geometry: null, error: error.message || 'Route calculation failed', isCalculating: false, key: endpoints });
      });
    return () => controller.abort();
  }, [endpoints, skip]);

  if (skip || !from.trim() || !to.trim()) {
    return { geometry: null, error: '', isCalculating: false };
  }
  // Until the debounce settles, results belong to the previous input - don't expose them as current.
  const isSettled = state.key === `${from.trim()}\n${to.trim()}`;
  return {
    geometry: isSettled ? state.geometry : null,
    error: isSettled ? state.error : '',
    isCalculating: state.isCalculating || !isSettled,
  };
};
