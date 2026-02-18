import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Hoisted Mock Variables ───────────────────────────────────────────────
const {
  mockSubscribe,
  mockHydrate,
  mockEnqueue,
  mockCancel,
  mockRetry,
  mockRemove,
  mockClearHistory,
} = vi.hoisted(() => ({
  mockSubscribe: vi.fn(),
  mockHydrate: vi.fn(),
  mockEnqueue: vi.fn(),
  mockCancel: vi.fn(),
  mockRetry: vi.fn(),
  mockRemove: vi.fn(),
  mockClearHistory: vi.fn(),
}));

// Mock jobQueueService
vi.mock('@core/services/jobQueueService', () => ({
  jobQueueService: {
    subscribe: mockSubscribe,
    hydrate: mockHydrate,
    enqueue: mockEnqueue,
    cancel: mockCancel,
    retry: mockRetry,
    remove: mockRemove,
    clearHistory: mockClearHistory,
  },
  // Re-export types for TypeScript
  Job: {},
  JobType: {},
  JobPriority: {},
}));

import { useJobQueueStore } from './useJobQueueStore';
import type { Job } from '@core/services/jobQueueService';

describe('useJobQueueStore', () => {
  let subscriberCallback: (jobs: Job[]) => void;

  beforeEach(() => {
    vi.clearAllMocks();

    // Capture the subscriber callback when subscribe is called
    mockSubscribe.mockImplementation((cb: (jobs: Job[]) => void) => {
      subscriberCallback = cb;
    });

    mockHydrate.mockResolvedValue(undefined);
    mockEnqueue.mockResolvedValue('job-123');
    mockCancel.mockResolvedValue(true);
    mockRetry.mockResolvedValue(true);
    mockRemove.mockResolvedValue(true);
    mockClearHistory.mockResolvedValue(undefined);

    // Reset store to initial state
    useJobQueueStore.setState({
      jobs: [],
      hydrated: false,
      pendingCount: 0,
    });
  });

  afterEach(() => {
    // Reset module state by re-importing
    // The initialized flag is module-scoped, so we can't directly reset it
    // Instead, we verify the behavior works correctly across tests
  });

  it('should have correct initial state', () => {
    const state = useJobQueueStore.getState();
    expect(state.jobs).toEqual([]);
    expect(state.hydrated).toBe(false);
    expect(state.pendingCount).toBe(0);
  });

  describe('initialize', () => {
    it('should subscribe to service and hydrate on first call', async () => {
      // Clear mocks to get accurate counts for this specific test
      vi.clearAllMocks();

      await useJobQueueStore.getState().initialize();

      expect(mockSubscribe).toHaveBeenCalledTimes(1);
      expect(mockSubscribe).toHaveBeenCalledWith(expect.any(Function));
      expect(mockHydrate).toHaveBeenCalledTimes(1);
      expect(useJobQueueStore.getState().hydrated).toBe(true);
    });

    it('should not re-initialize on subsequent calls', async () => {
      // The store is already initialized from the previous test
      // (module-level initialized flag is true)
      const callsBefore = mockSubscribe.mock.calls.length;

      await useJobQueueStore.getState().initialize();

      // Should not have made additional calls
      expect(mockSubscribe.mock.calls.length).toBe(callsBefore);
    });

    it('should update jobs and pendingCount via subscription', async () => {
      await useJobQueueStore.getState().initialize();

      const mockJobs: Job[] = [
        {
          id: 'job-1',
          type: 'export',
          label: 'Export task',
          status: 'queued',
          priority: 'normal',
          progress: 0,
          createdAt: Date.now(),
        },
        {
          id: 'job-2',
          type: 'batch-prompt',
          label: 'Batch task',
          status: 'processing',
          priority: 'high',
          progress: 50,
          createdAt: Date.now(),
        },
        {
          id: 'job-3',
          type: 'analysis',
          label: 'Analysis task',
          status: 'completed',
          priority: 'normal',
          progress: 100,
          createdAt: Date.now(),
        },
      ];

      // Trigger the subscription callback
      subscriberCallback(mockJobs);

      const state = useJobQueueStore.getState();
      expect(state.jobs).toEqual(mockJobs);
      expect(state.pendingCount).toBe(2); // queued + processing
    });

    it('should calculate pendingCount correctly for empty jobs', async () => {
      await useJobQueueStore.getState().initialize();
      subscriberCallback([]);

      expect(useJobQueueStore.getState().pendingCount).toBe(0);
    });

    it('should calculate pendingCount correctly with only completed jobs', async () => {
      await useJobQueueStore.getState().initialize();

      const completedJobs: Job[] = [
        {
          id: 'job-1',
          type: 'export',
          label: 'Done',
          status: 'completed',
          priority: 'normal',
          progress: 100,
          createdAt: Date.now(),
        },
        {
          id: 'job-2',
          type: 'analysis',
          label: 'Failed',
          status: 'failed',
          priority: 'normal',
          progress: 0,
          createdAt: Date.now(),
        },
      ];

      subscriberCallback(completedJobs);

      expect(useJobQueueStore.getState().pendingCount).toBe(0);
    });
  });

  describe('enqueue', () => {
    it('should enqueue a job with all parameters', async () => {
      const result = await useJobQueueStore
        .getState()
        .enqueue('export', 'Export test', { data: 'test' }, 'high');

      expect(result).toBe('job-123');
      expect(mockEnqueue).toHaveBeenCalledWith('export', 'Export test', { data: 'test' }, 'high');
    });

    it('should enqueue a job with minimal parameters', async () => {
      const result = await useJobQueueStore.getState().enqueue('batch-prompt', 'Batch test');

      expect(result).toBe('job-123');
      expect(mockEnqueue).toHaveBeenCalledWith('batch-prompt', 'Batch test', undefined, undefined);
    });

    it('should handle enqueue errors', async () => {
      mockEnqueue.mockRejectedValue(new Error('Enqueue failed'));

      await expect(useJobQueueStore.getState().enqueue('analysis', 'Test')).rejects.toThrow(
        'Enqueue failed',
      );
    });
  });

  describe('cancel', () => {
    it('should cancel a job successfully', async () => {
      const result = await useJobQueueStore.getState().cancel('job-123');

      expect(result).toBe(true);
      expect(mockCancel).toHaveBeenCalledWith('job-123');
    });

    it('should return false when cancel fails', async () => {
      mockCancel.mockResolvedValue(false);

      const result = await useJobQueueStore.getState().cancel('job-456');

      expect(result).toBe(false);
    });

    it('should handle cancel errors', async () => {
      mockCancel.mockRejectedValue(new Error('Cancel failed'));

      await expect(useJobQueueStore.getState().cancel('job-123')).rejects.toThrow('Cancel failed');
    });
  });

  describe('retry', () => {
    it('should retry a failed job successfully', async () => {
      const result = await useJobQueueStore.getState().retry('job-123');

      expect(result).toBe(true);
      expect(mockRetry).toHaveBeenCalledWith('job-123');
    });

    it('should return false when retry fails', async () => {
      mockRetry.mockResolvedValue(false);

      const result = await useJobQueueStore.getState().retry('job-456');

      expect(result).toBe(false);
    });

    it('should handle retry errors', async () => {
      mockRetry.mockRejectedValue(new Error('Retry failed'));

      await expect(useJobQueueStore.getState().retry('job-123')).rejects.toThrow('Retry failed');
    });
  });

  describe('remove', () => {
    it('should remove a terminal job successfully', async () => {
      const result = await useJobQueueStore.getState().remove('job-123');

      expect(result).toBe(true);
      expect(mockRemove).toHaveBeenCalledWith('job-123');
    });

    it('should return false when remove fails', async () => {
      mockRemove.mockResolvedValue(false);

      const result = await useJobQueueStore.getState().remove('job-456');

      expect(result).toBe(false);
    });

    it('should handle remove errors', async () => {
      mockRemove.mockRejectedValue(new Error('Remove failed'));

      await expect(useJobQueueStore.getState().remove('job-123')).rejects.toThrow('Remove failed');
    });
  });

  describe('clearHistory', () => {
    it('should clear all terminal jobs', async () => {
      await useJobQueueStore.getState().clearHistory();

      expect(mockClearHistory).toHaveBeenCalledTimes(1);
    });

    it('should handle clearHistory errors', async () => {
      mockClearHistory.mockRejectedValue(new Error('Clear failed'));

      await expect(useJobQueueStore.getState().clearHistory()).rejects.toThrow('Clear failed');
    });
  });
});
