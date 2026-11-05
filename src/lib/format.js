/** Place labels are "City, county, country". The folded route shows the city. */
export const placeCity = (label) => String(label ?? '').split(',')[0].trim();

export const formatDistance = (meters) => {
  const value = Number(meters) || 0;
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}km`;
  }
  return `${Math.round(value)}m`;
};

export const formatDuration = (seconds) => {
  const minutes = Math.round((Number(seconds) || 0) / 60);
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
};

export const formatPercent = (ratio) => `${Math.round((Number(ratio) || 0) * 100)}%`;

/** Formats a `YYYY-MM-DD` date as a short label without timezone shifting. */
export const formatDate = (isoDate) => {
  const [year, month, day] = String(isoDate).split('-').map(Number);
  if (!year || !month || !day) return String(isoDate);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: '2-digit',
  });
};

/** Local date and time of an ISO timestamp, e.g. "Sep 24, 2026, 02:15 PM". */
export const formatDateTime = (isoTimestamp) =>
  new Date(isoTimestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

/** Today's date in the user's local timezone as `YYYY-MM-DD` (toISOString() would use UTC). */
export const todayLocalIsoDate = (now = new Date()) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

/** The same local calendar day one month earlier, clamped to the end of that month. */
export const monthAgoLocalIsoDate = (now = new Date()) => {
  const lastDay = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  const date = new Date(now.getFullYear(), now.getMonth() - 1, Math.min(now.getDate(), lastDay));
  return todayLocalIsoDate(date);
};
