import { describe, expect, it } from 'vitest';
import { formatDistance, formatDuration, todayLocalIsoDate } from './format';

describe('format', () => {
  it('formats distances', () => {
    expect(formatDistance(999.6)).toBe('1000m');
    expect(formatDistance(12345)).toBe('12.3km');
    expect(formatDistance(undefined)).toBe('0m');
  });

  it('formats durations', () => {
    expect(formatDuration(59 * 60)).toBe('59m');
    expect(formatDuration(3 * 3600 + 5 * 60)).toBe('3h 5m');
  });

  it('uses the local calendar day for "today"', () => {
    expect(todayLocalIsoDate(new Date(2025, 0, 5, 0, 30))).toBe('2025-01-05');
  });
});
