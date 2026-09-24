import { useCallback, useEffect, useMemo, useState } from 'react';
import * as authService from '../services/auth/authService';
import { AuthContext } from './contexts';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(authService.GUEST_USER);
  const [status, setStatus] = useState(authService.isSignInAvailable() ? 'loading' : 'ready');

  useEffect(() => {
    if (!authService.isSignInAvailable()) return undefined;
    const controller = new AbortController();
    authService
      .getCurrentUser({ signal: controller.signal })
      .then(setUser)
      .catch(() => setUser(authService.GUEST_USER))
      .finally(() => {
        if (!controller.signal.aborted) setStatus('ready');
      });
    return () => controller.abort();
  }, []);

  const signIn = useCallback(async () => setUser(await authService.signInWithGoogle()), []);
  const signOut = useCallback(async () => setUser(await authService.signOut()), []);

  const value = useMemo(
    () => ({ user, status, canSignIn: authService.isSignInAvailable(), signIn, signOut }),
    [user, status, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
