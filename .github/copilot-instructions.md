# Map Runner v2 - AI assistant instructions

React 19 + Vite SPA that shows workout progress along real-world routes, with a Node/Express API in `server/`. See README.md for setup,
architecture and the backend contract.

## Rules
- Business logic goes in `src/domain/` as pure functions with unit tests; components stay presentational.
- Change route data only through `useRoutes().actions` (reducer in `src/state/routesReducer.js`).
- Read configuration only via `src/config/env.js`; never put secrets in `VITE_*` variables.
- Validate anything from storage, the API or third parties with `src/domain/schema.js`.
- Map service URLs live only in `src/config/mapServices.js` (the CSP is generated from it).
- Never mutate state (e.g. `array.sort()` on props); use the domain helpers.
- Functional components and hooks, accessible markup (real buttons, labels, ARIA for custom widgets).
- `src/domain` and `src/lib` are shared with the server (`server/`): keep them free of browser/Vite APIs and use
  explicit `.js` extensions in their relative imports.
- Server: validate every request body with zod, return errors as `{ error }` via `HttpError`, never log or return
  secrets, password hashes or session tokens.
- Run `npm run lint` and `npm test` before finishing.
