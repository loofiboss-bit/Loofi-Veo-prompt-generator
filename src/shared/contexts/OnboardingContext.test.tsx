import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const { mockLoggerError } = vi.hoisted(() => ({
  mockLoggerError: vi.fn(),
}));

vi.mock('@core/services/loggerService', () => ({
  logger: { error: mockLoggerError, warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { OnboardingProvider, useOnboarding } from './OnboardingContext';

const STORAGE_KEY = 'loofi-veo-onboarding';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <OnboardingProvider>{children}</OnboardingProvider>
);

describe('OnboardingContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('throws when used outside provider', () => {
    expect(() => renderHook(() => useOnboarding())).toThrow(
      'useOnboarding must be used within OnboardingProvider',
    );
  });

  it('uses default initial state when nothing is stored', () => {
    const { result } = renderHook(() => useOnboarding(), { wrapper });

    expect(result.current.state.completed).toBe(false);
    expect(result.current.state.tutorialActive).toBe(false);
    expect(result.current.state.tutorialStep).toBe(0);
    expect(result.current.state.tutorialFlow).toBe('main');
    expect(result.current.state.welcomeShown).toBe(false);
  });

  it('loads and normalizes state from localStorage', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        completed: true,
        tutorialStep: 3,
        tutorialActive: true,
        tutorialFlow: 'composer',
        welcomeShown: true,
      }),
    );

    const { result } = renderHook(() => useOnboarding(), { wrapper });

    expect(result.current.state.completed).toBe(true);
    expect(result.current.state.tutorialStep).toBe(3);
    expect(result.current.state.tutorialFlow).toBe('composer');
    expect(result.current.state.welcomeShown).toBe(true);
    expect(result.current.state.lastUpdated).toBeTruthy();
  });

  it('falls back to defaults and logs when stored JSON is invalid', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json');

    const { result } = renderHook(() => useOnboarding(), { wrapper });

    expect(result.current.state.tutorialFlow).toBe('main');
    expect(result.current.state.tutorialStep).toBe(0);
    expect(mockLoggerError).toHaveBeenCalledWith(
      'Failed to load onboarding state:',
      expect.any(SyntaxError),
    );
  });

  it('starts main tutorial correctly', () => {
    const { result } = renderHook(() => useOnboarding(), { wrapper });

    act(() => {
      result.current.startTutorial();
    });

    expect(result.current.state.tutorialActive).toBe(true);
    expect(result.current.state.tutorialStep).toBe(1);
    expect(result.current.state.tutorialFlow).toBe('main');
  });

  it('starts composer tutorial correctly', () => {
    const { result } = renderHook(() => useOnboarding(), { wrapper });

    act(() => {
      result.current.startComposerTutorial();
    });

    expect(result.current.state.tutorialActive).toBe(true);
    expect(result.current.state.tutorialStep).toBe(1);
    expect(result.current.state.tutorialFlow).toBe('composer');
  });

  it('completes tutorial when advancing beyond final step', () => {
    const { result } = renderHook(() => useOnboarding(), { wrapper });

    act(() => {
      result.current.startTutorial();
      result.current.goToStep(6);
      result.current.nextStep();
    });

    expect(result.current.state.tutorialActive).toBe(false);
    expect(result.current.state.completed).toBe(true);
  });

  it('clamps step boundaries with previousStep and goToStep', () => {
    const { result } = renderHook(() => useOnboarding(), { wrapper });

    act(() => {
      result.current.startTutorial();
      result.current.previousStep();
    });
    expect(result.current.state.tutorialStep).toBe(1);

    act(() => {
      result.current.goToStep(999);
    });
    expect(result.current.state.tutorialStep).toBe(6);

    act(() => {
      result.current.goToStep(-999);
    });
    expect(result.current.state.tutorialStep).toBe(1);
  });

  it('persists state changes to localStorage', async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    const { result } = renderHook(() => useOnboarding(), { wrapper });

    act(() => {
      result.current.setWelcomeShown();
    });

    await waitFor(() => {
      expect(setItemSpy).toHaveBeenCalledWith(STORAGE_KEY, expect.any(String));
    });
  });
});
