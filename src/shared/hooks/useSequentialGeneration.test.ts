import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSequentialGeneration } from './useSequentialGeneration';
import type { Shot, GenerationTask } from '@core/types';

vi.mock('@core/utils/videoUtils', () => ({
  extractLastFrame: vi.fn().mockResolvedValue({
    data: 'base64data',
    mimeType: 'image/png',
  }),
}));

vi.mock('@core/services/loggerService', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

function makeShot(overrides: Partial<Shot> = {}): Shot {
  return {
    id: 1,
    type: 'video' as const,
    action: 'A person walks',
    camera: 'Wide',
    duration: 5,
    transition: { type: 'cut', duration: 0 },
    takes: [],
    selectedTakeIndex: 0,
    visualLink: false,
    ...overrides,
  } as Shot;
}

describe('useSequentialGeneration', () => {
  const mockSetShots = vi.fn();
  const mockAddToast = vi.fn();
  const mockStartGeneration = vi.fn().mockResolvedValue('task-123');
  let mockTasks: GenerationTask[];
  let mockShots: Shot[];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockTasks = [];
    mockShots = [
      makeShot({ id: 1, action: 'Shot 1' }),
      makeShot({ id: 2, action: 'Shot 2' }),
      makeShot({ id: 3, action: 'Shot 3' }),
    ];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function renderSeqHook(overrides = {}) {
    return renderHook(
      (props) =>
        useSequentialGeneration({
          shots: props.shots,
          setShots: props.setShots,
          tasks: props.tasks,
          startGeneration: props.startGeneration,
          addToast: props.addToast,
          ...overrides,
        }),
      {
        initialProps: {
          shots: mockShots,
          setShots: mockSetShots,
          tasks: mockTasks,
          startGeneration: mockStartGeneration,
          addToast: mockAddToast,
        },
      },
    );
  }

  // ─── Initial state ──────────────────────────────────────────────

  it('should start with isSequencing = false', () => {
    const { result } = renderSeqHook();
    expect(result.current.isSequencing).toBe(false);
    expect(result.current.currentShotIndex).toBe(-1);
  });

  // ─── startSequence ──────────────────────────────────────────────

  it('should set isSequencing when startSequence is called', () => {
    const { result } = renderSeqHook();

    act(() => {
      result.current.startSequence(['prompt 1', 'prompt 2', 'prompt 3']);
    });

    expect(result.current.isSequencing).toBe(true);
    expect(result.current.currentShotIndex).toBe(0);
  });

  it('should not start with empty prompts', () => {
    const { result } = renderSeqHook();

    act(() => {
      result.current.startSequence([]);
    });

    expect(result.current.isSequencing).toBe(false);
  });

  // ─── stopSequence ──────────────────────────────────────────────

  it('should stop sequencing', () => {
    const { result } = renderSeqHook();

    act(() => {
      result.current.startSequence(['prompt 1']);
    });

    expect(result.current.isSequencing).toBe(true);

    act(() => {
      result.current.stopSequence();
    });

    expect(result.current.isSequencing).toBe(false);
    expect(result.current.currentShotIndex).toBe(-1);
  });

  // ─── Generation lifecycle ──────────────────────────────────────

  it('should call startGeneration for first shot after starting', async () => {
    const { result } = renderSeqHook();

    act(() => {
      result.current.startSequence(['prompt A']);
    });

    // Advance timer to trigger the useEffect interval
    await act(async () => {
      vi.advanceTimersByTime(1100);
    });

    expect(mockStartGeneration).toHaveBeenCalledWith(
      'prompt A',
      expect.objectContaining({
        aspectRatio: '16:9',
        resolution: '720p',
        veoModel: 'fast',
      }),
      undefined,
    );
  });

  it('should complete sequence when all prompts are generated', async () => {
    const { result, rerender } = renderSeqHook();

    act(() => {
      result.current.startSequence(['prompt only']);
    });

    // Trigger first generation
    await act(async () => {
      vi.advanceTimersByTime(1100);
    });

    expect(mockStartGeneration).toHaveBeenCalled();

    // Simulate task completion
    const completedTasks: GenerationTask[] = [
      {
        id: 'task-123',
        status: 'Complete' as const,
        videoUrl: 'http://example.com/video1.mp4',
        prompt: 'prompt only',
        settings: {},
        timestamp: Date.now(),
      } as GenerationTask,
    ];

    // Rerender with completed task
    rerender({
      shots: mockShots,
      setShots: mockSetShots,
      tasks: completedTasks,
      startGeneration: mockStartGeneration,
      addToast: mockAddToast,
    });

    await act(async () => {
      vi.advanceTimersByTime(1100);
    });

    // setShots should have been called with the updated shot
    expect(mockSetShots).toHaveBeenCalled();
  });

  it('should handle task errors gracefully', async () => {
    const { result, rerender } = renderSeqHook();

    act(() => {
      result.current.startSequence(['failing prompt']);
    });

    await act(async () => {
      vi.advanceTimersByTime(1100);
    });

    // Simulate task error
    const failedTasks: GenerationTask[] = [
      {
        id: 'task-123',
        status: 'Error' as const,
        error: 'API rate limit exceeded',
        prompt: 'failing prompt',
        settings: {},
        timestamp: Date.now(),
      } as GenerationTask,
    ];

    rerender({
      shots: mockShots,
      setShots: mockSetShots,
      tasks: failedTasks,
      startGeneration: mockStartGeneration,
      addToast: mockAddToast,
    });

    await act(async () => {
      vi.advanceTimersByTime(1100);
    });

    // Should show error toast
    expect(mockAddToast).toHaveBeenCalledWith(expect.stringContaining('Sequence failed'), 'error');
  });

  it('should handle startGeneration throwing', async () => {
    const mockStartFail = vi.fn().mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() =>
      useSequentialGeneration({
        shots: mockShots,
        setShots: mockSetShots,
        tasks: [],
        startGeneration: mockStartFail,
        addToast: mockAddToast,
      }),
    );

    act(() => {
      result.current.startSequence(['prompt']);
    });

    await act(async () => {
      vi.advanceTimersByTime(1100);
    });

    // Should have stopped sequencing on error
    expect(result.current.isSequencing).toBe(false);
  });

  // ─── Visual Link logic ─────────────────────────────────────────

  it('should extract last frame for visual link shots', async () => {
    const linkedShots = [
      makeShot({ id: 1, generatedVideoUrl: 'http://video1.mp4', visualLink: false }),
      makeShot({ id: 2, visualLink: true }),
    ];

    const { result } = renderHook(() =>
      useSequentialGeneration({
        shots: linkedShots,
        setShots: mockSetShots,
        tasks: [],
        startGeneration: mockStartGeneration,
        addToast: mockAddToast,
      }),
    );

    act(() => {
      result.current.startSequence(['prompt 1', 'prompt 2']);
    });

    // Complete first shot immediately
    await act(async () => {
      vi.advanceTimersByTime(1100);
    });

    // First generation triggered without image (first shot can't have visual link)
    expect(mockStartGeneration).toHaveBeenCalledWith('prompt 1', expect.any(Object), undefined);
  });

  // ─── Concept Image logic ───────────────────────────────────────

  it('should use concept image when available and no visual link', async () => {
    const shotsWithConcept = [
      makeShot({
        id: 1,
        conceptImageUrl: 'data:image/jpeg;base64,testImageData',
        visualLink: false,
      }),
    ];

    const { result } = renderHook(() =>
      useSequentialGeneration({
        shots: shotsWithConcept,
        setShots: mockSetShots,
        tasks: [],
        startGeneration: mockStartGeneration,
        addToast: mockAddToast,
      }),
    );

    act(() => {
      result.current.startSequence(['concept prompt']);
    });

    await act(async () => {
      vi.advanceTimersByTime(1100);
    });

    expect(mockStartGeneration).toHaveBeenCalledWith(
      'concept prompt',
      expect.any(Object),
      expect.objectContaining({
        mimeType: 'image/jpeg',
        data: 'testImageData',
      }),
    );
  });

  it('should handle invalid concept image URL gracefully', async () => {
    const shotsWithBadConcept = [
      makeShot({
        id: 1,
        conceptImageUrl: 'invalid-no-comma-url',
        visualLink: false,
      }),
    ];

    const { result } = renderHook(() =>
      useSequentialGeneration({
        shots: shotsWithBadConcept,
        setShots: mockSetShots,
        tasks: [],
        startGeneration: mockStartGeneration,
        addToast: mockAddToast,
      }),
    );

    act(() => {
      result.current.startSequence(['bad concept']);
    });

    await act(async () => {
      vi.advanceTimersByTime(1100);
    });

    // Should still call startGeneration without image
    expect(mockStartGeneration).toHaveBeenCalledWith('bad concept', expect.any(Object), undefined);
  });
});
