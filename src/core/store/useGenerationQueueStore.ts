/**
 * Zustand store for the unified generation queue.
 * Bridges generationQueueService to React components.
 *
 * @module core/store/useGenerationQueueStore
 */
import { create } from 'zustand';
import type { GenerationQueueItem } from '@core/types';
import { generationQueueService } from '@core/services/generationQueueService';

function summarizeItems(items: GenerationQueueItem[]) {
  return {
    items,
    activeCount: items.filter((item) => item.status === 'active').length,
    pendingCount: items.filter(
      (item) => item.status === 'pending' || item.status === 'waiting-online',
    ).length,
  };
}

interface GenerationQueueState {
  /** All queue items */
  items: GenerationQueueItem[];
  /** Active (processing) items count */
  activeCount: number;
  /** Pending items count */
  pendingCount: number;
  /** Whether the store has hydrated and subscribed to the queue service */
  hydrated: boolean;
  /** Whether service subscription has been registered on this store instance */
  initialized: boolean;

  // Actions
  /** Initialize the queue store and hydrate persisted items */
  initialize: () => Promise<void>;
  /** Reset initialization tracking for clean test/runtime teardown */
  reset: () => void;
  /** Refresh state from the queue service */
  refresh: () => void;
  /** Cancel a queued item */
  cancel: (id: string) => void;
  /** Retry a failed item */
  retry: (id: string) => void;
}

export const useGenerationQueueStore = create<GenerationQueueState>((set, get) => {
  const items = generationQueueService.getItems();

  return {
    ...summarizeItems(items),
    hydrated: false,
    initialized: false,

    initialize: async () => {
      if (!get().initialized) {
        generationQueueService.subscribe(() => {
          set(summarizeItems(generationQueueService.getItems()));
        });
        set({ initialized: true });
      }

      await generationQueueService.hydrate();
      set({
        ...summarizeItems(generationQueueService.getItems()),
        hydrated: true,
      });
    },

    reset: () => {
      set({
        ...summarizeItems([]),
        hydrated: false,
        initialized: false,
      });
    },

    refresh: () => {
      const current = generationQueueService.getItems();
      set(summarizeItems(current));
    },

    cancel: (id: string) => {
      generationQueueService.cancel(id);
    },

    retry: (id: string) => {
      generationQueueService.retry(id);
    },
  };
});
