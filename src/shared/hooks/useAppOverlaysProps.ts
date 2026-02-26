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
  commandPalette?: AppOverlaysProps['commandPalette'];
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
  commandPalette,
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
      commandPalette,
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
      commandPalette,
    ],
  );
}
