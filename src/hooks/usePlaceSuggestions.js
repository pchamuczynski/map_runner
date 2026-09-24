import { useEffect, useState } from 'react';
import { isAbortError } from '../lib/http';
import { searchPlaces } from '../services/geo';
import { useDebouncedValue } from './useDebouncedValue';

const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 400;

/** Debounced place suggestions; stale requests are aborted. Pass `enabled: false` to pause. */
export const usePlaceSuggestions = (query, { enabled = true } = {}) => {
  const debouncedQuery = useDebouncedValue(query.trim(), DEBOUNCE_MS);
  const [state, setState] = useState({ suggestions: [], isLoading: false });

  useEffect(() => {
    if (!enabled || debouncedQuery.length < MIN_QUERY_LENGTH) {
      setState({ suggestions: [], isLoading: false });
      return undefined;
    }

    const controller = new AbortController();
    setState((prev) => ({ ...prev, isLoading: true }));
    searchPlaces(debouncedQuery, { signal: controller.signal })
      .then((suggestions) => setState({ suggestions, isLoading: false }))
      .catch((error) => {
        if (!isAbortError(error)) setState({ suggestions: [], isLoading: false });
      });
    return () => controller.abort();
  }, [debouncedQuery, enabled]);

  return state;
};
