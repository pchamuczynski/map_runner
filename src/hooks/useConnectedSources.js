import { useEffect, useState } from 'react';
import { IMPORT_SOURCE_IDS } from '../domain/autoImport';
import { listConnections } from '../services/integrations';
import { useAuth } from '../state/contexts';

/**
 * Services the signed-in user has connected, limited to the ones a route can import from.
 * `connected` stays null until the first response, and is [] when nobody is signed in.
 *
 * @param {number} [connectionVersion]  Bump after connect or disconnect so the list reloads.
 * @returns {{ signedIn: boolean, connected: string[] | null }}
 */
export const useConnectedSources = (connectionVersion = 0) => {
  const { user, status, accountsAvailable } = useAuth();
  const signedIn = Boolean(accountsAvailable && status === 'ready' && user && !user.isGuest);
  const [connected, setConnected] = useState(/** @type {string[] | null} */ (signedIn ? null : []));

  useEffect(() => {
    if (!signedIn) {
      setConnected([]);
      return undefined;
    }
    let cancelled = false;
    setConnected(null);
    listConnections()
      .then((ids) => {
        if (cancelled) return;
        const known = new Set(Array.isArray(ids) ? ids : []);
        setConnected(IMPORT_SOURCE_IDS.filter((id) => known.has(id)));
      })
      .catch(() => {
        if (!cancelled) setConnected([]);
      });
    return () => {
      cancelled = true;
    };
  }, [signedIn, connectionVersion]);

  return { signedIn, connected };
};
