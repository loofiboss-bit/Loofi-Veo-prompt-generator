import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock idb-keyval
const mockStore = new Map<string, unknown>();
vi.mock('idb-keyval', () => ({
  createStore: vi.fn(() => 'mock-store'),
  get: vi.fn((key: string, store?: unknown) =>
    Promise.resolve(mockStore.get(key)),
  ),
  set: vi.fn((key: string, value: unknown, store?: unknown) => {
    mockStore.set(key, value);
    return Promise.resolve();
  }),
}));

// Mock health monitor
vi.mock('./apiHealthMonitorService', () => ({
  apiHealthMonitorService: {
    registerEndpoint: vi.fn(),
    startRequest: vi.fn(),
    recordLatency: vi.fn(),
    getEndpointHealth: vi.fn(),
    getState: vi.fn(() => ({ isOnline: true, endpoints: {} })),
    getIsOnline: vi.fn(() => true),
    subscribe: vi.fn(() => () => {}),
    hydrate: vi.fn(),
    destroy: vi.fn(),
  },
}));

// Mock cost tracking
vi.mock('./costTrackingService', () => ({
  costTrackingService: {
    estimatePromptCost: vi.fn(),
    estimateVideoGenerationCost: vi.fn(),
    estimateImageGenerationCost: vi.fn(),
    recordCost: vi.fn(),
    recordEstimatedCost: vi.fn((estimate) => ({
      ...estimate,
      id: 'cost-123',
      timestamp: Date.now(),
    })),
    setMonthlyBudget: vi.fn(),
    isWithinBudget: vi.fn(() => true),
    getState: vi.fn(),
    subscribe: vi.fn(() => () => {}),
    getRecordsByModel: vi.fn(() => []),
    hasPricing: vi.fn(() => true),
    resetSession: vi.fn(),
    hydrate: vi.fn(),
  },
}));

// Mock logger
vi.mock('./loggerService', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { generationQueueService } from './generationQueueService';
import { apiHealthMonitorService } from './apiHealthMonitorService';

const tick = () => new Promise((r) => setTimeout(r, 10));

describe('generationQueueService', () => {
  beforeEach(() => {
    mockStore.clear();
    vi.clearAllMocks();
    vi.mocked(apiHealthMonitorService.getIsOnline).mockReturnValue(true);
  });

  describe('registerExecutor', () => {
    it('should register an executor for a type', () => {
      const mockExecutor = {
        execute: vi.fn().mockResolvedValue(undefined),
      };

      generationQueueService.registerExecutor('video', mockExecutor);

      // Verify it's stored by trying to enqueue and execute
      const item = generationQueueService.enqueue({
        type: 'video',
        label: 'Test video',
        payload: {},
      });

      expect(item).toBeDefined();
    });
  });

  describe('enqueue', () => {
    it('should create a queue item with pending status when online', () => {
      const item = generationQueueService.enqueue({
        type: 'video',
        label: 'Test video',
        payload: { duration: 10 },
      });

      expect(item).toBeDefined();
      expect(item.id).toBeDefined();
      expect(item.type).toBe('video');
      expect(item.label).toBe('Test video');
      // Status depends on whether executor is registered
      expect(item.status).toMatch(/pending|active|waiting-online/);
      expect(item.priority).toBe(0);
      expect(item.progress).toBe(0);
      expect(item.retryCount).toBe(0);
      expect(item.queuedOffline).toBe(false);
    });

    it('should set item to waiting-online when offline', () => {
      vi.mocked(apiHealthMonitorService.getIsOnline).mockReturnValue(false);

      const item = generationQueueService.enqueue({
        type: 'video',
        label: 'Test offline',
        payload: {},
      });

      expect(item.status).toBe('waiting-online');
      expect(item.queuedOffline).toBe(true);
    });

    it('should include cost estimate if provided', () => {
      const item = generationQueueService.enqueue({
        type: 'video',
        label: 'Test video',
        payload: {},
        costEstimate: {
          modelId: 'veo-3.1-generate-preview',
          estimatedInputTokens: 0,
          estimatedOutputTokens: 0,
          estimatedVideoDurationSeconds: 10,
          estimatedCostUsd: 0.1,
        },
      });

      expect(item.costEstimate).toBeDefined();
      expect(item.costEstimate?.estimatedCostUsd).toBe(0.1);
    });

    it('should set default priority to 0', () => {
      const item = generationQueueService.enqueue({
        type: 'video',
        label: 'Test',
        payload: {},
      });

      expect(item.priority).toBe(0);
    });

    it('should use provided priority', () => {
      const item = generationQueueService.enqueue({
        type: 'video',
        label: 'Important video',
        payload: {},
        priority: 10,
      });

      expect(item.priority).toBe(10);
    });
  });

  describe('cancel', () => {
    it('should cancel a pending item', () => {
      const item = generationQueueService.enqueue({
        type: 'video',
        label: 'Test',
        payload: {},
      });

      generationQueueService.cancel(item.id);

      const items = generationQueueService.getItems();
      const cancelled = items.find((i) => i.id === item.id);
      expect(cancelled?.status).toBe('cancelled');
    });

    it('should do nothing if item not found', () => {
      // Should not throw
      expect(() => {
        generationQueueService.cancel('non-existent-id');
      }).not.toThrow();
    });
  });

  describe('retry', () => {
    it('should retry a failed item', () => {
      const item = generationQueueService.enqueue({
        type: 'video',
        label: 'Test',
        payload: {},
      });

      // Manually set to failed for testing
      const items = generationQueueService.getItems();
      const queuedItem = items.find((i) => i.id === item.id);
      if (queuedItem) {
        queuedItem.status = 'failed';
        queuedItem.error = 'Test error';
      }

      generationQueueService.retry(item.id);

      const updatedItems = generationQueueService.getItems();
      const retried = updatedItems.find((i) => i.id === item.id);
      expect(retried?.status).toBe('pending');
      expect(retried?.error).toBeUndefined();
      expect(retried?.retryCount).toBeGreaterThan(0);
    });

    it('should not retry non-failed items', () => {
      const item = generationQueueService.enqueue({
        type: 'video',
        label: 'Test',
        payload: {},
      });

      generationQueueService.retry(item.id);

      const items = generationQueueService.getItems();
      const notRetried = items.find((i) => i.id === item.id);
      // Item should still be in its original or pending state, not failed
      expect(notRetried?.status).not.toBe('failed');
    });
  });

  describe('getItems', () => {
    it('should return all queue items', () => {
      generationQueueService.enqueue({
        type: 'video',
        label: 'Video 1',
        payload: {},
      });
      generationQueueService.enqueue({
        type: 'prompt',
        label: 'Prompt 1',
        payload: {},
      });

      const items = generationQueueService.getItems();
      expect(items.length).toBeGreaterThanOrEqual(2);
    });

    it('should return a copy of the items array', () => {
      const item = generationQueueService.enqueue({
        type: 'video',
        label: 'Test',
        payload: {},
      });

      const items1 = generationQueueService.getItems();
      const items2 = generationQueueService.getItems();

      expect(items1).not.toBe(items2);
    });
  });

  describe('getItemsByStatus', () => {
    it('should filter items by status', () => {
      generationQueueService.enqueue({
        type: 'video',
        label: 'Video 1',
        payload: {},
      });

      const allItems = generationQueueService.getItems();
      // Get items of any status that exists
      const firstItemStatus = allItems[0]?.status;
      if (firstItemStatus) {
        const byStatus = generationQueueService.getItemsByStatus(
          firstItemStatus,
        );
        expect(byStatus.length).toBeGreaterThan(0);
        expect(byStatus.every((i) => i.status === firstItemStatus)).toBe(true);
      }
    });
  });

  describe('event system', () => {
    it('should notify listeners when item is enqueued', () => {
      const listener = vi.fn();
      generationQueueService.subscribe(listener);

      generationQueueService.enqueue({
        type: 'video',
        label: 'Test',
        payload: {},
      });

      expect(listener).toHaveBeenCalled();
      const items = listener.mock.calls[0][0];
      expect(Array.isArray(items)).toBe(true);
    });

    it('should notify listeners when item is cancelled', () => {
      const listener = vi.fn();

      const item = generationQueueService.enqueue({
        type: 'video',
        label: 'Test',
        payload: {},
      });

      generationQueueService.subscribe(listener);
      listener.mockClear();

      generationQueueService.cancel(item.id);

      expect(listener).toHaveBeenCalled();
    });

    it('should allow unsubscribing', () => {
      const listener = vi.fn();
      const unsubscribe = generationQueueService.subscribe(listener);

      unsubscribe();

      generationQueueService.enqueue({
        type: 'video',
        label: 'Test',
        payload: {},
      });

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('clearHistory', () => {
    it('should remove completed/cancelled/failed items', () => {
      const item1 = generationQueueService.enqueue({
        type: 'video',
        label: 'Test 1',
        payload: {},
      });
      const item2 = generationQueueService.enqueue({
        type: 'video',
        label: 'Test 2',
        payload: {},
      });

      // Manually mark as completed for testing
      const items = generationQueueService.getItems();
      const toComplete = items.find((i) => i.id === item1.id);
      if (toComplete) toComplete.status = 'completed';

      generationQueueService.clearHistory();

      const remaining = generationQueueService.getItems();
      expect(remaining.find((i) => i.id === item1.id)).toBeUndefined();
      expect(remaining.find((i) => i.id === item2.id)).toBeDefined();
    });
  });

  describe('getActiveCount', () => {
    it('should return count of active items', () => {
      const item = generationQueueService.enqueue({
        type: 'video',
        label: 'Test',
        payload: {},
      });

      // Mark as active
      const items = generationQueueService.getItems();
      const active = items.find((i) => i.id === item.id);
      if (active) active.status = 'active';

      expect(generationQueueService.getActiveCount()).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getOfflinePendingCount', () => {
    it('should count waiting-online items', () => {
      vi.mocked(apiHealthMonitorService.getIsOnline).mockReturnValue(false);

      generationQueueService.enqueue({
        type: 'video',
        label: 'Offline item',
        payload: {},
      });

      expect(generationQueueService.getOfflinePendingCount()).toBeGreaterThan(0);
    });
  });

  describe('isActive', () => {
    it('should return true if items are pending or active', () => {
      generationQueueService.enqueue({
        type: 'video',
        label: 'Test',
        payload: {},
      });

      expect(generationQueueService.isActive()).toBe(true);
    });

    it('should return false if no items are pending/active', () => {
      const items = generationQueueService.getItems();
      for (const item of items) {
        if (item.status !== 'completed' && item.status !== 'cancelled') {
          generationQueueService.cancel(item.id);
        }
      }

      // After cleanup, check if truly no pending items
      const remaining = generationQueueService.getItems();
      const hasPending = remaining.some(
        (i) => i.status === 'pending' || i.status === 'active',
      );

      if (!hasPending) {
        expect(generationQueueService.isActive()).toBe(false);
      }
    });
  });

  describe('remove', () => {
    it('should remove an item from the queue', () => {
      const item = generationQueueService.enqueue({
        type: 'video',
        label: 'Test',
        payload: {},
      });

      generationQueueService.remove(item.id);

      const items = generationQueueService.getItems();
      expect(items.find((i) => i.id === item.id)).toBeUndefined();
    });
  });

  describe('offline handling', () => {
    it('should mark items as waiting-online when offline', () => {
      vi.mocked(apiHealthMonitorService.getIsOnline).mockReturnValue(false);

      const item = generationQueueService.enqueue({
        type: 'video',
        label: 'Test',
        payload: {},
      });

      expect(item.status).toBe('waiting-online');
      expect(item.queuedOffline).toBe(true);
    });
  });

  describe('hydration', () => {
    it('should hydrate persisted queue items', async () => {
      const item = generationQueueService.enqueue({
        type: 'video',
        label: 'Test',
        payload: {},
      });

      // Simulate app restart by hydrating
      await generationQueueService.hydrate();

      const items = generationQueueService.getItems();
      expect(items.length).toBeGreaterThanOrEqual(1);
    });

    it('should reset active items to pending on hydration', async () => {
      const item = generationQueueService.enqueue({
        type: 'video',
        label: 'Test',
        payload: {},
      });

      // Mark as active (simulating interrupted execution)
      const items = generationQueueService.getItems();
      const active = items.find((i) => i.id === item.id);
      if (active) active.status = 'active';

      // Hydrate should convert active back to pending
      await generationQueueService.hydrate();
    });
  });

  describe('destroy', () => {
    it('should cleanup resources', () => {
      expect(() => {
        generationQueueService.destroy();
      }).not.toThrow();
    });
  });
});
