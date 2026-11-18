import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ROUTES } from '@core/config/routes';
import { useVideoGeneration } from './useVideoGeneration';

const { mockStartGeneration, mockAddToQueue, mockVideoStoreState } = vi.hoisted(() => ({
  mockStartGeneration: vi.fn(),
  mockAddToQueue: vi.fn(),
  mockVideoStoreState: {
    tasks: [] as Array<{ id: string; status: string }>,
  },
}));

vi.mock('@core/services/videoGenerationService', () => ({
  videoGenerationService: {
    startGeneration: mockStartGeneration,
    addToQueue: mockAddToQueue,
  },
}));

vi.mock('@core/store/useVideoStore', () => ({
  useVideoStore: (selector: (state: typeof mockVideoStoreState) => unknown) =>
    selector(mockVideoStoreState),
}));

describe('useVideoGeneration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVideoStoreState.tasks = [];
    window.location.hash = '';
  });

  describe('startGeneration', () => {
    it('calls videoGenerationService.startGeneration and does not fall back to addToQueue when blocked', async () => {
      const addToast = vi.fn();
      mockStartGeneration.mockResolvedValue(null);

      const { result } = renderHook(() => useVideoGeneration(addToast));

      let taskId = '';
      await act(async () => {
        taskId = await result.current.startGeneration('Test prompt', {
          aspectRatio: '16:9',
          resolution: '1080p',
          veoModel: 'fast',
          count: 1,
        });
      });

      expect(taskId).toBe('');
      expect(mockStartGeneration).toHaveBeenCalledWith(
        'Test prompt',
        expect.objectContaining({ aspectRatio: '16:9', resolution: '1080p' }),
        undefined,
        expect.any(Function),
      );
      // Crucial requirement: must NOT push unapproved/malformed tasks via addToQueue fallback
      expect(mockAddToQueue).not.toHaveBeenCalled();
    });

    it('returns the taskId when videoGenerationService.startGeneration succeeds', async () => {
      const addToast = vi.fn();
      mockStartGeneration.mockResolvedValue('task-999');

      const { result } = renderHook(() => useVideoGeneration(addToast));

      let taskId = '';
      await act(async () => {
        taskId = await result.current.startGeneration('Valid prompt', {
          aspectRatio: '16:9',
          resolution: '720p',
          veoModel: 'fast',
        });
      });

      expect(taskId).toBe('task-999');
      expect(mockAddToQueue).not.toHaveBeenCalled();
    });
  });

  describe('addToQueue', () => {
    it('safely blocks pushing unapproved tasks, toasts message, and redirects to ROUTES.CREATE', async () => {
      const addToast = vi.fn();
      const { result } = renderHook(() => useVideoGeneration(addToast));

      let queueResult: unknown;
      await act(async () => {
        queueResult = await result.current.addToQueue(['Prompt 1'], {
          aspectRatio: '16:9',
        });
      });

      expect(queueResult).toBeNull();
      expect(mockAddToQueue).not.toHaveBeenCalled();
      expect(addToast).toHaveBeenCalledWith(expect.stringContaining('Open Create'), 'info');
      expect(window.location.hash).toBe(`#${ROUTES.CREATE}`);
    });
  });

  describe('isAnyGenerating', () => {
    it('returns true when there are generating tasks', () => {
      mockVideoStoreState.tasks = [{ id: '1', status: 'Processing' }];
      const { result } = renderHook(() => useVideoGeneration(vi.fn()));
      expect(result.current.isAnyGenerating).toBe(true);
    });

    it('returns false when no tasks are generating', () => {
      mockVideoStoreState.tasks = [{ id: '1', status: 'Complete' }];
      const { result } = renderHook(() => useVideoGeneration(vi.fn()));
      expect(result.current.isAnyGenerating).toBe(false);
    });
  });
});
