/**
 * Pictogram and colour for every activity (Material Design Icons, Apache-2.0).
 * Used for map markers and inline in the UI, so an activity looks the same everywhere.
 */
import {
  mdiBike,
  mdiHiking,
  mdiKayaking,
  mdiMapMarker,
  mdiRun,
  mdiSkiCrossCountry,
  mdiSwim,
  mdiWalk,
} from '@mdi/js';

const glyph = (path) => `<path d="${path}"/>`;

// There is no rollerski icon: a cross-country skier on a wheeled ski.
const ROLLERSKI_GLYPH =
  `<g transform="translate(2.6 0) scale(0.78)">${glyph(mdiSkiCrossCountry)}</g>` +
  '<rect x="1.5" y="19" width="21" height="1.4" rx="0.7"/><circle cx="4" cy="21.9" r="1.6"/><circle cx="20" cy="21.9" r="1.6"/>';

/** SVG markup for a 24x24 viewBox (the caller sets the fill) and the activity's colour. */
const ACTIVITY_STYLES = Object.freeze({
  Running: { svg: glyph(mdiRun), color: '#e53935' },
  Walking: { svg: glyph(mdiWalk), color: '#8e24aa' },
  Hiking: { svg: glyph(mdiHiking), color: '#6d4c41' },
  Cycling: { svg: glyph(mdiBike), color: '#ef6c00' },
  Swimming: { svg: glyph(mdiSwim), color: '#0288d1' },
  Kayaking: { svg: glyph(mdiKayaking), color: '#00897b' },
  Rollerski: { svg: ROLLERSKI_GLYPH, color: '#3949ab' },
  'Cross-country skiing': { svg: glyph(mdiSkiCrossCountry), color: '#1e88e5' },
});

const FALLBACK_STYLE = Object.freeze({ svg: glyph(mdiMapMarker), color: '#546e7a' });

export const activityStyle = (activity) => ACTIVITY_STYLES[activity] ?? FALLBACK_STYLE;
