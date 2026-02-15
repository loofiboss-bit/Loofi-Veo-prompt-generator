/**
 * useAppInitialization Hook
 *
 * Extracts all initialization effects from App.tsx:
 * - Performance marks (startup, hydration)
 * - Database / plugin / video service bootstrap
 * - API key check → settings modal trigger
 * - New-project-wizard auto-open on fresh state
 */

import { useEffect, useRef } from 'react';
import { performanceService } from '@core/services/performanceService';
import { performanceProfiler } from '@core/services/performanceProfiler';
import { databaseService } from '@core/services/databaseService';
import { pluginService } from '@core/services/pluginService';
import { videoGenerationService } from '@core/services/videoGenerationService';
import { registerInternalPlugins } from '@core/config/internalPlugins';
import { hasApiKey } from '@core/services/apiKeyService';
import { useProjectStore } from '@core/store/useProjectStore';
import { jobQueueService } from '@core/services/jobQueueService';
import { batchPromptService } from '@core/services/batchPromptService';
import { sceneExportService } from '@core/services/sceneExportService';
import { useJobQueueStore } from '@core/store/useJobQueueStore';

interface UseAppInitializationOptions {
  _hasHydrated: boolean;
  currentProjectId: string | null;
  promptIdea: string;
  setNewProjectWizardOpen: (open: boolean) => void;
  setIsSettingsModalOpen: (open: boolean) => void;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export function useAppInitialization({
  _hasHydrated,
  currentProjectId,
  promptIdea,
  setNewProjectWizardOpen,
  setIsSettingsModalOpen,
  addToast,
}: UseAppInitializationOptions) {
  const projectStore = useProjectStore();
  const didRecordHydration = useRef(false);

  // Performance: end the app-startup mark started in index.tsx
  useEffect(() => {
    performanceService.endMark('app-startup');
  }, []);

  // Performance: track hydration timing
  useEffect(() => {
    performanceProfiler.start('app.hydration');
  }, []);

  useEffect(() => {
    if (!_hasHydrated || didRecordHydration.current) return;

    performanceProfiler.end('app.hydration');
    didRecordHydration.current = true;
  }, [_hasHydrated]);

  // Check for API key on mount and show modal if missing
  useEffect(() => {
    if (_hasHydrated && !hasApiKey()) {
      setIsSettingsModalOpen(true);
    }
  }, [_hasHydrated, currentProjectId, promptIdea, setNewProjectWizardOpen, setIsSettingsModalOpen]);

  // Initialize database service and ensure default project exists
  useEffect(() => {
    if (!_hasHydrated) return;

    const initializeDatabase = async () => {
      try {
        await databaseService.initialize();
        await projectStore.initialize();
        // Initialize plugin service
        await pluginService.initialize();
        await registerInternalPlugins();

        // Initialize video generation service
        videoGenerationService.initialize();

        // Initialize job queue and register executors
        await jobQueueService.hydrate();
        batchPromptService.register();
        sceneExportService.register();
        useJobQueueStore.getState().initialize();
      } catch (error) {
        console.error('Failed to initialize database/plugins:', error);
        addToast('Initialization failed', 'error');
      }
    };

    initializeDatabase();
  }, [_hasHydrated, projectStore, addToast]);

  // Check for fresh state to show New Project Wizard
  useEffect(() => {
    if (_hasHydrated) {
      const urlParams = new URLSearchParams(window.location.search);
      const sharedState = urlParams.get('state');

      if (!sharedState && !promptIdea && !currentProjectId) {
        setNewProjectWizardOpen(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentionally fires only on hydration; adding promptIdea/currentProjectId would re-open wizard on every edit
  }, [_hasHydrated]);
}
