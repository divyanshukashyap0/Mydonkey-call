// Animation Utilities & Reduced Motion Helper
import { useReducedMotion as useFramerReducedMotion } from 'framer-motion';

export const isReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

export const useReducedMotion = (): boolean => {
  return useFramerReducedMotion() ?? false;
};

// Wraps variant parameters to eliminate motion offset if reduced motion is requested
export const safeMotion = <T extends Record<string, any>>(variant: T): T => {
  if (!isReducedMotion()) return variant;

  const safe: any = { ...variant };
  if (safe.initial) {
    safe.initial = { ...safe.initial, x: 0, y: 0, scale: 1 };
  }
  if (safe.animate) {
    safe.animate = { ...safe.animate, x: 0, y: 0, scale: 1 };
  }
  if (safe.exit) {
    safe.exit = { ...safe.exit, x: 0, y: 0, scale: 1 };
  }
  return safe as T;
};
