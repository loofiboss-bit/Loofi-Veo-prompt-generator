/**
 * useToastManager Hook
 *
 * Centralized toast notification state management.
 * Extracted from App.tsx to eliminate local toast state.
 * Provides the simple (message, type) API used throughout the app.
 *
 * Behaviour:
 *  - success / info   → auto-dismiss after 3 s
 *  - warning          → auto-dismiss after 5 s
 *  - error            → persistent until user dismisses
 *  - Deduplication    → duplicate (message + type) within 2 s is ignored
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { ToastMessage } from '@core/types';

const AUTO_DISMISS_MS: Partial<Record<ToastMessage['type'], number>> = {
  success: 3000,
  info: 3000,
  warning: 5000,
};

const DEDUP_WINDOW_MS = 2000;

export interface ToastManager {
  toasts: ToastMessage[];
  addToast: (message: string, type?: ToastMessage['type']) => void;
  dismissToast: (id: string) => void;
  clearToasts: () => void;
}

export function useToastManager(): ToastManager {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const idCounter = useRef(0);
  const recentMessages = useRef<Map<string, number>>(new Map());
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismissToast = useCallback((id: string) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, type: ToastMessage['type'] = 'info') => {
      const dedupKey = `${type}:${message}`;
      const lastAdded = recentMessages.current.get(dedupKey) ?? 0;
      if (Date.now() - lastAdded < DEDUP_WINDOW_MS) return;

      recentMessages.current.set(dedupKey, Date.now());

      const id = `toast-${Date.now()}-${++idCounter.current}`;
      setToasts((prev) => [...prev, { id, message, type }]);

      const delay = AUTO_DISMISS_MS[type];
      if (delay !== undefined) {
        const timer = setTimeout(() => dismissToast(id), delay);
        timers.current.set(id, timer);
      }
    },
    [dismissToast],
  );

  const clearToasts = useCallback(() => {
    timers.current.forEach((timer) => clearTimeout(timer));
    timers.current.clear();
    setToasts([]);
  }, []);

  useEffect(
    () => () => {
      timers.current.forEach((timer) => clearTimeout(timer));
    },
    [],
  );

  return { toasts, addToast, dismissToast, clearToasts };
}
