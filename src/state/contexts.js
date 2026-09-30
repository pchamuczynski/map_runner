import { createContext, useContext } from 'react';

export const AuthContext = createContext(null);
export const RoutesContext = createContext(null);
export const ConfirmContext = createContext(null);

const useRequiredContext = (context, name) => {
  const value = useContext(context);
  if (!value) throw new Error(`${name} must be used inside its provider`);
  return value;
};

/**
 * @returns {{
 *   user: import('../services/auth/authService').User, status: string, notice: string | null,
 *   accountsAvailable: boolean, googleSignInAvailable: boolean,
 *   register: Function, logIn: Function, logInWithGoogle: Function, logOut: Function, dismissNotice: Function,
 * }}
 */
export const useAuth = () => useRequiredContext(AuthContext, 'useAuth');

/** @returns {{ routes: import('../domain/route').Route[], status: string, error: Error | null, saveError: Error | null, actions: ReturnType<import('./routesReducer').createRouteActions> }} */
export const useRoutes = () => useRequiredContext(RoutesContext, 'useRoutes');

/** @returns {(request: { anchor: HTMLElement, message: string, confirmLabel?: string }) => Promise<boolean>} */
export const useConfirm = () => useRequiredContext(ConfirmContext, 'useConfirm');
