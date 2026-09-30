import { describe, expect, it } from 'vitest';
import { placeNextTo } from './placement';

const viewport = { width: 1400, height: 900 };
const size = { width: 240, height: 90 };
const anchorAt = (x, y, w = 28, h = 28) => ({ left: x, right: x + w, top: y, bottom: y + h });

describe('placeNextTo', () => {
  it('sits below the anchor, centred on it, with the arrow pointing at it', () => {
    const result = placeNextTo(anchorAt(600, 100), size, viewport);
    expect(result).toEqual({ top: 136, left: 494, placement: 'below', arrowX: 120 });
  });

  it('flips above when there is no room below', () => {
    const result = placeNextTo(anchorAt(600, 850), size, viewport);
    expect(result.placement).toBe('above');
    expect(result.top).toBe(850 - 8 - 90);
  });

  it('stays inside the viewport near the left edge and keeps the arrow on the anchor', () => {
    const result = placeNextTo(anchorAt(10, 100), size, viewport);
    expect(result.left).toBe(8);
    expect(result.arrowX).toBe(16); // anchor centre (24) relative to the bubble's left edge (8)
  });

  it('stays inside the viewport near the right edge', () => {
    const result = placeNextTo(anchorAt(1380, 100, 16), size, viewport);
    expect(result.left).toBe(1400 - 8 - 240);
    expect(result.arrowX).toBe(240 - 14); // clamped so the arrow stays on the bubble
  });

  it('prefers below when it fits neither way, keeping its top edge visible', () => {
    const tiny = { width: 400, height: 120 };
    const result = placeNextTo(anchorAt(100, 50), { width: 240, height: 110 }, tiny);
    expect(result.placement).toBe('below');
    expect(result.top).toBe(8);
  });
});
