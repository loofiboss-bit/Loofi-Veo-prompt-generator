/**
 * useRafDebounce Hook
 *
 * Debounces a callback to fire at most once per animation frame.
 * Useful for high-frequency events like timeline scrubbing, drag, and scroll.
 * v1.6.0 — Performance & Stability
 */

import { useCallback, useRef } from 'react';

/**
 * Returns a debounced version of `fn` that runs at most once per rAF tick.
 * The latest arguments are always used when the callback fires.
 */
export function useRafDebounce<T extends (...args: never[]) => void>(fn: T): T {
  const rafId = useRef<number | null>(null);
  const latestArgs = useRef<Parameters<T> | null>(null);

  const debounced = useCallback(
    (...args: Parameters<T>) => {
      latestArgs.current = args;

      if (rafId.current !== null) return;

      rafId.current = requestAnimationFrame(() => {
        rafId.current = null;
        if (latestArgs.current !== null) {
          fn(...latestArgs.current);
          latestArgs.current = null;
        }
      });
    },
    [fn],
  ) as T;

  return debounced;
}
