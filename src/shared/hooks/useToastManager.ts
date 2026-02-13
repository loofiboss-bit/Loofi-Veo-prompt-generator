/**
 * useToastManager Hook
 *
 * Centralized toast notification state management.
 * Extracted from App.tsx to eliminate local toast state.
 * Provides the simple (message, type) API used throughout the app.
 */

import { useState, useCallback, useRef } from 'react';
import type { ToastMessage } from '@core/types';

export interface ToastManager {
  toasts: ToastMessage[];
  addToast: (message: string, type?: ToastMessage['type']) => void;
  dismissToast: (id: string) => void;
  clearToasts: () => void;
}

export function useToastManager(): ToastManager {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const idCounter = useRef(0);

  const addToast = useCallback((message: string, type: ToastMessage['type'] = 'info') => {
    const id = `toast-${Date.now()}-${++idCounter.current}`;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return { toasts, addToast, dismissToast, clearToasts };
}
