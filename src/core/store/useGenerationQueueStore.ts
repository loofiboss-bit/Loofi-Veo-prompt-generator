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

  // Actions
  /** Initialize the queue store and hydrate persisted items */
  initialize: () => Promise<void>;
  /** Refresh state from the queue service */
  refresh: () => void;
  /** Cancel a queued item */
  cancel: (id: string) => void;
  /** Retry a failed item */
  retry: (id: string) => void;
}

let initialized = false;

export const useGenerationQueueStore = create<GenerationQueueState>((set) => {
  const items = generationQueueService.getItems();

  return {
    ...summarizeItems(items),
    hydrated: false,

    initialize: async () => {
      if (!initialized) {
        generationQueueService.subscribe(() => {
          set(summarizeItems(generationQueueService.getItems()));
        });
        initialized = true;
      }

      await generationQueueService.hydrate();
      set({
        ...summarizeItems(generationQueueService.getItems()),
        hydrated: true,
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
