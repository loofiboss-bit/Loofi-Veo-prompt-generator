/**
 * useGenerationQueueStore Tests
 * Tests for generation queue Zustand store.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { GenerationQueueItem } from '@core/types';

// Hoisted mock variables
const mockGenerationQueueService = vi.hoisted(() => {
  const mockQueueItems: GenerationQueueItem[] = [
    {
      id: 'q1',
      type: 'prompt',
      status: 'active',
      createdAt: Date.now(),
      startedAt: Date.now(),
      progress: 0.5,
      prompt: 'Test prompt 1',
    },
    {
      id: 'q2',
      type: 'batch',
      status: 'pending',
      createdAt: Date.now(),
      prompt: 'Test prompt 2',
    },
    {
      id: 'q3',
      type: 'prompt',
      status: 'completed',
      createdAt: Date.now(),
      startedAt: Date.now() - 5000,
      completedAt: Date.now(),
      progress: 1,
      prompt: 'Test prompt 3',
      result: 'Generated output',
    },
  ];

  const subscribers: Array<() => void> = [];

  return {
    mockQueueItems,
    getItems: vi.fn(() => mockQueueItems),
    subscribe: vi.fn((callback: () => void) => {
      subscribers.push(callback);
      return () => {
        const index = subscribers.indexOf(callback);
        if (index > -1) subscribers.splice(index, 1);
      };
    }),
    cancel: vi.fn(),
    retry: vi.fn(),
    _subscribers: subscribers,
  };
});

vi.mock('@core/services/generationQueueService', () => ({
  generationQueueService: mockGenerationQueueService,
}));

import { useGenerationQueueStore } from './useGenerationQueueStore';

describe('useGenerationQueueStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerationQueueService._subscribers.length = 0;
    mockGenerationQueueService.getItems.mockReturnValue(mockGenerationQueueService.mockQueueItems);
  });

  describe('initial state', () => {
    it('should initialize with items from service', () => {
      const state = useGenerationQueueStore.getState();

      expect(state.items).toHaveLength(3);
      expect(state.activeCount).toBe(1);
      expect(state.pendingCount).toBe(1);
    });

    // Store subscribes to service on initialization via closure
    // This test verifies the subscribe mechanism exists
  });

  describe('computed counts', () => {
    it('should count active items correctly', () => {
      const items: GenerationQueueItem[] = [
        { id: '1', type: 'prompt', status: 'active', createdAt: Date.now(), prompt: 'Test' },
        { id: '2', type: 'prompt', status: 'active', createdAt: Date.now(), prompt: 'Test' },
        { id: '3', type: 'prompt', status: 'pending', createdAt: Date.now(), prompt: 'Test' },
      ];

      mockGenerationQueueService.getItems.mockReturnValue(items);
      useGenerationQueueStore.getState().refresh();

      expect(useGenerationQueueStore.getState().activeCount).toBe(2);
    });

    it('should count pending items correctly', () => {
      const items: GenerationQueueItem[] = [
        { id: '1', type: 'prompt', status: 'pending', createdAt: Date.now(), prompt: 'Test' },
        { id: '2', type: 'prompt', status: 'pending', createdAt: Date.now(), prompt: 'Test' },
        { id: '3', type: 'prompt', status: 'active', createdAt: Date.now(), prompt: 'Test' },
      ];

      mockGenerationQueueService.getItems.mockReturnValue(items);
      useGenerationQueueStore.getState().refresh();

      expect(useGenerationQueueStore.getState().pendingCount).toBe(2);
    });

    it('should handle zero active items', () => {
      const items: GenerationQueueItem[] = [
        {
          id: '1',
          type: 'prompt',
          status: 'completed',
          createdAt: Date.now(),
          prompt: 'Test',
          completedAt: Date.now(),
        },
        {
          id: '2',
          type: 'prompt',
          status: 'failed',
          createdAt: Date.now(),
          prompt: 'Test',
          completedAt: Date.now(),
          error: 'Error',
        },
      ];

      mockGenerationQueueService.getItems.mockReturnValue(items);
      useGenerationQueueStore.getState().refresh();

      expect(useGenerationQueueStore.getState().activeCount).toBe(0);
      expect(useGenerationQueueStore.getState().pendingCount).toBe(0);
    });
  });

  describe('refresh', () => {
    it('should update items from service', () => {
      const newItems: GenerationQueueItem[] = [
        { id: 'q4', type: 'prompt', status: 'active', createdAt: Date.now(), prompt: 'New test' },
      ];

      mockGenerationQueueService.getItems.mockReturnValue(newItems);
      useGenerationQueueStore.getState().refresh();

      const state = useGenerationQueueStore.getState();
      expect(state.items).toEqual(newItems);
      expect(state.items).toHaveLength(1);
      expect(state.activeCount).toBe(1);
      expect(state.pendingCount).toBe(0);
    });

    it('should handle empty queue', () => {
      mockGenerationQueueService.getItems.mockReturnValue([]);
      useGenerationQueueStore.getState().refresh();

      const state = useGenerationQueueStore.getState();
      expect(state.items).toEqual([]);
      expect(state.activeCount).toBe(0);
      expect(state.pendingCount).toBe(0);
    });
  });

  describe('cancel', () => {
    it('should call service cancel method', () => {
      useGenerationQueueStore.getState().cancel('q1');

      expect(mockGenerationQueueService.cancel).toHaveBeenCalledWith('q1');
    });

    it('should handle canceling non-existent item', () => {
      useGenerationQueueStore.getState().cancel('non-existent');

      expect(mockGenerationQueueService.cancel).toHaveBeenCalledWith('non-existent');
    });
  });

  describe('retry', () => {
    it('should call service retry method', () => {
      useGenerationQueueStore.getState().retry('q3');

      expect(mockGenerationQueueService.retry).toHaveBeenCalledWith('q3');
    });

    it('should handle retrying non-existent item', () => {
      useGenerationQueueStore.getState().retry('non-existent');

      expect(mockGenerationQueueService.retry).toHaveBeenCalledWith('non-existent');
    });
  });

  describe('service subscription', () => {
    it('should update store when refresh is called', () => {
      // Simulate service change
      const updatedItems: GenerationQueueItem[] = [
        { id: 'q5', type: 'prompt', status: 'pending', createdAt: Date.now(), prompt: 'Updated' },
      ];

      mockGenerationQueueService.getItems.mockReturnValue(updatedItems);

      // Call refresh to update from service
      useGenerationQueueStore.getState().refresh();

      const state = useGenerationQueueStore.getState();
      expect(state.items).toEqual(updatedItems);
      expect(state.activeCount).toBe(0);
      expect(state.pendingCount).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('should handle items with all statuses', () => {
      const items: GenerationQueueItem[] = [
        { id: '1', type: 'prompt', status: 'pending', createdAt: Date.now(), prompt: 'Test' },
        { id: '2', type: 'prompt', status: 'active', createdAt: Date.now(), prompt: 'Test' },
        {
          id: '3',
          type: 'prompt',
          status: 'completed',
          createdAt: Date.now(),
          completedAt: Date.now(),
          prompt: 'Test',
        },
        {
          id: '4',
          type: 'prompt',
          status: 'failed',
          createdAt: Date.now(),
          completedAt: Date.now(),
          prompt: 'Test',
          error: 'Error',
        },
        {
          id: '5',
          type: 'prompt',
          status: 'cancelled',
          createdAt: Date.now(),
          completedAt: Date.now(),
          prompt: 'Test',
        },
      ];

      mockGenerationQueueService.getItems.mockReturnValue(items);
      useGenerationQueueStore.getState().refresh();

      const state = useGenerationQueueStore.getState();
      expect(state.items).toHaveLength(5);
      expect(state.activeCount).toBe(1);
      expect(state.pendingCount).toBe(1);
    });

    it('should handle items with progress', () => {
      const items: GenerationQueueItem[] = [
        {
          id: '1',
          type: 'prompt',
          status: 'active',
          createdAt: Date.now(),
          startedAt: Date.now(),
          progress: 0.75,
          prompt: 'Test',
        },
      ];

      mockGenerationQueueService.getItems.mockReturnValue(items);
      useGenerationQueueStore.getState().refresh();

      const state = useGenerationQueueStore.getState();
      expect(state.items[0].progress).toBe(0.75);
    });

    it('should handle batch type items', () => {
      const items: GenerationQueueItem[] = [
        {
          id: '1',
          type: 'batch',
          status: 'active',
          createdAt: Date.now(),
          startedAt: Date.now(),
          prompt: 'Batch test',
          batchSize: 10,
          batchProgress: 5,
        },
      ];

      mockGenerationQueueService.getItems.mockReturnValue(items);
      useGenerationQueueStore.getState().refresh();

      const state = useGenerationQueueStore.getState();
      expect(state.items[0].type).toBe('batch');
      expect(state.items[0].batchSize).toBe(10);
    });
  });
});
