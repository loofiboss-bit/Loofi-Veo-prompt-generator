/**
 * Zustand store for the unified generation queue.
 * Bridges generationQueueService to React components.
 *
 * @module core/store/useGenerationQueueStore
 */
import { create } from 'zustand';
import type { GenerationQueueItem } from '@core/types';
import { generationQueueService } from '@core/services/generationQueueService';

interface GenerationQueueState {
  /** All queue items */
  items: GenerationQueueItem[];
  /** Active (processing) items count */
  activeCount: number;
  /** Pending items count */
  pendingCount: number;

  // Actions
  /** Refresh state from the queue service */
  refresh: () => void;
  /** Cancel a queued item */
  cancel: (id: string) => void;
  /** Retry a failed item */
  retry: (id: string) => void;
}

export const useGenerationQueueStore = create<GenerationQueueState>((set) => {
  // Subscribe to service changes
  generationQueueService.subscribe(() => {
    const items = generationQueueService.getItems();
    set({
      items,
      activeCount: items.filter((i) => i.status === 'active').length,
      pendingCount: items.filter((i) => i.status === 'pending').length,
    });
  });

  const items = generationQueueService.getItems();

  return {
    items,
    activeCount: items.filter((i) => i.status === 'active').length,
    pendingCount: items.filter((i) => i.status === 'pending').length,

    refresh: () => {
      const current = generationQueueService.getItems();
      set({
        items: current,
        activeCount: current.filter((i) => i.status === 'active').length,
        pendingCount: current.filter((i) => i.status === 'pending').length,
      });
    },

    cancel: (id: string) => {
      generationQueueService.cancel(id);
    },

    retry: (id: string) => {
      generationQueueService.retry(id);
    },
  };
});
