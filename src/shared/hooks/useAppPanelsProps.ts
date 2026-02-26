import { useMemo } from 'react';
import type { AppPanelsProps } from '@shared/components/layout/AppPanels';

interface UseAppPanelsPropsInput {
  isBatchModalOpen: boolean;
  onCloseBatchModal: () => void;
  addToast: AppPanelsProps['addToast'];
  isJobsPanelOpen: boolean;
  onCloseJobsPanel: () => void;
  isWorkspaceManagerOpen: boolean;
  onCloseWorkspaceManager: () => void;
  isQueuePanelOpen: boolean;
  onCloseQueuePanel: () => void;
  fallbackNotification: AppPanelsProps['fallbackNotification'];
  onDismissFallback: () => void;
}

export function useAppPanelsProps({
  isBatchModalOpen,
  onCloseBatchModal,
  addToast,
  isJobsPanelOpen,
  onCloseJobsPanel,
  isWorkspaceManagerOpen,
  onCloseWorkspaceManager,
  isQueuePanelOpen,
  onCloseQueuePanel,
  fallbackNotification,
  onDismissFallback,
}: UseAppPanelsPropsInput): AppPanelsProps {
  return useMemo(
    () => ({
      isBatchModalOpen,
      onCloseBatchModal,
      addToast,
      isJobsPanelOpen,
      onCloseJobsPanel,
      isWorkspaceManagerOpen,
      onCloseWorkspaceManager,
      isQueuePanelOpen,
      onCloseQueuePanel,
      fallbackNotification,
      onDismissFallback,
    }),
    [
      isBatchModalOpen,
      onCloseBatchModal,
      addToast,
      isJobsPanelOpen,
      onCloseJobsPanel,
      isWorkspaceManagerOpen,
      onCloseWorkspaceManager,
      isQueuePanelOpen,
      onCloseQueuePanel,
      fallbackNotification,
      onDismissFallback,
    ],
  );
}
