/**
 * Positions a small floating element (e.g. a confirmation bubble) next to an anchor:
 * below it when there is room, otherwise above, horizontally centred on the anchor and
 * kept inside the viewport. All values are viewport pixels (as from getBoundingClientRect).
 *
 * @param {{ top: number, bottom: number, left: number, right: number }} anchor
 * @param {{ width: number, height: number }} size   The floating element's size.
 * @param {{ width: number, height: number }} viewport
 * @returns {{ top: number, left: number, placement: 'below' | 'above', arrowX: number }}
 *   `arrowX` is where the pointer should sit, relative to the element's left edge.
 */
export const placeNextTo = (anchor, size, viewport, { gap = 8, margin = 8, arrowInset = 14 } = {}) => {
  const anchorCenter = (anchor.left + anchor.right) / 2;
  const maxLeft = Math.max(margin, viewport.width - margin - size.width);
  const left = Math.min(Math.max(anchorCenter - size.width / 2, margin), maxLeft);

  const fitsBelow = anchor.bottom + gap + size.height <= viewport.height - margin;
  const fitsAbove = anchor.top - gap - size.height >= margin;
  const placement = fitsBelow || !fitsAbove ? 'below' : 'above';
  const top =
    placement === 'below'
      ? Math.min(anchor.bottom + gap, Math.max(margin, viewport.height - margin - size.height))
      : anchor.top - gap - size.height;

  const arrowX = Math.min(Math.max(anchorCenter - left, arrowInset), Math.max(arrowInset, size.width - arrowInset));
  return { top, left, placement, arrowX };
};
