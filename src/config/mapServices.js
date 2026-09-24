/**
 * OpenStreetMap-based services used by the app. This file is also imported by
 * vite.config.js to build the Content-Security-Policy, so switching a provider
 * (e.g. hosted tiles or OpenRouteService in production) is a change here only.
 *
 * The defaults are free public servers with fair-use policies - fine for
 * development and light use:
 *  - Tiles:   https://operations.osmfoundation.org/policies/tiles/
 *  - Routing: OSRM demo server, no uptime guarantee
 *  - Search:  Photon by komoot, built for search-as-you-type
 */
export const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
export const TILE_MAX_ZOOM = 19;

export const ROUTING_URL = 'https://router.project-osrm.org/route/v1/driving';

export const GEOCODING_URL = 'https://photon.komoot.io/api/';

const originOf = (url) => new URL(url.replace(/\{[a-z]\}/g, 'x')).origin;

/** Origins the browser must be allowed to contact (used for the CSP). */
export const MAP_SERVICE_ORIGINS = Object.freeze({
  images: [originOf(TILE_URL)],
  connect: [originOf(ROUTING_URL), originOf(GEOCODING_URL)],
});
