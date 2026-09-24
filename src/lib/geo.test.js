import { describe, expect, it } from 'vitest';
import { cumulativeDistances, haversineDistance, isValidCoordinate, pointAtFraction } from './geo';

describe('geo', () => {
  it('computes haversine distance', () => {
    // Warsaw -> Krakow is ~252 km as the crow flies
    expect(haversineDistance([52.2297, 21.0122], [50.0647, 19.945]) / 1000).toBeCloseTo(252, 0);
  });

  it('validates coordinates', () => {
    expect(isValidCoordinate([52, 21])).toBe(true);
    expect(isValidCoordinate([91, 0])).toBe(false);
    expect(isValidCoordinate(['52', 21])).toBe(false);
    expect(isValidCoordinate([NaN, 21])).toBe(false);
  });

  it('places the progress point by distance, not by vertex index', () => {
    // One short segment followed by one long segment: vertex index 1 is at ~9% of the length.
    const path = [
      [0, 0],
      [0, 0.1],
      [0, 1.1],
    ];
    const cumulative = cumulativeDistances(path);
    const [lat, lng] = pointAtFraction(path, cumulative, 0.5);
    expect(lat).toBeCloseTo(0, 6);
    expect(lng).toBeCloseTo(0.55, 3);
  });

  it('clamps fractions to the path ends', () => {
    const path = [
      [0, 0],
      [0, 1],
    ];
    const cumulative = cumulativeDistances(path);
    expect(pointAtFraction(path, cumulative, -1)).toEqual([0, 0]);
    expect(pointAtFraction(path, cumulative, 2)).toEqual([0, 1]);
  });
});
