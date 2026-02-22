import React, { Suspense } from 'react';
import type { ToastMessage } from '@core/types';
import Toast from '@shared/components/ui/Toast';
import { ErrorBoundary } from '@shared/components/ErrorBoundary';
import { ModalSkeleton, Skeleton } from '@shared/components/ui/Skeleton';

// Lazy-loaded overlay components (moved from App.tsx)
const ChatBot = React.lazy(() => import('@features/help/ChatBot'));
const WelcomeModal = React.lazy(() =>
  import('@features/onboarding').then((module) => ({ default: module.WelcomeModal })),
);
const TutorialOverlay = React.lazy(() =>
  import('@features/onboarding').then((module) => ({ default: module.TutorialOverlay })),
);
const HelpPanel = React.lazy(() =>
  import('@features/help').then((module) => ({ default: module.HelpPanel })),
);
const DiagnosticsPanel = React.lazy(() =>
  import('@features/diagnostics').then((module) => ({ default: module.DiagnosticsPanel })),
);

import { UpdateNotification } from '@features/settings/updates/components/UpdateNotification';

interface AppOverlaysProps {
  // Toast system
  toasts: ToastMessage[];
  dismissToast: (id: string) => void;

  // Welcome / onboarding
  hasSeenWelcome: boolean;
  onCloseWelcome: () => void;

  // Help panel
  showHelpPanel: boolean;
  closeHelpPanel: () => void;
  helpPanelTopic?: string;
  helpPanelCategory?: string;

  // Diagnostics panel (v1.8.0)
  isDiagnosticsOpen: boolean;
  onCloseDiagnostics: () => void;
}

export function AppOverlays({
  toasts,
  dismissToast,
  hasSeenWelcome,
  onCloseWelcome,
  showHelpPanel,
  closeHelpPanel,
  helpPanelTopic,
  helpPanelCategory,
  isDiagnosticsOpen,
  onCloseDiagnostics,
}: AppOverlaysProps) {
  return (
    <>
      {/* Toasts */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast toast={toast} onDismiss={dismissToast} />
          </div>
        ))}
      </div>

      {/* Persistent Chat Assistant */}
      <ErrorBoundary panelId="app-chatbot-overlay">
        <Suspense
          fallback={
            <div className="fixed bottom-6 left-6 z-[90] rounded-xl bg-slate-900/80 border border-slate-700 p-3">
              <Skeleton variant="circular" width={32} height={32} />
            </div>
          }
        >
          <ChatBot />
        </Suspense>
      </ErrorBoundary>

      {/* Onboarding Components */}
      <ErrorBoundary panelId="app-onboarding-overlays">
        <Suspense fallback={<ModalSkeleton />}>
          <WelcomeModal isOpen={!hasSeenWelcome} onClose={onCloseWelcome} />

          <TutorialOverlay />

          <HelpPanel
            isOpen={showHelpPanel}
            onClose={closeHelpPanel}
            initialTopic={helpPanelTopic}
            initialCategory={helpPanelCategory}
          />
        </Suspense>
      </ErrorBoundary>

      {/* Auto-Update Notification */}
      <UpdateNotification />

      {/* Diagnostics Panel (v1.8.0) */}
      {isDiagnosticsOpen && (
        <ErrorBoundary panelId="app-diagnostics-overlay">
          <Suspense fallback={<ModalSkeleton />}>
            <DiagnosticsPanel onClose={onCloseDiagnostics} />
          </Suspense>
        </ErrorBoundary>
      )}
    </>
  );
}
