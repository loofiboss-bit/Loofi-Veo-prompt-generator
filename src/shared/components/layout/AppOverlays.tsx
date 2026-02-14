import React, { Suspense } from 'react';
import type { ToastMessage } from '@core/types';
import type { SafeModeStatus } from '@shared/hooks/useSafeMode';
import Toast from '@shared/components/ui/Toast';
import Icon from '@shared/components/ui/Icon';

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
const SettingsModal = React.lazy(() =>
  import('@features/settings/SettingsModal').then((module) => ({ default: module.SettingsModal })),
);
const DiagnosticsPanel = React.lazy(() =>
  import('@features/diagnostics').then((module) => ({ default: module.DiagnosticsPanel })),
);

import { UpdateNotification } from '@features/settings/updates/components/UpdateNotification';

interface AppOverlaysProps {
  // Toast system
  toasts: ToastMessage[];
  dismissToast: (id: string) => void;

  // Settings modal
  isSettingsModalOpen: boolean;
  onCloseSettings: () => void;
  safeModeStatus: SafeModeStatus | null;
  onApiKeySet: () => void;

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

  // Floating action buttons
  openHelpPanel: () => void;
  onOpenSettings: () => void;
  apiKeyConfigured: boolean;
}

export function AppOverlays({
  toasts,
  dismissToast,
  isSettingsModalOpen,
  onCloseSettings,
  safeModeStatus,
  onApiKeySet,
  hasSeenWelcome,
  onCloseWelcome,
  showHelpPanel,
  closeHelpPanel,
  helpPanelTopic,
  helpPanelCategory,
  isDiagnosticsOpen,
  onCloseDiagnostics,
  openHelpPanel,
  onOpenSettings,
  apiKeyConfigured,
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

      {/* Settings Modal */}
      <Suspense fallback={null}>
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={onCloseSettings}
          safeModeStatus={safeModeStatus}
          onApiKeySet={onApiKeySet}
        />
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

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-3">
        <button
          onClick={() => openHelpPanel()}
          title="Help & Shortcuts (? or F1)"
          aria-label="Help & Shortcuts"
          className="p-3 rounded-xl shadow-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all duration-200"
        >
          <Icon name="help" className="w-5 h-5" />
        </button>

        <button
          onClick={onOpenSettings}
          title="Settings"
          aria-label="Settings"
          className={`p-3 rounded-xl shadow-lg transition-all duration-200 ${
            apiKeyConfigured
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
              : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white animate-pulse'
          }`}
        >
          <Icon name="settings" className="w-5 h-5" />
        </button>
      </div>
    </>
  );
}
