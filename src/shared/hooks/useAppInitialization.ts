/**
 * useAppInitialization Hook
 *
 * Extracts all initialization effects from App.tsx:
 * - Performance marks (startup, hydration)
 * - Database / plugin / video service bootstrap
 * - API key check -> settings route trigger
 * - New-project-wizard auto-open on fresh state
 */

import { useEffect, useRef } from 'react';
import { performanceService } from '@core/services/performanceService';
import { performanceProfiler } from '@core/services/performanceProfiler';
import { databaseService } from '@core/services/databaseService';
import { pluginService } from '@core/services/pluginService';
import { logger } from '@core/services/loggerService';
import { videoGenerationService } from '@core/services/videoGenerationService';
import { registerInternalPlugins } from '@core/config/internalPlugins';
import { hasApiKey } from '@core/services/apiKeyService';
import { useProjectStore } from '@core/store/useProjectStore';
import { jobQueueService } from '@core/services/jobQueueService';
import { batchPromptService } from '@core/services/batchPromptService';
import { sceneExportService } from '@core/services/sceneExportService';
import { useJobQueueStore } from '@core/store/useJobQueueStore';
import { settingsMigrationService } from '@core/services/settingsMigrationService';

type IdleCallback = () => void;

function scheduleDeferredWork(callback: IdleCallback): number {
  const idleWindow = window as Window & {
    requestIdleCallback?: (cb: () => void) => number;
  };

  if (typeof idleWindow.requestIdleCallback === 'function') {
    return idleWindow.requestIdleCallback(callback);
  }

  return window.setTimeout(callback, 0);
}

function cancelDeferredWork(handle: number): void {
  const idleWindow = window as Window & {
    cancelIdleCallback?: (id: number) => void;
  };

  if (typeof idleWindow.cancelIdleCallback === 'function') {
    idleWindow.cancelIdleCallback(handle);
    return;
  }

  window.clearTimeout(handle);
}

interface UseAppInitializationOptions {
  _hasHydrated: boolean;
  currentProjectId: string | null;
  promptIdea: string;
  setNewProjectWizardOpen: (open: boolean) => void;
  openSettings: () => void;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export function useAppInitialization({
  _hasHydrated,
  currentProjectId,
  promptIdea,
  setNewProjectWizardOpen,
  openSettings,
  addToast,
}: UseAppInitializationOptions) {
  const projectStore = useProjectStore();
  const didRecordHydration = useRef(false);

  // Performance: end the app-startup mark and begin hydration tracking
  useEffect(() => {
    performanceService.endMark('app-startup');
    performanceProfiler.start('app.hydration');
  }, []);

  // Hydration-once: finalize perf mark, check API key, and show wizard if fresh state
  useEffect(() => {
    if (!_hasHydrated || didRecordHydration.current) return;

    performanceProfiler.end('app.hydration');
    didRecordHydration.current = true;

    if (!hasApiKey()) {
      openSettings();
    }

    const urlParams = new URLSearchParams(window.location.search);
    const sharedState = urlParams.get('state');
    if (!sharedState && !promptIdea && !currentProjectId) {
      setNewProjectWizardOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentionally fires only once on hydration; adding promptIdea/currentProjectId/openSettings would re-trigger on every edit
  }, [_hasHydrated]);

  // Initialize database service and ensure default project exists
  useEffect(() => {
    if (!_hasHydrated) return;

    let isCancelled = false;
    let deferredHandle: number | null = null;

    const initializeDeferredServices = async () => {
      try {
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
        logger.error('Deferred service initialization failed:', error);
      }
    };

    const initializeDatabase = async () => {
      try {
        await databaseService.initialize();
        await settingsMigrationService.runMigrations();
        await projectStore.initialize();

        deferredHandle = scheduleDeferredWork(() => {
          if (isCancelled) return;
          void initializeDeferredServices();
        });
      } catch (error) {
        logger.error('Failed to initialize database/plugins:', error);
        addToast('Initialization failed', 'error');
      }
    };

    void initializeDatabase();

    return () => {
      isCancelled = true;
      if (deferredHandle !== null) {
        cancelDeferredWork(deferredHandle);
      }
    };
  }, [_hasHydrated, projectStore, addToast]);
}
