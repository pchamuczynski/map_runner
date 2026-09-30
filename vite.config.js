import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { GOOGLE_CLIENT_ID_PATTERN } from './server/src/config.js';
import { MAP_SERVICE_ORIGINS } from './src/config/mapServices.js';

/**
 * Content-Security-Policy for production builds. It restricts where scripts, data and
 * images may come from, which limits the damage of any injected content (XSS).
 * Only injected at build time: Vite's dev server relies on inline scripts for HMR.
 * Headers that cannot be set via <meta> (frame-ancestors, HSTS, ...) belong in the
 * hosting config - see README.
 */
const buildCsp = (env) => {
  // A relative API URL (e.g. "/api") is same-origin and already covered by 'self'.
  const api = /^https?:\/\//.test(env.VITE_API_BASE_URL ?? '') ? [new URL(env.VITE_API_BASE_URL).origin] : [];
  const google = Boolean(env.VITE_GOOGLE_CLIENT_ID);
  // Google Identity Services: https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid#content_security_policy
  const gsi = (path) => (google ? [`https://accounts.google.com/gsi/${path}`] : []);

  const directives = {
    'default-src': ["'self'"],
    'script-src': ["'self'", ...gsi('client')],
    'style-src': ["'self'", "'unsafe-inline'", ...gsi('style')],
    // Google profile pictures of signed-in users.
    'img-src': ["'self'", 'data:', ...MAP_SERVICE_ORIGINS.images, ...(google ? ['https://*.googleusercontent.com'] : [])],
    'connect-src': ["'self'", ...MAP_SERVICE_ORIGINS.connect, ...api, ...gsi('')],
    'frame-src': gsi(''),
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
  };

  return Object.entries(directives)
    .map(([name, sources]) => `${name} ${sources.length ? sources.join(' ') : "'none'"}`)
    .concat('upgrade-insecure-requests')
    .join('; ');
};

const cspPlugin = (env) => ({
  name: 'inject-csp',
  apply: 'build',
  transformIndexHtml: () => [
    { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: buildCsp(env) }, injectTo: 'head-prepend' },
  ],
});

/**
 * VITE_* values are embedded in the public bundle. Refuse to start or build with something that is
 * not a Google OAuth client ID - in particular the client secret ("GOCSPX-..."), which must never ship.
 */
const assertPublicGoogleClientId = (value) => {
  if (value && !GOOGLE_CLIENT_ID_PATTERN.test(value.trim())) {
    throw new Error(
      'VITE_GOOGLE_CLIENT_ID must be an OAuth client ID ending in .apps.googleusercontent.com. ' +
        'Never put the client secret there: every VITE_* value is published in the web page.',
    );
  }
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  assertPublicGoogleClientId(env.VITE_GOOGLE_CLIENT_ID);
  return {
    plugins: [react(), cspPlugin(env)],
    server: {
      // Same-origin API in development: the browser talks to Vite, which forwards /api to the server.
      proxy: { '/api': 'http://localhost:3001' },
    },
    build: {
      sourcemap: false,
    },
    test: {
      environment: 'node',
      include: ['src/**/*.test.{js,jsx}', 'server/test/**/*.test.js'],
    },
  };
});
