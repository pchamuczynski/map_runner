/**
 * Routing and place search on OpenStreetMap data:
 *  - Photon: place autocomplete and geocoding
 *  - OSRM:   routing
 *
 * Interface:
 *   calculateRoute(from, to, { signal }): Promise<RouteGeometry>
 *   searchPlaces(query, { signal }): Promise<Array<{ id, description, mainText, secondaryText }>>
 */
import { GEOCODING_URL, ROUTING_URL } from '../../config/mapServices';
import { fetchJson } from '../../lib/http';

const SUGGESTION_LIMIT = 5;

/** Builds a readable label from a Photon feature, e.g. "Gdańsk, województwo pomorskie, Polska". */
export const toSuggestion = (feature) => {
  const p = feature?.properties ?? {};
  const street = [p.street, p.housenumber].filter(Boolean).join(' ');
  const mainText = p.name || street || p.city || '';
  const context = [p.name ? street : '', p.city, p.state, p.country].filter((part) => part && part !== mainText);
  const secondaryText = [...new Set(context)].join(', ');
  return {
    id: `${p.osm_type ?? ''}${p.osm_id ?? mainText}`,
    description: [mainText, secondaryText].filter(Boolean).join(', '),
    mainText,
    secondaryText,
  };
};

const photonSearch = async (query, limit, signal) => {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  const data = await fetchJson(`${GEOCODING_URL}?${params}`, { signal });
  return Array.isArray(data?.features) ? data.features : [];
};

const geocode = async (place, signal) => {
  const [feature] = await photonSearch(place, 1, signal);
  const [lng, lat] = feature?.geometry?.coordinates ?? [];
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error(`Location not found: ${place}`);
  }
  return { lat, lng };
};

export const searchPlaces = async (query, { signal } = {}) => {
  const features = await photonSearch(query, SUGGESTION_LIMIT, signal);
  const seen = new Set();
  return features.map(toSuggestion).filter((s) => {
    if (!s.mainText || seen.has(s.description)) return false;
    seen.add(s.description);
    return true;
  });
};

export const calculateRoute = async (from, to, { signal } = {}) => {
  const [start, end] = await Promise.all([geocode(from, signal), geocode(to, signal)]);

  const url = `${ROUTING_URL}/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
  const data = await fetchJson(url, { signal, timeoutMs: 20000 });
  const route = data?.routes?.[0];
  if (data?.code !== 'Ok' || !route) {
    throw new Error('No route found between these locations');
  }

  return {
    coordinates: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    distance: route.distance,
    duration: route.duration,
    provider: 'osrm',
  };
};
