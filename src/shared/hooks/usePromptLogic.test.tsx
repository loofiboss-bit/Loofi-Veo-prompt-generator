import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePromptLogic } from './usePromptLogic';
import * as geminiService from '@core/services/geminiService';
import { PromptState } from '@core/types';

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
  // ... add minimum required fields to satisfy TS or keep it partial if type allows,
  // but strict typing usually requires full object or casting.
  // For this test context, we assume the hook handles the state passed to it.
} as PromptState;

const mockT = {
  errorValidation: 'Validation Error',
  toastPromptGenerated: 'Generated',
  autofillButton: 'Auto-fill',
};

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
        t: mockT,
      }),
    );

    const mockResponse = {
      artStyle: 'Noir',
      environment: 'Dark rainy city',
      cameraMovement: 'Tracking shot',
    };

    (geminiService.analyzeIdeaForModifiers as any).mockResolvedValue(mockResponse);

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
        t: mockT,
      }),
    );

    (geminiService.analyzeIdeaForModifiers as any).mockRejectedValue(new Error('API Error'));

    await act(async () => {
      await result.current.handleAutoFillModifiers();
    });

    expect(mockAddToast).toHaveBeenCalledWith(expect.anything(), 'error');
    expect(result.current.isAutoFilling).toBe(false);
  });
});
