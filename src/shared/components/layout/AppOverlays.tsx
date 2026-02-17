import React, { Suspense } from 'react';
import type { ToastMessage } from '@core/types';
import Toast from '@shared/components/ui/Toast';

// Lazy-loaded overlay components (moved from App.tsx)
const ChatBot = React.lazy(() => import('@features/help/ChatBot'));
const WelcomeModal = React.lazy(() =>
  import('@/components/onboarding').then((module) => ({ default: module.WelcomeModal })),
);
const TutorialOverlay = React.lazy(() =>
  import('@/components/onboarding').then((module) => ({ default: module.TutorialOverlay })),
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
      <Suspense fallback={null}>
        <ChatBot />
      </Suspense>

      {/* Onboarding Components */}
      <Suspense fallback={null}>
        <WelcomeModal isOpen={!hasSeenWelcome} onClose={onCloseWelcome} />

        <TutorialOverlay />

        <HelpPanel
          isOpen={showHelpPanel}
          onClose={closeHelpPanel}
          initialTopic={helpPanelTopic}
          initialCategory={helpPanelCategory}
        />
      </Suspense>

      {/* Auto-Update Notification */}
      <UpdateNotification />

      {/* Diagnostics Panel (v1.8.0) */}
      {isDiagnosticsOpen && (
        <Suspense fallback={null}>
          <DiagnosticsPanel onClose={onCloseDiagnostics} />
        </Suspense>
      )}
    </>
  );
}
