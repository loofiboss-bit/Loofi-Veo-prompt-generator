import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface OnboardingState {
  completed: boolean;
  tutorialStep: number;
  tutorialActive: boolean;
  welcomeShown: boolean;
  lastUpdated: string;
}

interface OnboardingContextType {
  state: OnboardingState;
  startTutorial: () => void;
  nextStep: () => void;
  previousStep: () => void;
  skipTutorial: () => void;
  completeTutorial: () => void;
  resetOnboarding: () => void;
  restartTutorial: () => void;
  setWelcomeShown: () => void;
  goToStep: (step: number) => void;
}

const STORAGE_KEY = 'loofi-veo-onboarding';
const TOTAL_TUTORIAL_STEPS = 6;

const defaultState: OnboardingState = {
  completed: false,
  tutorialStep: 0,
  tutorialActive: false,
  welcomeShown: false,
  lastUpdated: new Date().toISOString(),
};

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const OnboardingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<OnboardingState>(() => {
    // Load from localStorage on mount
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse onboarding state:', e);
        return defaultState;
      }
    }
    return defaultState;
  });

  // Persist to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const startTutorial = () => {
    setState((prev) => ({
      ...prev,
      tutorialActive: true,
      tutorialStep: 1,
      lastUpdated: new Date().toISOString(),
    }));
  };

  const nextStep = () => {
    setState((prev) => {
      const nextStep = prev.tutorialStep + 1;
      if (nextStep > TOTAL_TUTORIAL_STEPS) {
        // Tutorial complete
        return {
          ...prev,
          tutorialActive: false,
          completed: true,
          lastUpdated: new Date().toISOString(),
        };
      }
      return {
        ...prev,
        tutorialStep: nextStep,
        lastUpdated: new Date().toISOString(),
      };
    });
  };

  const previousStep = () => {
    setState((prev) => ({
      ...prev,
      tutorialStep: Math.max(1, prev.tutorialStep - 1),
      lastUpdated: new Date().toISOString(),
    }));
  };

  const skipTutorial = () => {
    setState((prev) => ({
      ...prev,
      tutorialActive: false,
      completed: true,
      lastUpdated: new Date().toISOString(),
    }));
  };

  const completeTutorial = () => {
    setState((prev) => ({
      ...prev,
      tutorialActive: false,
      completed: true,
      lastUpdated: new Date().toISOString(),
    }));
  };

  const resetOnboarding = () => {
    setState({
      ...defaultState,
      lastUpdated: new Date().toISOString(),
    });
  };

  const setWelcomeShown = () => {
    setState((prev) => ({
      ...prev,
      welcomeShown: true,
      lastUpdated: new Date().toISOString(),
    }));
  };

  const goToStep = (step: number) => {
    setState((prev) => ({
      ...prev,
      tutorialStep: Math.max(1, Math.min(TOTAL_TUTORIAL_STEPS, step)),
      lastUpdated: new Date().toISOString(),
    }));
  };

  const restartTutorial = () => {
    setState((prev) => ({
      ...prev,
      tutorialActive: true,
      tutorialStep: 1,
      completed: false,
      lastUpdated: new Date().toISOString(),
    }));
  };

  const value: OnboardingContextType = {
    state,
    startTutorial,
    nextStep,
    previousStep,
    skipTutorial,
    completeTutorial,
    resetOnboarding,
    restartTutorial,
    setWelcomeShown,
    goToStep,
  };

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
};

export const useOnboarding = (): OnboardingContextType => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
};

export default OnboardingContext;
