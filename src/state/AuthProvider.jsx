import { useCallback, useEffect, useMemo, useState } from 'react';
import { onUnauthorized } from '../services/api/apiClient';
import * as authService from '../services/auth/authService';
import { disableGoogleAutoSelect } from '../services/auth/googleIdentity';
import { createApiRouteRepository, createLocalRouteRepository, importGuestRoutes } from '../services/storage/routeRepository';
import { AuthContext } from './contexts';

const { GUEST_USER } = authService;

const importedMessage = (count) =>
  count > 0 ? `${count} route${count === 1 ? '' : 's'} from this browser ${count === 1 ? 'was' : 'were'} added to your account.` : null;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(GUEST_USER);
  const [status, setStatus] = useState(authService.areAccountsAvailable() ? 'loading' : 'ready');
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (!authService.areAccountsAvailable()) return undefined;
    const controller = new AbortController();
    authService
      .getCurrentUser({ signal: controller.signal })
      .then(setUser)
      .catch(() => setUser(GUEST_USER))
      .finally(() => {
        if (!controller.signal.aborted) setStatus('ready');
      });
    return () => controller.abort();
  }, []);

  // A request found the session gone (expired, or signed out elsewhere).
  useEffect(
    () =>
      onUnauthorized(() => {
        setUser((current) => {
          if (!current.isGuest) setNotice('Your session has ended. Please sign in again.');
          return GUEST_USER;
        });
      }),
    [],
  );

  const completeSignIn = useCallback(async ({ user: signedIn, notice: serverNotice }) => {
    let importNotice = null;
    try {
      const count = await importGuestRoutes({
        guest: createLocalRouteRepository(GUEST_USER.id),
        account: createApiRouteRepository(),
      });
      importNotice = importedMessage(count);
    } catch {
      importNotice = 'Routes from this browser could not be added to your account yet. They are kept here and will be added next time you sign in.';
    }
    setNotice([serverNotice, importNotice].filter(Boolean).join(' ') || null);
    setUser(signedIn);
    return signedIn;
  }, []);

  const register = useCallback(async (input) => completeSignIn(await authService.register(input)), [completeSignIn]);
  const logIn = useCallback(async (input) => completeSignIn(await authService.logIn(input)), [completeSignIn]);
  const logInWithGoogle = useCallback(
    async (credential) => completeSignIn(await authService.logInWithGoogle(credential)),
    [completeSignIn],
  );

  const logOut = useCallback(async () => {
    await authService.logOut();
    disableGoogleAutoSelect();
    setNotice(null);
    setUser(GUEST_USER);
  }, []);

  const dismissNotice = useCallback(() => setNotice(null), []);

  const value = useMemo(
    () => ({
      user,
      status,
      notice,
      accountsAvailable: authService.areAccountsAvailable(),
      googleSignInAvailable: authService.isGoogleSignInAvailable(),
      register,
      logIn,
      logInWithGoogle,
      logOut,
      dismissNotice,
    }),
    [user, status, notice, register, logIn, logInWithGoogle, logOut, dismissNotice],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
