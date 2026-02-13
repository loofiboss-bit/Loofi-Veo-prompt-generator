/**
 * useHelpPanel Hook
 *
 * Encapsulates help panel visibility state and navigation.
 * Extracted from App.tsx to reduce component complexity.
 */

import { useState, useCallback } from 'react';

export interface HelpPanelState {
  showHelpPanel: boolean;
  helpPanelTopic: string | undefined;
  helpPanelCategory: string | undefined;
  openHelpPanel: (topicId?: string, category?: string) => void;
  closeHelpPanel: () => void;
}

export function useHelpPanel(): HelpPanelState {
  const [showHelpPanel, setShowHelpPanel] = useState(false);
  const [helpPanelTopic, setHelpPanelTopic] = useState<string | undefined>();
  const [helpPanelCategory, setHelpPanelCategory] = useState<string | undefined>();

  const openHelpPanel = useCallback((topicId?: string, category?: string) => {
    setHelpPanelTopic(topicId);
    setHelpPanelCategory(category);
    setShowHelpPanel(true);
  }, []);

  const closeHelpPanel = useCallback(() => {
    setShowHelpPanel(false);
    // Clear topic/category after animation
    setTimeout(() => {
      setHelpPanelTopic(undefined);
      setHelpPanelCategory(undefined);
    }, 300);
  }, []);

  return {
    showHelpPanel,
    helpPanelTopic,
    helpPanelCategory,
    openHelpPanel,
    closeHelpPanel,
  };
}
