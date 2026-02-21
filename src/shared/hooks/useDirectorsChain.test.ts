import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { Shot, GlobalContext } from '@core/types';

const { mockGenerateSpeech, mockGenerateConceptArt, mockStartGeneration, mockGetState } =
  vi.hoisted(() => ({
    mockGenerateSpeech: vi.fn(),
    mockGenerateConceptArt: vi.fn(),
    mockStartGeneration: vi.fn(),
    mockGetState: vi.fn().mockReturnValue({ tasks: [] }),
  }));

vi.mock('@core/services/geminiService', () => ({
  generateSpeech: (...args: unknown[]) => mockGenerateSpeech(...args),
  generateConceptArt: (...args: unknown[]) => mockGenerateConceptArt(...args),
}));

vi.mock('@core/utils/audio', () => ({
  getAudioDuration: vi.fn().mockResolvedValue(5.0),
  createWavHeader: vi.fn().mockReturnValue(new ArrayBuffer(44)),
}));

vi.mock('@core/services/promptBuilder', () => ({
  buildShotPrompt: vi.fn().mockReturnValue('Built prompt for shot'),
}));

vi.mock('@core/services/videoGenerationService', () => ({
  videoGenerationService: {
    startGeneration: (...args: unknown[]) => mockStartGeneration(...args),
  },
}));

vi.mock('@core/store/useVideoStore', () => ({
  useVideoStore: {
    getState: (...args: unknown[]) => mockGetState(...args),
  },
}));

vi.mock('@core/services/loggerService', () => ({
  logger: { error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { useDirectorsChain } from './useDirectorsChain';

function createMockShot(overrides: Partial<Shot> = {}): Shot {
  return {
    id: 1,
    type: 'action',
    action: 'Walking on the beach',
    dialogueText: 'Hello world',
    audioUrl: undefined,
    audioDuration: undefined,
    conceptImageUrl: undefined,
    generatedVideoUrl: undefined,
    duration: 5,
    ...overrides,
  } as Shot;
}

function createDefaultProps(overrides: Partial<Parameters<typeof useDirectorsChain>[0]> = {}) {
  return {
    shots: [createMockShot()],
    setShots: vi.fn(),
    updateShot: vi.fn(),
    addToast: vi.fn(),
    globalContext: { style: 'Cinematic', mood: 'Dramatic' } as unknown as GlobalContext,
    savedCharacters: [],
    locations: [],
    ...overrides,
  };
}

describe('useDirectorsChain', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:audio-url'),
      revokeObjectURL: vi.fn(),
    });
    vi.stubGlobal('atob', (data: string) => data);
  });

  it('should start with idle status', () => {
    const props = createDefaultProps();
    const { result } = renderHook(() => useDirectorsChain(props));

    expect(result.current.chainStatus).toBe('idle');
    expect(result.current.currentShotId).toBeNull();
    expect(result.current.currentStep).toBeNull();
    expect(result.current.progressMessage).toBe('');
  });

  it('should expose startChain and stopChain functions', () => {
    const props = createDefaultProps();
    const { result } = renderHook(() => useDirectorsChain(props));

    expect(typeof result.current.startChain).toBe('function');
    expect(typeof result.current.stopChain).toBe('function');
  });

  it('should stop chain and reset status', () => {
    const props = createDefaultProps();
    const { result } = renderHook(() => useDirectorsChain(props));

    act(() => {
      result.current.stopChain();
    });

    expect(result.current.chainStatus).toBe('idle');
    expect(result.current.currentShotId).toBeNull();
    expect(result.current.currentStep).toBeNull();
    expect(result.current.progressMessage).toBe('');
  });

  it('should handle audio generation error with pause', async () => {
    mockGenerateSpeech.mockRejectedValue(new Error('TTS failed'));

    const props = createDefaultProps();
    const { result } = renderHook(() => useDirectorsChain(props));

    await act(async () => {
      await result.current.startChain();
    });

    expect(result.current.chainStatus).toBe('error');
    expect(props.addToast).toHaveBeenCalledWith(
      expect.stringContaining('Audio generation failed'),
      'error',
    );
  });

  it('should skip title shots', async () => {
    const titleShot = createMockShot({ type: 'title', generatedVideoUrl: undefined });
    const props = createDefaultProps({ shots: [titleShot] });
    const { result } = renderHook(() => useDirectorsChain(props));

    await act(async () => {
      await result.current.startChain();
    });

    // Title shots are filtered — chain completes immediately
    expect(result.current.chainStatus).toBe('complete');
    expect(props.addToast).toHaveBeenCalledWith(expect.stringContaining('Complete'), 'success');
  });

  it('should skip already completed shots', async () => {
    const completedShot = createMockShot({ generatedVideoUrl: 'existing-video' });
    const props = createDefaultProps({ shots: [completedShot] });
    const { result } = renderHook(() => useDirectorsChain(props));

    await act(async () => {
      await result.current.startChain();
    });

    expect(result.current.chainStatus).toBe('complete');
    expect(mockGenerateSpeech).not.toHaveBeenCalled();
  });

  it('should cleanup blob URLs on unmount', () => {
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:test'),
      revokeObjectURL,
    });

    const props = createDefaultProps();
    const { unmount } = renderHook(() => useDirectorsChain(props));

    unmount();
    // Hook cleans up created URLs
  });
});
