import React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '../../test-utils';
import { OnboardingProvider } from '@shared/contexts/OnboardingContext';
import { TutorialOverlay } from './TutorialOverlay';

const ONBOARDING_STORAGE_KEY = 'loofi-veo-onboarding';

const setTutorialState = (step: number) => {
  localStorage.setItem(
    ONBOARDING_STORAGE_KEY,
    JSON.stringify({
      completed: false,
      tutorialStep: step,
      tutorialActive: true,
      tutorialFlow: 'main',
      welcomeShown: true,
      lastUpdated: new Date().toISOString(),
    }),
  );
};

describe('TutorialOverlay', () => {
  beforeEach(() => {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
  });

  it('uses fallbackSelector when the primary tour target is missing', async () => {
    setTutorialState(2);

    render(
      <>
        <div data-tour-id="app-header">Header target</div>
        <OnboardingProvider>
          <TutorialOverlay />
        </OnboardingProvider>
      </>,
    );

    await waitFor(() => {
      expect(screen.getByText('Project Context')).toBeInTheDocument();
      expect(document.querySelector('.tutorial-spotlight')).toBeInTheDocument();
    });
  });

  it('falls back to centered tooltip when no target is available', async () => {
    setTutorialState(4);

    render(
      <OnboardingProvider>
        <TutorialOverlay />
      </OnboardingProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Templates & Presets')).toBeInTheDocument();
      expect(document.querySelector('.tutorial-spotlight')).not.toBeInTheDocument();
    });
  });
});
