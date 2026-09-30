import { useCallback, useRef, useState } from 'react';
import ConfirmPopover from '../components/ConfirmPopover';
import { ConfirmContext } from './contexts';

/**
 * Provides `confirm({ anchor, message, confirmLabel })`, which shows a confirmation bubble next to
 * `anchor` (the clicked button) and resolves to true (confirmed) or false (cancelled).
 */
export const ConfirmProvider = ({ children }) => {
  const [request, setRequest] = useState(null);
  const resolveRef = useRef(null);
  const nextId = useRef(0);

  const settle = useCallback((answer) => {
    resolveRef.current?.(answer);
    resolveRef.current = null;
    setRequest(null);
  }, []);

  const confirm = useCallback(
    ({ anchor, message, confirmLabel }) =>
      new Promise((resolve) => {
        resolveRef.current?.(false); // a newer question replaces an unanswered one
        resolveRef.current = resolve;
        nextId.current += 1;
        setRequest({ id: nextId.current, anchor, message, confirmLabel });
      }),
    [],
  );

  const handleConfirm = useCallback(() => settle(true), [settle]);
  const handleCancel = useCallback(() => settle(false), [settle]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {request && (
        <ConfirmPopover
          key={request.id}
          anchor={request.anchor}
          message={request.message}
          confirmLabel={request.confirmLabel}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </ConfirmContext.Provider>
  );
};
