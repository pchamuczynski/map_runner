/**
 * Marker artwork. Icons are SVG data URLs built with
 * encodeURIComponent (btoa() throws on emoji). Only constant/whitelisted content is
 * interpolated - never user input.
 */
import { activityStyle } from '../activityStyles';

const svgDataUrl = (svg) => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg.trim())}`;

export const START_ICON = {
  url: svgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
      <circle cx="16" cy="16" r="12" fill="#22c55e" stroke="#16a34a" stroke-width="2"/>
      <text x="16" y="21" text-anchor="middle" font-family="Arial" font-size="12" fill="white" font-weight="bold">GO</text>
    </svg>`),
  size: 32,
};

const emojiIcon = (emoji, size) => ({
  url: svgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
      <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="${Math.round(size * 0.72)}">${emoji}</text>
    </svg>`),
  size,
});

export const FINISH_ICON = emojiIcon('🏁', 32);

const PROGRESS_ICON_SIZE = 40;
const progressIconCache = new Map();

/** Round badge in the activity's colour with its white pictogram - marks how far the user has got. */
export const progressIcon = (activity) => {
  if (!progressIconCache.has(activity)) {
    const { svg, color } = activityStyle(activity);
    progressIconCache.set(activity, {
      url: svgDataUrl(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40">
          <circle cx="20" cy="21" r="18" fill="rgba(0,0,0,0.25)"/>
          <circle cx="20" cy="20" r="17.5" fill="${color}" stroke="white" stroke-width="2.5"/>
          <g transform="translate(8 8)" fill="white">${svg}</g>
        </svg>`),
      size: PROGRESS_ICON_SIZE,
    });
  }
  return progressIconCache.get(activity);
};
