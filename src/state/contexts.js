import { createContext, useContext } from 'react';

export const AuthContext = createContext(null);
export const RoutesContext = createContext(null);

const useRequiredContext = (context, name) => {
  const value = useContext(context);
  if (!value) throw new Error(`${name} must be used inside its provider`);
  return value;
};

/** @returns {{ user: import('../services/auth/authService').User, status: string, canSignIn: boolean, signIn: Function, signOut: Function }} */
export const useAuth = () => useRequiredContext(AuthContext, 'useAuth');

/** @returns {{ routes: import('../domain/route').Route[], status: string, error: Error | null, saveError: Error | null, actions: ReturnType<import('./routesReducer').createRouteActions> }} */
export const useRoutes = () => useRequiredContext(RoutesContext, 'useRoutes');
