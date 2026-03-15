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
import { performanceProfiler } from '@core/services/performanceProfiler';
import { databaseService } from '@core/services/databaseService';
import { pluginService } from '@core/services/pluginService';
import { logger } from '@core/services/loggerService';
import { videoGenerationService } from '@core/services/videoGenerationService';
import { registerInternalPlugins } from '@core/config/internalPlugins';
import { hasApiKeyAsync, getStoredApiKeyAsync } from '@core/services/apiKeyService';
import { useProjectStore } from '@core/store/useProjectStore';
import { jobQueueService } from '@core/services/jobQueueService';
import { batchPromptService } from '@core/services/batchPromptService';
import { sceneExportService } from '@core/services/sceneExportService';
import { useGenerationQueueStore } from '@core/store/useGenerationQueueStore';
import { useJobQueueStore } from '@core/store/useJobQueueStore';
import { useStartupStore, type StartupService } from '@core/store/useStartupStore';
import { settingsMigrationService } from '@core/services/settingsMigrationService';
import { markEnd, markStart, PERF_MARKS } from '@core/utils/performanceMarks';

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

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

interface UseAppInitializationOptions {
  _hasHydrated: boolean;
  hasSeenWelcome: boolean;
  currentProjectId: string | null;
  promptIdea: string;
  setNewProjectWizardOpen: (open: boolean) => void;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export function useAppInitialization({
  _hasHydrated,
  hasSeenWelcome,
  currentProjectId,
  promptIdea,
  setNewProjectWizardOpen,
  addToast,
}: UseAppInitializationOptions) {
  const projectStore = useProjectStore();
  const didRecordHydration = useRef(false);

  const runTrackedStartupStep = async <T>(
    service: StartupService,
    callback: () => Promise<T> | T,
  ): Promise<T> => {
    useStartupStore.getState().markServiceRunning(service);

    try {
      const result = await callback();
      useStartupStore.getState().markServiceReady(service);
      return result;
    } catch (error) {
      useStartupStore.getState().markServiceDegraded(service, getErrorMessage(error));
      throw error;
    }
  };

  // Performance: end the app-startup mark and begin hydration tracking
  useEffect(() => {
    markEnd(PERF_MARKS.APP_STARTUP);
    markStart(PERF_MARKS.STORE_HYDRATION);
    markStart(PERF_MARKS.CRITICAL_BOOTSTRAP);
    performanceProfiler.start('app.hydration');
  }, []);

  // Hydration-once: finalize perf mark, check API key, and show wizard if fresh state
  useEffect(() => {
    if (!_hasHydrated || didRecordHydration.current) return;

    let isCancelled = false;

    void (async () => {
      markEnd(PERF_MARKS.STORE_HYDRATION);
      performanceProfiler.end('app.hydration');
      markStart(PERF_MARKS.FIRST_INTERACTIVE);
      didRecordHydration.current = true;

      const configured = await hasApiKeyAsync();
      if (isCancelled) {
        return;
      }

      if (!configured) {
        addToast('Configure your Gemini API key in Settings to enable prompt generation.', 'info');
      }

      const urlParams = new URLSearchParams(window.location.search);
      const sharedState = urlParams.get('state');
      if (!sharedState && !promptIdea && !currentProjectId && hasSeenWelcome) {
        setNewProjectWizardOpen(true);
      }
    })();

    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentionally fires only once on hydration; later welcome dismissal handles the first-run wizard handoff
  }, [_hasHydrated]);

  // Initialize database service and ensure default project exists
  useEffect(() => {
    if (!_hasHydrated) return;

    let isCancelled = false;
    let deferredHandle: number | null = null;
    let onlineResumeHandler: (() => void) | null = null;

    const initializeDeferredServices = async () => {
      markStart(PERF_MARKS.DEFERRED_SERVICES);
      useStartupStore.getState().startDeferredServices();

      try {
        markStart(PERF_MARKS.PLUGIN_INIT);
        await runTrackedStartupStep('plugins', async () => {
          await pluginService.initialize();
          await registerInternalPlugins();
        });
        markEnd(PERF_MARKS.PLUGIN_INIT);

        // Initialize video generation service
        await runTrackedStartupStep('videoGeneration', () => {
          videoGenerationService.initialize();
        });

        await runTrackedStartupStep('generationQueueStore', async () => {
          await useGenerationQueueStore.getState().initialize();
        });

        // Register executors before hydration so recovered queued jobs can replay immediately
        await runTrackedStartupStep('batchPromptRegistration', () => {
          batchPromptService.register();
        });
        await runTrackedStartupStep('sceneExportRegistration', () => {
          sceneExportService.register();
        });

        // Initialize job queue and hydrate recovered jobs
        markStart(PERF_MARKS.JOB_QUEUE_HYDRATE);
        await runTrackedStartupStep('jobQueueHydration', async () => {
          await jobQueueService.hydrate();
          jobQueueService.setNetworkOnline(navigator.onLine);
        });
        markEnd(PERF_MARKS.JOB_QUEUE_HYDRATE);

        await runTrackedStartupStep('jobQueueStore', () => {
          useJobQueueStore.getState().initialize();
        });

        markStart(PERF_MARKS.QUEUE_REPLAY_SYNC);

        await runTrackedStartupStep('onlineResume', async () => {
          if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
            return;
          }

          onlineResumeHandler = () => {
            jobQueueService.setNetworkOnline(navigator.onLine);
            const controller = navigator.serviceWorker.controller;

            if (!navigator.onLine || !controller) {
              return;
            }

            void (async () => {
              const apiKey = await getStoredApiKeyAsync();
              if (!apiKey) {
                return;
              }

              markStart(PERF_MARKS.ONLINE_RESUME_HANDOFF);
              controller.postMessage({ type: 'RESUME_QUEUED_JOBS', apiKey });
              markEnd(PERF_MARKS.ONLINE_RESUME_HANDOFF);
            })();
          };

          window.addEventListener('online', onlineResumeHandler);
          window.addEventListener('offline', onlineResumeHandler);
          onlineResumeHandler();
        });

        markEnd(PERF_MARKS.QUEUE_REPLAY_SYNC);
        useStartupStore.getState().completeDeferredServices();
      } catch (error) {
        useStartupStore.getState().failDeferredServices(getErrorMessage(error));
        logger.error('Deferred service initialization failed:', error);
      } finally {
        markEnd(PERF_MARKS.DEFERRED_SERVICES);
        markEnd(PERF_MARKS.FIRST_INTERACTIVE);
      }
    };

    const initializeDatabase = async () => {
      markStart(PERF_MARKS.DB_INIT);
      useStartupStore.getState().reset();
      useStartupStore.getState().startCriticalBootstrap();

      try {
        await runTrackedStartupStep('database', () => databaseService.initialize());
        markStart(PERF_MARKS.SETTINGS_MIGRATION);
        await runTrackedStartupStep('settingsMigration', () =>
          settingsMigrationService.runMigrations(),
        );
        markEnd(PERF_MARKS.SETTINGS_MIGRATION);
        markStart(PERF_MARKS.PROJECT_STORE_INIT);
        await runTrackedStartupStep('projectStore', () => projectStore.initialize());
        markEnd(PERF_MARKS.PROJECT_STORE_INIT);
        markEnd(PERF_MARKS.DB_INIT);
        markEnd(PERF_MARKS.CRITICAL_BOOTSTRAP);
        useStartupStore.getState().completeCriticalBootstrap();

        deferredHandle = scheduleDeferredWork(() => {
          if (isCancelled) return;
          void initializeDeferredServices();
        });
      } catch (error) {
        useStartupStore.getState().failCriticalBootstrap(getErrorMessage(error));
        markEnd(PERF_MARKS.DB_INIT);
        markEnd(PERF_MARKS.CRITICAL_BOOTSTRAP);
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

      if (onlineResumeHandler) {
        window.removeEventListener('online', onlineResumeHandler);
        window.removeEventListener('offline', onlineResumeHandler);
      }
    };
  }, [_hasHydrated, projectStore, addToast]);
}
