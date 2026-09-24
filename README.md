# Map Runner v2

Turn your workouts into a journey: pick a real-world route (e.g. Warsaw → Barcelona), log runs, rides and
hikes against it, and watch your progress marker move along the map.

## Getting started

```bash
cp .env.example .env   # then fill in the values you need
npm install
npm run dev            # http://localhost:5173
```

| Script            | Purpose                                    |
| ----------------- | ------------------------------------------ |
| `npm run dev`     | Dev server with HMR                        |
| `npm run build`   | Production build (injects the CSP)         |
| `npm run preview` | Serve the production build locally         |
| `npm run lint`    | ESLint                                     |
| `npm test`        | Unit tests (Vitest)                        |

### Maps

Maps need no API key or configuration. The app uses OpenStreetMap-based services, all defined in
[`src/config/mapServices.js`](src/config/mapServices.js):

| Purpose              | Default (free, public)     | Production options                               |
| -------------------- | -------------------------- | ------------------------------------------------ |
| Map tiles            | tile.openstreetmap.org     | MapTiler, Stadia Maps, self-hosted               |
| Routing              | OSRM demo server (driving) | OpenRouteService, GraphHopper (also foot/bike), self-hosted OSRM |
| Search / autocomplete| Photon (komoot)            | self-hosted Photon, OpenRouteService geocoding   |

The public servers are fine for development and light use but have fair-use policies and no uptime guarantee.
Switching is a URL change in that one file; the Content-Security-Policy follows automatically.

### Activities

Supported: Running, Walking, Hiking, Cycling, Swimming, Kayaking, Rollerski, Cross-country skiing
(`src/domain/activities.js`). A route selects which of them it counts; its workouts and auto-import types are
limited to that selection. Legacy free-text tags are mapped onto the list (e.g. "xc ski" → Cross-country skiing).
Each activity's pictogram and colour live in `src/components/activityStyles.js` (Material Design Icons) and are
used for the map's progress marker and throughout the UI. To add an activity, extend both files and the
Strava/Garmin mappings in `src/services/integrations/`.

## Architecture

```
src/
  config/env.js            Validated build-time config + feature flags (single place that reads import.meta.env)
  domain/                  Pure business logic - no React, no I/O
    route.js, workout.js     models, validation, progress
    activities.js            activity types and icons
    schema.js                sanitises/migrates untrusted data (storage, API responses)
  lib/                     Generic helpers (geo math, formatting, ids, fetch with timeout)
  services/
    geo/                     routing (OSRM) + place search (Photon)
    storage/                 route repository (localStorage today, API later)
    auth/                    current user (guest today, Google sign-in later)
    integrations/            Strava / Garmin activity mappers and sync client
    api/                     backend HTTP client (cookie session, CSRF header)
  state/                   React contexts: AuthProvider -> RoutesProvider (useReducer)
  hooks/                   debounced, cancellable route calculation and place search
  components/              UI; components/map/ holds the Leaflet map
  pages/HomePage.jsx       composes sidebar, map and dialogs
```

Data flow: components call `useRoutes().actions.*` → pure `routesReducer` → `RoutesProvider` persists every
change through the repository chosen for the current user. Progress (`coveredDistance`) is always derived from
workouts, never stored.

## Security

- **Secrets:** `.env` is git-ignored. Every `VITE_*` value is embedded in the public bundle, so only
  browser-safe values belong there.
- **Content-Security-Policy:** injected into `index.html` by `vite.config.js` at build time, allowing only the
  hosts in `src/config/mapServices.js` (plus the API and Google sign-in when configured).
- **Hosting headers:** set these on the web server/CDN, since `<meta>` cannot express them:
  `Content-Security-Policy: frame-ancestors 'none'`, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: geolocation=(), camera=(), microphone=()`.
- **Untrusted data:** everything read from storage (and later from the API or Strava/Garmin) goes through
  `domain/schema.js`; malformed entries are dropped instead of crashing the app. User input is length-limited
  and validated in `domain/`.
- **Third-party APIs:** requests time out and are aborted when superseded; route calculation and autocomplete
  are debounced so typing does not flood the public servers.

## Roadmap: accounts and automatic workout import

The client is prepared; the missing piece is a backend (set `VITE_API_BASE_URL`). OAuth secrets and tokens
must live only there. The client expects these endpoints (session via HttpOnly cookie; requests carry
`X-Requested-With: map-runner`):

| Endpoint                                       | Used by                                      |
| ---------------------------------------------- | -------------------------------------------- |
| `POST /auth/google` `{ credential }`           | `authService.signInWithGoogle` (to implement) |
| `GET /auth/me`, `POST /auth/logout`            | `authService`                                |
| `GET/PUT /routes`                              | API route repository (to add in `services/storage`) |
| `GET /integrations/{strava,garmin}/connect`    | `integrations.connectUrl` - starts OAuth     |
| `GET /integrations/{id}/activities?since=ISO`  | `integrations.fetchNewWorkouts`              |

Each route has **automatic import** settings (edit the route → "Automatically import workouts"): an on/off
switch and the workout types it accepts (Running, Walking, Cycling, Hiking). Rules, enforced in
`src/domain/autoImport.js`:

- Only workouts recorded **after auto-import was switched on** are imported (compared by the provider's exact
  start time); switching it off and on again starts a new window. Past workouts are never pulled in.
- A **completed** route stops importing; the workout that crosses the finish line is the last one.
- Imported workouts carry `source` and `externalId`, so syncing repeatedly never duplicates them.

While any uncompleted route has auto-import on, `useAutoImportSync` polls the enabled providers every 15 minutes
(`since` = the earliest switch-on time) and `actions.importWorkouts` distributes the workouts.
