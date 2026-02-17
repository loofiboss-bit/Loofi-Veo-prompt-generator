/**
 * Hook to subscribe to model fallback events and surface them as notifications.
 * Returns the current active fallback (if any) for rendering FallbackToast.
 *
 * @module shared/hooks/useFallbackNotifications
 * @since v2.5.0
 */
import { useEffect, useState, useCallback } from 'react';
import { modelFallbackService } from '@core/services/modelFallbackService';
import type { FallbackResult } from '@core/services/modelFallbackService';

interface FallbackNotification {
  primaryModel: string;
  fallbackModel: string;
  timestamp: number;
}

/**
 * Subscribes to modelFallbackService events and tracks the latest fallback
 * notification for display in the UI (e.g., FallbackToast).
 */
export function useFallbackNotifications() {
  const [notification, setNotification] = useState<FallbackNotification | null>(null);

  useEffect(() => {
    const unsubscribe = modelFallbackService.subscribe((result: FallbackResult) => {
      if (result.isFallback) {
        setNotification({
          primaryModel: result.primaryModelId,
          fallbackModel: result.modelId,
          timestamp: Date.now(),
        });
      }
    });

    return unsubscribe;
  }, []);

  const dismissNotification = useCallback(() => {
    setNotification(null);
  }, []);

  return { notification, dismissNotification };
}
