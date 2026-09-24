import { useEffect } from 'react';

export const useEscapeKey = (onEscape) => {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onEscape();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onEscape]);
};
