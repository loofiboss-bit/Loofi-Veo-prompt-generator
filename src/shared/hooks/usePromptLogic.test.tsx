import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePromptLogic } from './usePromptLogic';
import * as geminiService from '@core/services/geminiService';
import { PromptState } from '@core/types';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'toasts:toastPromptGenerated': 'Generated',
        'errors:errorValidation': 'Validation Error',
        'common:autofillButton': 'Auto-fill',
      };
      return translations[key] || key;
    },
    i18n: {
      language: 'en',
      getResourceBundle: () => ({
        errorValidation: 'Validation Error',
      }),
    },
  }),
}));

// Mock the Gemini Service
vi.mock('@core/services/geminiService', () => ({
  analyzeIdeaForModifiers: vi.fn(),
  generateVeoPrompt: vi.fn(),
}));

const mockAddToast = vi.fn();
const mockSetPromptState = vi.fn();

const initialState: PromptState = {
  idea: 'Test Idea',
  environment: '',
  characterActions: '',
  artStyle: 'Cinematic',
  language: 'en',
} as PromptState;

describe('usePromptLogic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handleAutoFillModifiers should call API and update state', async () => {
    const { result } = renderHook(() =>
      usePromptLogic({
        promptState: initialState,
        setPromptState: mockSetPromptState,
        addToast: mockAddToast,
        userCoords: null,
      }),
    );

    const mockResponse = {
      artStyle: 'Noir',
      environment: 'Dark rainy city',
      cameraMovement: 'Tracking shot',
    };

    vi.mocked(geminiService.analyzeIdeaForModifiers).mockResolvedValue(mockResponse);

    await act(async () => {
      await result.current.handleAutoFillModifiers();
    });

    expect(geminiService.analyzeIdeaForModifiers).toHaveBeenCalledWith(
      'Test Idea',
      'en',
      expect.any(Object), // Options object
      undefined, // series
      undefined, // model
      undefined, // target
    );

    expect(mockSetPromptState).toHaveBeenCalledWith(
      expect.objectContaining({
        artStyle: 'Noir',
        environment: 'Dark rainy city',
      }),
    );

    expect(mockAddToast).toHaveBeenCalledWith(expect.stringContaining('Complete'), 'success');
  });

  it('handleAutoFillModifiers should handle API errors gracefully', async () => {
    const { result } = renderHook(() =>
      usePromptLogic({
        promptState: initialState,
        setPromptState: mockSetPromptState,
        addToast: mockAddToast,
        userCoords: null,
      }),
    );

    vi.mocked(geminiService.analyzeIdeaForModifiers).mockRejectedValue(new Error('API Error'));

    await act(async () => {
      await result.current.handleAutoFillModifiers();
    });

    expect(mockAddToast).toHaveBeenCalledWith(expect.anything(), 'error');
    expect(result.current.isAutoFilling).toBe(false);
  });
});
