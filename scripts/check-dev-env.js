/**
 * Runs before `npm run dev`: fails fast with a clear message instead of a cryptic
 * error from the API server. Keep this file runnable on old Node versions.
 */
import { existsSync } from 'node:fs';

const REQUIRED_NODE_MAJOR = 22;
const problems = [];

const major = Number(process.versions.node.split('.')[0]);
if (major < REQUIRED_NODE_MAJOR) {
  problems.push(`Node.js ${REQUIRED_NODE_MAJOR}+ is required, but this is ${process.version}. Run \`nvm use\` in the project folder.`);
}
if (!existsSync(new URL('../server/node_modules', import.meta.url))) {
  problems.push('Server dependencies are missing. Run `npm --prefix server install`.');
}

if (problems.length > 0) {
  console.error(`\nCannot start the dev environment:\n${problems.map((p) => `  - ${p}`).join('\n')}\n`);
  process.exit(1);
}

if (!existsSync(new URL('../server/.env', import.meta.url))) {
  console.warn('Note: server/.env not found - the API runs with defaults (Google sign-in disabled). See server/.env.example.');
}
