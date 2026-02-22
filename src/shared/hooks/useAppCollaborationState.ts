import { useState, useEffect } from 'react';

import { useCollaborationStore } from '@core/store/useCollaborationStore';
import { useOptimizationStore } from '@core/store/useOptimizationStore';

export interface AppCollaborationState {
  isOptimizePanelOpen: boolean;
  toggleOptimizePanel: () => void;
  isShareDialogOpen: boolean;
  setIsShareDialogOpen: (open: boolean) => void;
  isProfileSetupOpen: boolean;
  setIsProfileSetupOpen: (open: boolean) => void;
  isCommentPanelOpen: boolean;
  setIsCommentPanelOpen: (open: boolean) => void;
  isRoleManagerOpen: boolean;
  setIsRoleManagerOpen: (open: boolean) => void;
}

export function useAppCollaborationState(): AppCollaborationState {
  const toggleOptimizePanel = useOptimizationStore((s) => s.togglePanel);
  const isOptimizePanelOpen = useOptimizationStore((s) => s.panelOpen);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isProfileSetupOpen, setIsProfileSetupOpen] = useState(false);
  const [isCommentPanelOpen, setIsCommentPanelOpen] = useState(false);
  const [isRoleManagerOpen, setIsRoleManagerOpen] = useState(false);
  const collabStatus = useCollaborationStore((s) => s.connectionStatus);
  const collabCurrentUser = useCollaborationStore((s) => s.currentUser);

  // Auto-open ProfileSetup when joining a room without a profile
  useEffect(() => {
    if (collabStatus === 'connected' && !collabCurrentUser) {
      setIsProfileSetupOpen(true);
    }
  }, [collabStatus, collabCurrentUser]);

  return {
    isOptimizePanelOpen,
    toggleOptimizePanel,
    isShareDialogOpen,
    setIsShareDialogOpen,
    isProfileSetupOpen,
    setIsProfileSetupOpen,
    isCommentPanelOpen,
    setIsCommentPanelOpen,
    isRoleManagerOpen,
    setIsRoleManagerOpen,
  };
}
