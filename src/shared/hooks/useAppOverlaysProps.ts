import { useMemo } from 'react';
import type { AppOverlaysProps } from '@shared/components/layout/AppOverlays';

interface UseAppOverlaysPropsInput {
  toasts: AppOverlaysProps['toasts'];
  dismissToast: AppOverlaysProps['dismissToast'];
  hasSeenWelcome: boolean;
  onCloseWelcome: () => void;
  showHelpPanel: boolean;
  closeHelpPanel: () => void;
  helpPanelTopic?: string;
  helpPanelCategory?: string;
  isDiagnosticsOpen: boolean;
  onCloseDiagnostics: () => void;
}

export function useAppOverlaysProps({
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
}: UseAppOverlaysPropsInput): AppOverlaysProps {
  return useMemo(
    () => ({
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
    }),
    [
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
    ],
  );
}
