import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { useAppHandlers } from './useAppHandlers';
import type { PromptState, VeoPromptResponse, PromptVariation } from '@core/types';
import { INITIAL_STATE } from '@core/constants';

// Mock react-i18next
const mockT = vi.fn((key: string) => key);
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: mockT,
    i18n: {
      language: 'en',
      getResourceBundle: vi.fn(() => ({})),
    },
  }),
}));

// Mock validation
const mockValidateField = vi.fn();
vi.mock('@core/utils/validation', () => ({
  validateField: (...args: unknown[]) => mockValidateField(...args),
}));

// Mock store hooks
vi.mock('@core/store/useAppStore', () => ({
  useAppStore: () => ({}),
}));

vi.mock('@core/store/useProjectStore', () => ({
  useProjectStore: () => ({}),
}));

vi.mock('@core/store/useHistoryStore', () => ({
  useHistoryStore: () => ({}),
}));

vi.mock('@core/store/useLocationStore', () => ({
  useLocationStore: () => ({
    setLocations: vi.fn(),
  }),
}));

// Mock services
vi.mock('@core/services/geminiService', () => ({
  enhancePrompt: vi.fn(),
  generatePrompt: vi.fn(),
  generateVariationsFromPrompt: vi.fn(),
  generateVariationsFromIdea: vi.fn(),
}));

vi.mock('@core/services/performanceService', () => ({
  performanceService: {
    startMark: vi.fn(),
    endMark: vi.fn(),
  },
}));

describe('useAppHandlers', () => {
  let mockPromptState: PromptState;
  let mockSetPromptState: (update: Partial<PromptState>, mode?: 'replace') => void;
  let mockSetErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  let mockAddToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  let mockErrors: Record<string, string>;

  const createDefaultOptions = () => ({
    promptState: mockPromptState,
    setPromptState: mockSetPromptState,
    generatedPrompt: null as VeoPromptResponse | null,
    setGeneratedPrompt: vi.fn(),
    errors: mockErrors,
    setErrors: mockSetErrors,
    addToast: mockAddToast,
    promptVariations: [] as PromptVariation[],
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
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockPromptState = { ...INITIAL_STATE };
    mockSetPromptState = vi.fn() as (update: Partial<PromptState>, mode?: 'replace') => void;
    mockSetErrors = vi.fn() as React.Dispatch<React.SetStateAction<Record<string, string>>>;
    mockAddToast = vi.fn() as (
      message: string,
      type: 'success' | 'error' | 'info' | 'warning',
    ) => void;
    mockErrors = {};
    mockValidateField.mockReturnValue(undefined);
  });

  it('handleInputChange updates prompt state and clears field error when validateField returns undefined', () => {
    const { result } = renderHook(() => useAppHandlers(createDefaultOptions()));

    const mockEvent = {
      currentTarget: {
        name: 'idea',
        value: 'A cinematic scene',
      },
    } as React.ChangeEvent<HTMLInputElement>;

    act(() => {
      result.current.handleInputChange(mockEvent);
    });

    expect(mockSetPromptState).toHaveBeenCalledWith({ idea: 'A cinematic scene' });
    expect(mockValidateField).toHaveBeenCalledWith(
      'idea',
      'A cinematic scene',
      expect.objectContaining({ idea: 'A cinematic scene' }),
      expect.any(Object),
    );
    expect(mockSetErrors).toHaveBeenCalledWith(expect.objectContaining({}));
  });

  it('handleCheckboxChange with useGoogleMaps updates promptState without GPS acquisition', () => {
    const { result } = renderHook(() => useAppHandlers(createDefaultOptions()));

    const mockEvent = {
      currentTarget: {
        name: 'useGoogleMaps',
        checked: true,
      },
    } as React.ChangeEvent<HTMLInputElement>;

    act(() => {
      result.current.handleCheckboxChange(mockEvent);
    });

    expect(mockSetPromptState).toHaveBeenCalledWith({ useGoogleMaps: true });
    // No geolocation acquisition — no toast expected
    expect(mockAddToast).not.toHaveBeenCalled();
  });

  it("handleTargetModelChange('sora') when artStyle is Cinematic sets Photorealistic and shows info toast", () => {
    mockPromptState.artStyle = 'Cinematic';
    mockT.mockImplementation((key: string) => key);

    const { result } = renderHook(() => useAppHandlers(createDefaultOptions()));

    act(() => {
      result.current.handleTargetModelChange('sora');
    });

    expect(mockSetPromptState).toHaveBeenCalledWith({
      targetModel: 'sora',
      artStyle: 'Photorealistic',
    });
    expect(mockAddToast).toHaveBeenCalledWith('toasts:toastSoraStyleSet', 'info');
  });
});
