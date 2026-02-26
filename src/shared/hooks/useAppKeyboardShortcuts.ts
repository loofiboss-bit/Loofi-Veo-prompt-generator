/**
 * useAppKeyboardShortcuts Hook
 * v2.9.0 — Extracted from App.tsx
 *
 * Consolidates keyboard shortcut registration for the main app shell.
 */

import { useEffect, useCallback } from 'react';
import { useHotkeys } from '@shared/hooks/useHotkeys';

interface UseAppKeyboardShortcutsOptions {
  onGeneratePrompt: () => void;
  isLoading: boolean;
  onOpenHelpPanel: () => void;
  onOpenSavePresetModal: () => void;
  onToggleCommandPalette: () => void;
  activeStudio: string | null;
  modalState: {
    isHistoryOpen: boolean;
    isTemplatesOpen: boolean;
    isDNAModalOpen: boolean;
    isCharacterBankOpen: boolean;
    isLocationBankOpen: boolean;
    isProjectManagerOpen: boolean;
    isWizardOpen: boolean;
    isSeriesBibleOpen: boolean;
  };
}

export const useAppKeyboardShortcuts = ({
  onGeneratePrompt,
  isLoading,
  onOpenHelpPanel,
  onOpenSavePresetModal,
  onToggleCommandPalette,
  activeStudio,
  modalState,
}: UseAppKeyboardShortcutsOptions): void => {
  const noModalsOpen =
    !activeStudio &&
    !modalState.isHistoryOpen &&
    !modalState.isTemplatesOpen &&
    !modalState.isDNAModalOpen &&
    !modalState.isCharacterBankOpen &&
    !modalState.isLocationBankOpen &&
    !modalState.isProjectManagerOpen &&
    !modalState.isWizardOpen &&
    !modalState.isSeriesBibleOpen;

  useHotkeys(
    {
      'CTRL+ENTER': () => {
        if (!isLoading) onGeneratePrompt();
      },
      '?': () => onOpenHelpPanel(),
      F1: () => onOpenHelpPanel(),
      'CTRL+K': () => onToggleCommandPalette(),
    },
    noModalsOpen,
  );

  const handleGlobalKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      if (!isCmdOrCtrl) return;

      if (e.key.toLowerCase() === 's' && e.shiftKey) {
        e.preventDefault();
        onOpenSavePresetModal();
      }
    },
    [onOpenSavePresetModal],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleGlobalKeyDown]);
};
