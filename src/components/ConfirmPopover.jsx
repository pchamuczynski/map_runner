/**
 * Small "Are you sure?" bubble shown next to the button that triggered it.
 * Esc, clicking elsewhere, scrolling or resizing cancels. Focus starts on "Cancel"
 * (a stray Enter never deletes) and returns to the triggering button afterwards.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { placeNextTo } from '../lib/placement';
import './ConfirmPopover.css';

const ConfirmPopover = ({ anchor, message, confirmLabel = 'Delete', onConfirm, onCancel }) => {
  const popoverRef = useRef(null);
  const cancelRef = useRef(null);
  const [position, setPosition] = useState(null);

  useLayoutEffect(() => {
    const { width, height } = popoverRef.current.getBoundingClientRect();
    setPosition(
      placeNextTo(anchor.getBoundingClientRect(), { width, height }, { width: window.innerWidth, height: window.innerHeight }),
    );
  }, [anchor]);

  // Focus only once positioned: the bubble is invisible while it measures itself, and
  // browsers do not focus invisible elements.
  useEffect(() => {
    if (position) cancelRef.current?.focus({ preventScroll: true });
  }, [position]);

  useEffect(
    () => () => {
      if (anchor.isConnected) anchor.focus({ preventScroll: true });
    },
    [anchor],
  );

  useEffect(() => {
    const onPointerDown = (e) => {
      if (!popoverRef.current?.contains(e.target)) onCancel();
    };
    // Any scroll or resize would detach the bubble from its button, so just cancel.
    const onScroll = (e) => {
      if (!popoverRef.current?.contains(e.target)) onCancel();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onCancel);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onCancel);
    };
  }, [onCancel]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation(); // don't also close a dialog underneath
      onCancel();
    }
  };

  return createPortal(
    <div
      ref={popoverRef}
      className={`confirm-popover confirm-popover-${position?.placement ?? 'below'}`}
      role="alertdialog"
      aria-modal="false"
      aria-labelledby="confirm-popover-message"
      style={
        position
          ? { top: position.top, left: position.left, '--arrow-x': `${position.arrowX}px` }
          : { top: 0, left: 0, visibility: 'hidden' }
      }
      onKeyDown={handleKeyDown}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) onCancel();
      }}
    >
      <p id="confirm-popover-message" className="confirm-popover-message">
        {message}
      </p>
      <div className="confirm-popover-actions">
        <button ref={cancelRef} type="button" className="btn btn-secondary btn-small" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="btn btn-danger btn-small" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </div>,
    document.body,
  );
};

export default ConfirmPopover;
