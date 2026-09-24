import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { MAP_SERVICE_ORIGINS } from './src/config/mapServices.js';

/**
 * Content-Security-Policy for production builds. It restricts where scripts, data and
 * images may come from, which limits the damage of any injected content (XSS).
 * Only injected at build time: Vite's dev server relies on inline scripts for HMR.
 * Headers that cannot be set via <meta> (frame-ancestors, HSTS, ...) belong in the
 * hosting config - see README.
 */
const buildCsp = (env) => {
  const api = env.VITE_API_BASE_URL ? [new URL(env.VITE_API_BASE_URL).origin] : [];
  const googleSignIn = env.VITE_GOOGLE_CLIENT_ID ? ['https://accounts.google.com'] : [];

  const directives = {
    'default-src': ["'self'"],
    'script-src': ["'self'", ...googleSignIn],
    'style-src': ["'self'", "'unsafe-inline'", ...googleSignIn],
    'img-src': ["'self'", 'data:', ...MAP_SERVICE_ORIGINS.images],
    'connect-src': ["'self'", ...MAP_SERVICE_ORIGINS.connect, ...api, ...googleSignIn],
    'frame-src': googleSignIn,
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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    plugins: [react(), cspPlugin(env)],
    build: {
      sourcemap: false,
    },
    test: {
      environment: 'node',
      include: ['src/**/*.test.{js,jsx}'],
    },
  };
});
