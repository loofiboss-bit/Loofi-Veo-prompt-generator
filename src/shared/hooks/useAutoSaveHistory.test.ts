import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { PromptState } from '@core/types';

const { mockAddEntry, mockLoggerError, projectState } = vi.hoisted(() => ({
  mockAddEntry: vi.fn(),
  mockLoggerError: vi.fn(),
  projectState: { currentProjectId: 'project-1' as string | null },
}));

vi.mock('@core/store/useHistoryStore', () => ({
  useHistoryStore: () => ({
    addEntry: mockAddEntry,
  }),
}));

vi.mock('@core/store/useProjectStore', () => ({
  useProjectStore: (selector: (state: { currentProjectId: string | null }) => unknown) =>
    selector(projectState),
}));

vi.mock('@core/services/loggerService', () => ({
  logger: { error: mockLoggerError, warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { useAutoSaveHistory } from './useAutoSaveHistory';

function createPromptState(overrides: Partial<PromptState> = {}): PromptState {
  return {
    idea: 'A sunset over the ocean',
    language: 'en',
    model: 'gemini-2.0-flash',
    targetModel: 'veo-2',
    generateAsSeries: false,
    artStyle: 'Cinematic',
    customArtStyle: '',
    cameraMovement: 'Pan',
    colorPalette: 'Warm',
    timeOfDay: 'Morning',
    weather: 'Clear',
    visualEffect: 'Bloom',
    cameraDistance: 'Medium Shot',
    characterGender: 'Male',
    characterAge: 'Adult',
    characterMood: 'Happy',
    characterPose: 'Standing',
    characterClothing: 'Casual',
    characterSkinTone: 'Fair',
    characterArchetype: 'Hero',
    characterEthnicity: 'Any',
    characterActions: 'Walking along the beach',
    characterNuances: '',
    characterSpecificClothing: '',
    characterVisualDNA: '',
    environment: 'Beach at sunset',
    environmentSensoryDetails: '',
    environmentDynamicEvents: '',
    ambientSound: 'Wind',
    soundEffectsIntensity: 'Medium',
    voiceStyle: 'Narrator',
    voiceOver: '',
    architecturalStyle: 'Modern',
    lightingStyle: 'Natural',
    compositionalGuide: 'Rule of Thirds',
    motionIntensity: 'Medium',
    creativityLevel: 'Balanced',
    lensType: '50mm',
    aspectRatio: '16:9',
    animationPreset: 'None',
    negativePrompt: '',
    audioMix: { voice: 50, ambient: 30, sfx: 20 },
    uploadedImage: null,
    uploadedAudio: null,
    ...overrides,
  } as PromptState;
}

describe('useAutoSaveHistory', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    projectState.currentProjectId = 'project-1';
    mockAddEntry.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does nothing when generated prompt is null', () => {
    const promptState = createPromptState();

    renderHook(() => useAutoSaveHistory(null, promptState));
    vi.advanceTimersByTime(500);

    expect(mockAddEntry).not.toHaveBeenCalled();
  });

  it('auto-saves after 500ms when prompt exists', async () => {
    const promptState = createPromptState({ artStyle: 'Noir' });
    const generatedPrompt = { prompt: 'Generated prompt text' } as { prompt: string };

    renderHook(() => useAutoSaveHistory(generatedPrompt as never, promptState));

    await vi.advanceTimersByTimeAsync(500);
    await vi.runAllTimersAsync();

    expect(mockAddEntry).toHaveBeenCalledTimes(1);

    expect(mockAddEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'project-1',
        prompt: 'Generated prompt text',
        params: promptState,
        favorite: false,
        tags: [],
      }),
    );
  });

  it('falls back to default project id when no current project', async () => {
    projectState.currentProjectId = null;
    const promptState = createPromptState();
    const generatedPrompt = { prompt: 'Prompt for default project' } as { prompt: string };

    renderHook(() => useAutoSaveHistory(generatedPrompt as never, promptState));
    await vi.advanceTimersByTimeAsync(500);
    await vi.runAllTimersAsync();

    expect(mockAddEntry).toHaveBeenCalledWith(expect.objectContaining({ projectId: 'default' }));
  });

  it('logs errors when saving fails', async () => {
    mockAddEntry.mockRejectedValueOnce(new Error('write failed'));
    const promptState = createPromptState();
    const generatedPrompt = { prompt: 'Generated prompt text' } as { prompt: string };

    renderHook(() => useAutoSaveHistory(generatedPrompt as never, promptState));
    await vi.advanceTimersByTimeAsync(500);
    await vi.runAllTimersAsync();

    expect(mockLoggerError).toHaveBeenCalledWith(
      'Failed to auto-save to history:',
      expect.any(Error),
    );
  });

  it('cleans up pending timeout on unmount', () => {
    const promptState = createPromptState();
    const generatedPrompt = { prompt: 'Generated prompt text' } as { prompt: string };

    const { unmount } = renderHook(() => useAutoSaveHistory(generatedPrompt as never, promptState));

    unmount();
    vi.advanceTimersByTime(500);

    expect(mockAddEntry).not.toHaveBeenCalled();
  });
});
