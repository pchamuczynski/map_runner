import { describe, expect, it } from 'vitest';
import { formatDistance, formatDuration, monthAgoLocalIsoDate, placeCity, todayLocalIsoDate } from './format';

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

  it('keeps only the city from a place label', () => {
    expect(placeCity('Wrocław, Lower Silesian Voivodeship, Poland')).toBe('Wrocław');
    expect(placeCity('Oslo, Norway')).toBe('Oslo');
    expect(placeCity('Gdynia')).toBe('Gdynia');
  });

  it('uses the local calendar day for "today"', () => {
    expect(todayLocalIsoDate(new Date(2025, 0, 5, 0, 30))).toBe('2025-01-05');
  });

  it('steps back one calendar month and clamps the day', () => {
    expect(monthAgoLocalIsoDate(new Date(2026, 10, 5))).toBe('2026-10-05');
    expect(monthAgoLocalIsoDate(new Date(2026, 2, 31))).toBe('2026-02-28');
    expect(monthAgoLocalIsoDate(new Date(2024, 2, 31))).toBe('2024-02-29');
  });
});
