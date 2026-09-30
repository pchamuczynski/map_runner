/**
 * Google Identity Services (GIS) - renders Google's "Sign in with Google" button and
 * hands the resulting ID token to a callback. The token is only sent to our server,
 * which verifies it; it is never stored in the browser.
 * https://developers.google.com/identity/gsi/web
 */
import { config } from '../../config/env';

const GIS_SRC = 'https://accounts.google.com/gsi/client';

let gisPromise = null;

const loadGis = () => {
  gisPromise ??= new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve(window.google.accounts.id);
    const script = document.createElement('script');
    script.src = GIS_SRC;
    script.async = true;
    script.onload = () => (window.google?.accounts?.id ? resolve(window.google.accounts.id) : reject(new Error('Google sign-in failed to load')));
    script.onerror = () => {
      gisPromise = null; // allow a retry, e.g. after a network hiccup
      reject(new Error('Google sign-in failed to load'));
    };
    document.head.appendChild(script);
  });
  return gisPromise;
};

let currentHandler = null;
let initialized = false;

/**
 * Renders the Google button into `element`. `onCredential` receives the ID token.
 * @returns {Promise<void>}
 */
export const renderGoogleButton = async (element, { onCredential, text = 'continue_with' }) => {
  const gis = await loadGis();
  currentHandler = onCredential;
  if (!initialized) {
    gis.initialize({
      client_id: config.googleClientId,
      callback: (response) => currentHandler?.(response.credential),
      ux_mode: 'popup',
      use_fedcm_for_button: true,
    });
    initialized = true;
  }
  gis.renderButton(element, { type: 'standard', theme: 'outline', size: 'large', text, shape: 'rectangular', width: 320 });
};

/** Stops Google from auto-selecting the account after the user signs out. */
export const disableGoogleAutoSelect = () => window.google?.accounts?.id?.disableAutoSelect();
