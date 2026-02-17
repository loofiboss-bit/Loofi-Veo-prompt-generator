/**
 * Zustand store for API health monitoring state.
 * Bridges apiHealthMonitorService to React components.
 *
 * @module core/store/useApiHealthStore
 */
import { create } from 'zustand';
import type { EndpointHealth } from '@core/types';
import { apiHealthMonitorService } from '@core/services/apiHealthMonitorService';

interface ApiHealthState {
  /** Per-endpoint health info */
  endpoints: Record<string, EndpointHealth>;
  /** Whether the app believes it's online */
  isOnline: boolean;

  // Actions
  /** Refresh state from the health monitor service */
  refresh: () => void;
}

export const useApiHealthStore = create<ApiHealthState>((set) => {
  // Subscribe to service changes for auto-sync
  apiHealthMonitorService.subscribe(() => {
    const serviceState = apiHealthMonitorService.getState();
    set({
      endpoints: serviceState.endpoints,
      isOnline: apiHealthMonitorService.getIsOnline(),
    });
  });

  // Listen for online/offline events
  if (typeof window !== 'undefined') {
    const syncOnline = () => set({ isOnline: navigator.onLine });
    window.addEventListener('online', syncOnline);
    window.addEventListener('offline', syncOnline);
  }

  const serviceState = apiHealthMonitorService.getState();

  return {
    endpoints: serviceState.endpoints,
    isOnline: apiHealthMonitorService.getIsOnline(),

    refresh: () => {
      const state = apiHealthMonitorService.getState();
      set({
        endpoints: state.endpoints,
        isOnline: apiHealthMonitorService.getIsOnline(),
      });
    },
  };
});
