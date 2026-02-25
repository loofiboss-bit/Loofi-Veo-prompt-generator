import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ToastMessage } from '@core/types';
import { AppOverlays } from './AppOverlays';

vi.mock('@shared/components/ui/Toast', () => ({
  default: ({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: string) => void }) => (
    <button data-testid="toast-item" onClick={() => onDismiss(toast.id)}>
      {toast.message}
    </button>
  ),
}));

vi.mock('@features/help/ChatBot', () => ({
  default: () => <div data-testid="chatbot">ChatBot</div>,
}));

vi.mock('@features/onboarding/WelcomeModal', () => ({
  WelcomeModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="welcome-modal">Welcome</div> : null,
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="welcome-modal">Welcome</div> : null,
}));

vi.mock('@features/onboarding/TutorialOverlay', () => ({
  TutorialOverlay: () => <div data-testid="tutorial-overlay">Tutorial</div>,
  default: () => <div data-testid="tutorial-overlay">Tutorial</div>,
}));

vi.mock('@features/onboarding', () => ({
  WelcomeModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="welcome-modal">Welcome</div> : null,
  TutorialOverlay: () => <div data-testid="tutorial-overlay">Tutorial</div>,
}));

vi.mock('@features/help', () => ({
  HelpPanel: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="help-panel">Help</div> : null,
}));

vi.mock('@features/diagnostics', () => ({
  DiagnosticsPanel: () => <div data-testid="diagnostics-panel">Diagnostics</div>,
}));

vi.mock('@shared/contexts/OnboardingContext', () => ({
  useOnboarding: () => ({
    state: {
      tutorialStep: 1,
      tutorialFlow: 'onboarding',
      tutorialActive: false,
    },
    currentStep: 1,
    totalSteps: 5,
    nextStep: vi.fn(),
    previousStep: vi.fn(),
    skipTutorial: vi.fn(),
    restartTutorial: vi.fn(),
    startTutorial: vi.fn(),
    setWelcomeShown: vi.fn(),
    isOnboarding: false,
  }),
}));

vi.mock('@features/settings/updates/components/UpdateNotification', () => ({
  UpdateNotification: () => <div data-testid="update-notification">Update</div>,
}));

function createToast(id: string): ToastMessage {
  return {
    id,
    message: `Toast ${id}`,
    type: 'info',
  };
}

function renderOverlays(overrides: Partial<React.ComponentProps<typeof AppOverlays>> = {}) {
  const props: React.ComponentProps<typeof AppOverlays> = {
    toasts: [],
    dismissToast: vi.fn(),
    hasSeenWelcome: true,
    onCloseWelcome: vi.fn(),
    showHelpPanel: false,
    closeHelpPanel: vi.fn(),
    helpPanelTopic: undefined,
    helpPanelCategory: undefined,
    isDiagnosticsOpen: false,
    onCloseDiagnostics: vi.fn(),
    ...overrides,
  };

  render(<AppOverlays {...props} />);
  return props;
}

describe('AppOverlays', () => {
  it('shows at most five visible toasts', () => {
    renderOverlays({
      toasts: [
        createToast('1'),
        createToast('2'),
        createToast('3'),
        createToast('4'),
        createToast('5'),
        createToast('6'),
      ],
    });

    const renderedToasts = screen.getAllByTestId('toast-item');
    expect(renderedToasts).toHaveLength(5);
    expect(screen.queryByText('Toast 1')).not.toBeInTheDocument();
    expect(screen.getByText('Toast 6')).toBeInTheDocument();
  });

  it('dismisses the latest toast on Escape', () => {
    const props = renderOverlays({
      toasts: [createToast('a'), createToast('b'), createToast('c')],
    });

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(props.dismissToast).toHaveBeenCalledWith('c');
  });

  it('renders onboarding/help/diagnostics overlays based on state', async () => {
    renderOverlays({
      hasSeenWelcome: false,
      showHelpPanel: true,
      isDiagnosticsOpen: true,
    });

    expect(await screen.findByTestId('chatbot')).toBeInTheDocument();
    expect(await screen.findByTestId('welcome-modal')).toBeInTheDocument();
    expect(await screen.findByTestId('tutorial-overlay')).toBeInTheDocument();
    expect(await screen.findByTestId('help-panel')).toBeInTheDocument();
    expect(await screen.findByTestId('diagnostics-panel')).toBeInTheDocument();
    expect(screen.getByTestId('update-notification')).toBeInTheDocument();
  });
});
