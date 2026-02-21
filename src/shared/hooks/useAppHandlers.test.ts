import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import type { PromptState, VeoPromptResponse } from '@core/types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: 'en',
      getResourceBundle: () => ({}),
    },
  }),
}));

const mockStore = {
  resetAll: vi.fn(),
  setNewProjectWizardOpen: vi.fn(),
  closeModal: vi.fn(),
  clearHistory: vi.fn(),
  deleteHistoryEntry: vi.fn(),
  addToHistory: vi.fn(),
  addPreset: vi.fn(),
  deletePreset: vi.fn(),
  updatePreset: vi.fn(),
  addVisualDNA: vi.fn(),
  deleteVisualDNA: vi.fn(),
  setFullState: vi.fn(),
  applyTemplate: vi.fn(),
};

vi.mock('@core/store/useAppStore', () => ({
  useAppStore: () => mockStore,
}));

const mockProjectStore = {
  clearCurrentProject: vi.fn(),
  setCurrentProject: vi.fn(),
  refreshProjects: vi.fn(),
};

vi.mock('@core/store/useProjectStore', () => ({
  useProjectStore: () => mockProjectStore,
}));

vi.mock('@core/store/useHistoryStore', () => ({
  useHistoryStore: () => ({}),
}));

const mockSetLocations = vi.fn();
vi.mock('@core/store/useLocationStore', () => ({
  useLocationStore: () => ({ setLocations: mockSetLocations }),
}));

const mockEnhancePrompt = vi.fn();
vi.mock('@core/services/geminiService', () => ({
  enhancePrompt: (...args: unknown[]) => mockEnhancePrompt(...args),
}));

vi.mock('@core/services/performanceService', () => ({
  performanceService: { startMark: vi.fn(), endMark: vi.fn() },
}));

vi.mock('@core/utils/validation', () => ({
  validateField: () => null,
}));

vi.mock('@core/constants', () => ({
  CHARACTER_LIMITS: { voiceOver: 500, environment: 300 },
  INITIAL_STATE: { idea: '', language: 'en' },
}));

import { useAppHandlers } from './useAppHandlers';

function createDefaultOpts(overrides: Partial<Parameters<typeof useAppHandlers>[0]> = {}) {
  return {
    promptState: {
      idea: 'Test idea',
      language: 'en',
      artStyle: 'Cinematic',
      audioMix: { voice: 50, ambient: 30, sfx: 20 },
    } as PromptState,
    setPromptState: vi.fn(),
    generatedPrompt: null as VeoPromptResponse | null,
    setGeneratedPrompt: vi.fn(),
    errors: {} as Record<string, string>,
    setErrors: vi.fn(),
    addToast: vi.fn(),
    promptVariations: [],
    isGeneratingVariations: false,
    isBrainstorming: false,
    resetGenerationState: vi.fn(),
    conceptArtImage: null,
    setConceptArtImage: vi.fn(),
    storyboardImages: [],
    setStoryboardImages: vi.fn(),
    uploadedImageUrl: null,
    setUploadedImageUrl: vi.fn(),
    isEditing: false,
    setIsEditing: vi.fn(),
    resetEditHistory: vi.fn(),
    isEnhancingIdea: false,
    setIsEnhancingIdea: vi.fn(),
    ideaInputRef: { current: null } as React.RefObject<HTMLTextAreaElement | null>,
    safeModeStatus: null,
    openStudioSafely: vi.fn(),
    currentProjectName: null,
    currentProjectId: null,
    ...overrides,
  };
}

describe('useAppHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('scrollTo', vi.fn());
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:test'),
      revokeObjectURL: vi.fn(),
    });
  });

  // ─── handleInputChange ──────────────────────────────────────────

  it('should update prompt state on input change', () => {
    const opts = createDefaultOpts();
    const { result } = renderHook(() => useAppHandlers(opts));

    act(() => {
      const event = {
        currentTarget: { name: 'idea', value: 'New idea' },
      } as React.ChangeEvent<HTMLInputElement>;
      result.current.handleInputChange(event);
    });

    expect(opts.setPromptState).toHaveBeenCalledWith(expect.objectContaining({ idea: 'New idea' }));
  });

  it('should clear voiceOver when voiceStyle is set to None', () => {
    const opts = createDefaultOpts();
    const { result } = renderHook(() => useAppHandlers(opts));

    act(() => {
      const event = {
        currentTarget: { name: 'voiceStyle', value: 'None' },
      } as React.ChangeEvent<HTMLSelectElement>;
      result.current.handleInputChange(event);
    });

    expect(opts.setPromptState).toHaveBeenCalledWith(
      expect.objectContaining({ voiceStyle: 'None', voiceOver: '' }),
    );
  });

  // ─── handleCheckboxChange ───────────────────────────────────────

  it('should update prompt state on checkbox change', () => {
    const opts = createDefaultOpts();
    const { result } = renderHook(() => useAppHandlers(opts));

    act(() => {
      const event = {
        currentTarget: { name: 'generateAsSeries', checked: true },
      } as React.ChangeEvent<HTMLInputElement>;
      result.current.handleCheckboxChange(event);
    });

    expect(opts.setPromptState).toHaveBeenCalledWith({ generateAsSeries: true });
  });

  // ─── handleAudioMixChange ──────────────────────────────────────

  it('should update audio mix values', () => {
    const opts = createDefaultOpts();
    const { result } = renderHook(() => useAppHandlers(opts));

    act(() => {
      const event = {
        currentTarget: { name: 'audioMix.voice', value: '75' },
      } as React.ChangeEvent<HTMLInputElement>;
      result.current.handleAudioMixChange(event);
    });

    expect(opts.setPromptState).toHaveBeenCalledWith({
      audioMix: expect.objectContaining({ voice: 75 }),
    });
  });

  // ─── handleImageUpload / handleImageClear ──────────────────────

  it('should set uploaded image on upload', () => {
    const opts = createDefaultOpts();
    const { result } = renderHook(() => useAppHandlers(opts));

    act(() => {
      result.current.handleImageUpload({ data: 'base64', mimeType: 'image/png', url: 'blob:test' });
    });

    expect(opts.setPromptState).toHaveBeenCalledWith({
      uploadedImage: { data: 'base64', mimeType: 'image/png' },
    });
    expect(opts.setUploadedImageUrl).toHaveBeenCalledWith('blob:test');
  });

  it('should clear uploaded image', () => {
    const opts = createDefaultOpts();
    const { result } = renderHook(() => useAppHandlers(opts));

    act(() => {
      result.current.handleImageClear();
    });

    expect(opts.setPromptState).toHaveBeenCalledWith({
      uploadedImage: null,
      useImageAsCameo: false,
    });
    expect(opts.setUploadedImageUrl).toHaveBeenCalledWith(null);
  });

  // ─── handleAudioUpload / handleAudioClear ──────────────────────

  it('should set uploaded audio on upload', () => {
    const opts = createDefaultOpts();
    const { result } = renderHook(() => useAppHandlers(opts));

    act(() => {
      result.current.handleAudioUpload({
        data: 'audiodata',
        mimeType: 'audio/wav',
        name: 'test.wav',
      });
    });

    expect(opts.setPromptState).toHaveBeenCalledWith({
      uploadedAudio: { data: 'audiodata', mimeType: 'audio/wav', name: 'test.wav' },
    });
  });

  it('should clear uploaded audio', () => {
    const opts = createDefaultOpts();
    const { result } = renderHook(() => useAppHandlers(opts));

    act(() => {
      result.current.handleAudioClear();
    });

    expect(opts.setPromptState).toHaveBeenCalledWith({ uploadedAudio: null });
  });

  // ─── handleResetAll ─────────────────────────────────────────────

  it('should reset all state', () => {
    const opts = createDefaultOpts();
    const { result } = renderHook(() => useAppHandlers(opts));

    act(() => {
      result.current.handleResetAll();
    });

    expect(mockStore.resetAll).toHaveBeenCalled();
    expect(opts.setGeneratedPrompt).toHaveBeenCalledWith(null);
    expect(opts.setErrors).toHaveBeenCalledWith({});
    expect(opts.resetGenerationState).toHaveBeenCalled();
    expect(mockProjectStore.clearCurrentProject).toHaveBeenCalled();
    expect(mockStore.setNewProjectWizardOpen).toHaveBeenCalledWith(true);
  });

  // ─── handleNewPrompt ────────────────────────────────────────────

  it('should start a new prompt', () => {
    const opts = createDefaultOpts();
    const { result } = renderHook(() => useAppHandlers(opts));

    act(() => {
      result.current.handleNewPrompt();
    });

    expect(opts.setPromptState).toHaveBeenCalled();
    expect(opts.setGeneratedPrompt).toHaveBeenCalledWith(null);
    expect(opts.setErrors).toHaveBeenCalledWith({});
    expect(opts.resetGenerationState).toHaveBeenCalled();
    expect(mockProjectStore.clearCurrentProject).toHaveBeenCalled();
  });

  // ─── handleSavePrompt ──────────────────────────────────────────

  it('should save edited prompt text', () => {
    const generatedPrompt = { prompt: 'Old', groundingChunks: [{ web: { title: 'Source' } }] };
    const opts = createDefaultOpts({ generatedPrompt });
    const { result } = renderHook(() => useAppHandlers(opts));

    act(() => {
      result.current.handleSavePrompt('Updated prompt');
    });

    expect(opts.setGeneratedPrompt).toHaveBeenCalledWith({
      prompt: 'Updated prompt',
      groundingChunks: generatedPrompt.groundingChunks,
    });
    expect(opts.setIsEditing).toHaveBeenCalledWith(false);
    expect(opts.addToast).toHaveBeenCalledWith('toasts:toastPromptSaved', 'success');
  });

  // ─── saveToHistory ──────────────────────────────────────────────

  it('should save to history when prompt exists', () => {
    const generatedPrompt = { prompt: 'Test', groundingChunks: [] };
    const opts = createDefaultOpts({ generatedPrompt });
    const { result } = renderHook(() => useAppHandlers(opts));

    act(() => {
      result.current.saveToHistory();
    });

    expect(mockStore.addToHistory).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: 'Test' }),
    );
    expect(opts.addToast).toHaveBeenCalledWith('toasts:toastHistorySaved', 'success');
  });

  it('should show error when saving to history without prompt', () => {
    const opts = createDefaultOpts({ generatedPrompt: null });
    const { result } = renderHook(() => useAppHandlers(opts));

    act(() => {
      result.current.saveToHistory();
    });

    expect(opts.addToast).toHaveBeenCalledWith('toasts:errorNoPromptToSave', 'error');
  });

  // ─── handleShare ────────────────────────────────────────────────

  it('should copy share link to clipboard', () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    // jsdom lacks full URL constructor — provide a minimal stub
    const OriginalURL = globalThis.URL;
    globalThis.URL = class MockURL {
      href: string;
      searchParams = new Map<string, string>();
      constructor(base: string) {
        this.href = base;
        this.searchParams = { set: vi.fn() } as unknown as Map<string, string>;
      }
      toString() {
        return this.href;
      }
    } as unknown as typeof URL;

    const opts = createDefaultOpts();
    const { result } = renderHook(() => useAppHandlers(opts));

    act(() => {
      result.current.handleShare();
    });

    expect(writeText).toHaveBeenCalled();
    expect(opts.addToast).toHaveBeenCalledWith('toasts:toastShareLink', 'success');

    globalThis.URL = OriginalURL;
  });

  // ─── handleDownloadPrompt ───────────────────────────────────────

  it('should create and download a text file', () => {
    const mockLink = { href: '', download: '', click: vi.fn() };
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') return mockLink as unknown as HTMLElement;
      return originalCreateElement(tag);
    });
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
    vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);

    const opts = createDefaultOpts();
    const { result } = renderHook(() => useAppHandlers(opts));

    act(() => {
      result.current.handleDownloadPrompt('Download this prompt');
    });

    expect(mockLink.click).toHaveBeenCalled();
    expect(mockLink.download).toBe('veo-prompt.txt');
    expect(opts.addToast).toHaveBeenCalledWith('toasts:toastPromptDownloaded', 'success');

    vi.restoreAllMocks();
  });

  // ─── handleTargetModelChange ────────────────────────────────────

  it('should change target model', () => {
    const opts = createDefaultOpts();
    const { result } = renderHook(() => useAppHandlers(opts));

    act(() => {
      result.current.handleTargetModelChange('sora');
    });

    expect(opts.setPromptState).toHaveBeenCalledWith(
      expect.objectContaining({ targetModel: 'sora' }),
    );
  });

  it('should change art style to Photorealistic when switching to sora with Cinematic', () => {
    const opts = createDefaultOpts();
    const { result } = renderHook(() => useAppHandlers(opts));

    act(() => {
      result.current.handleTargetModelChange('sora');
    });

    expect(opts.setPromptState).toHaveBeenCalledWith(
      expect.objectContaining({ targetModel: 'sora', artStyle: 'Photorealistic' }),
    );
    expect(opts.addToast).toHaveBeenCalledWith('toasts:toastSoraStyleSet', 'info');
  });

  // ─── handleEnhanceIdea ──────────────────────────────────────────

  it('should enhance idea with gemini service', async () => {
    mockEnhancePrompt.mockResolvedValue('Enhanced cinematic description');
    const opts = createDefaultOpts();
    const { result } = renderHook(() => useAppHandlers(opts));

    await act(async () => {
      await result.current.handleEnhanceIdea();
    });

    expect(mockEnhancePrompt).toHaveBeenCalledWith('Test idea', 'Cinematic');
    expect(opts.setPromptState).toHaveBeenCalledWith({ idea: 'Enhanced cinematic description' });
    expect(opts.addToast).toHaveBeenCalledWith(expect.stringContaining('enhanced'), 'success');
  });

  it('should skip enhancement when idea is empty', async () => {
    const opts = createDefaultOpts({ promptState: { idea: '' } as PromptState });
    const { result } = renderHook(() => useAppHandlers(opts));

    await act(async () => {
      await result.current.handleEnhanceIdea();
    });

    expect(mockEnhancePrompt).not.toHaveBeenCalled();
  });

  it('should handle enhance error', async () => {
    mockEnhancePrompt.mockRejectedValue(new Error('AI fail'));
    const opts = createDefaultOpts();
    const { result } = renderHook(() => useAppHandlers(opts));

    await act(async () => {
      await result.current.handleEnhanceIdea();
    });

    expect(opts.addToast).toHaveBeenCalledWith(expect.stringContaining('Failed'), 'error');
    expect(opts.setIsEnhancingIdea).toHaveBeenCalledWith(false);
  });

  // ─── handleUseExample ───────────────────────────────────────────

  it('should apply example prompt', () => {
    const opts = createDefaultOpts();
    const { result } = renderHook(() => useAppHandlers(opts));
    const example = {
      title: 'Test',
      idea: 'Example idea',
      params: { idea: 'Example idea' },
      prompt: 'Example prompt text',
      groundingChunks: [],
    };

    act(() => {
      result.current.handleUseExample(example);
    });

    expect(opts.setPromptState).toHaveBeenCalled();
    expect(opts.setGeneratedPrompt).toHaveBeenCalledWith({
      prompt: 'Example prompt text',
      groundingChunks: [],
    });
    expect(opts.addToast).toHaveBeenCalledWith('toasts:toastTemplateApplied', 'info');
  });

  // ─── modalHandlers ──────────────────────────────────────────────

  it('should expose modalHandlers with expected keys', () => {
    const opts = createDefaultOpts();
    const { result } = renderHook(() => useAppHandlers(opts));

    const handlers = result.current.modalHandlers;
    expect(handlers).toHaveProperty('handleUseHistoryEntry');
    expect(handlers).toHaveProperty('handleClearHistory');
    expect(handlers).toHaveProperty('handleDeleteHistoryEntry');
    expect(handlers).toHaveProperty('handleUsePresetOrTemplate');
    expect(handlers).toHaveProperty('handleSavePreset');
    expect(handlers).toHaveProperty('handleDeletePreset');
    expect(handlers).toHaveProperty('handleUpdatePreset');
    expect(handlers).toHaveProperty('handleSaveDNA');
    expect(handlers).toHaveProperty('handleApplyDNA');
    expect(handlers).toHaveProperty('handleDeleteDNA');
    expect(handlers).toHaveProperty('handleLoadProject');
    expect(handlers).toHaveProperty('handleResetAll');
    expect(handlers).toHaveProperty('handleWizardComplete');
    expect(handlers).toHaveProperty('handleSelectTemplate');
    expect(handlers).toHaveProperty('handleSelectCharacter');
  });

  it('should reject saving preset with empty name', () => {
    const opts = createDefaultOpts();
    const { result } = renderHook(() => useAppHandlers(opts));

    act(() => {
      result.current.modalHandlers.handleSavePreset('  ');
    });

    expect(opts.addToast).toHaveBeenCalledWith('toasts:errorPresetNameRequired', 'error');
    expect(mockStore.addPreset).not.toHaveBeenCalled();
  });

  it('should save preset with valid name', () => {
    const opts = createDefaultOpts();
    const { result } = renderHook(() => useAppHandlers(opts));

    act(() => {
      result.current.modalHandlers.handleSavePreset('My Preset');
    });

    expect(mockStore.addPreset).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'My Preset' }),
    );
    expect(opts.addToast).toHaveBeenCalledWith('toasts:toastPresetSaved', 'success');
  });
});
