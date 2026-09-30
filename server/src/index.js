import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { openDatabase } from './db.js';

const config = loadConfig();
const db = openDatabase(config.databasePath);
const { app, sessions } = createApp({ config, db });

const server = app.listen(config.port, () => {
  console.log(`Map Runner API listening on http://localhost:${config.port} (${config.env})`);
  if (!config.googleClientId) console.log('Google sign-in disabled: GOOGLE_CLIENT_ID is not set');
});

const purgeTimer = setInterval(() => sessions.purgeExpired(), 60 * 60 * 1000);
purgeTimer.unref();

const shutdown = () => {
  server.close(() => {
    db.close();
    process.exit(0);
  });
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
