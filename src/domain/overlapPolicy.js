/**
 * The overlap choice is global: one decision for every route, remembered in this browser.
 */
import { isOverlapPolicy } from './overlap';

const STORAGE_KEY = 'mapRunner:v2:overlap-policy';
const listeners = new Set();

export const readOverlapPolicy = () => {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return isOverlapPolicy(value) ? value : null;
  } catch {
    return null;
  }
};

export const writeOverlapPolicy = (policy) => {
  if (!isOverlapPolicy(policy)) return;
  try {
    localStorage.setItem(STORAGE_KEY, policy);
  } catch {
    // Storage can be blocked; the choice still applies for this session via subscribers.
  }
  listeners.forEach((listener) => listener(policy));
};

export const subscribeOverlapPolicy = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
