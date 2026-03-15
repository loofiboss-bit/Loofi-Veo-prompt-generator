import { create } from 'zustand';

export type StartupService =
  | 'database'
  | 'settingsMigration'
  | 'projectStore'
  | 'plugins'
  | 'videoGeneration'
  | 'generationQueueStore'
  | 'batchPromptRegistration'
  | 'sceneExportRegistration'
  | 'jobQueueHydration'
  | 'jobQueueStore'
  | 'onlineResume';

export type StartupServicePhase = 'idle' | 'running' | 'ready' | 'degraded';

export type StartupPhase =
  | 'idle'
  | 'critical-bootstrap'
  | 'critical-ready'
  | 'critical-degraded'
  | 'deferred-services'
  | 'ready'
  | 'degraded';

export interface StartupServiceState {
  phase: StartupServicePhase;
  error: string | null;
}

export interface StartupState {
  phase: StartupPhase;
  criticalBootstrapComplete: boolean;
  deferredServicesComplete: boolean;
  criticalBootstrapError: string | null;
  deferredServicesError: string | null;
  services: Record<StartupService, StartupServiceState>;
  reset: () => void;
  startCriticalBootstrap: () => void;
  completeCriticalBootstrap: () => void;
  failCriticalBootstrap: (error: string) => void;
  startDeferredServices: () => void;
  completeDeferredServices: () => void;
  failDeferredServices: (error: string) => void;
  markServiceRunning: (service: StartupService) => void;
  markServiceReady: (service: StartupService) => void;
  markServiceDegraded: (service: StartupService, error: string) => void;
}

function createInitialServiceState(): StartupServiceState {
  return {
    phase: 'idle',
    error: null,
  };
}

function createInitialServices(): Record<StartupService, StartupServiceState> {
  return {
    database: createInitialServiceState(),
    settingsMigration: createInitialServiceState(),
    projectStore: createInitialServiceState(),
    plugins: createInitialServiceState(),
    videoGeneration: createInitialServiceState(),
    generationQueueStore: createInitialServiceState(),
    batchPromptRegistration: createInitialServiceState(),
    sceneExportRegistration: createInitialServiceState(),
    jobQueueHydration: createInitialServiceState(),
    jobQueueStore: createInitialServiceState(),
    onlineResume: createInitialServiceState(),
  };
}

function createInitialState() {
  return {
    phase: 'idle' as StartupPhase,
    criticalBootstrapComplete: false,
    deferredServicesComplete: false,
    criticalBootstrapError: null,
    deferredServicesError: null,
    services: createInitialServices(),
  };
}

function updateServiceState(
  services: Record<StartupService, StartupServiceState>,
  service: StartupService,
  phase: StartupServicePhase,
  error: string | null,
): Record<StartupService, StartupServiceState> {
  return {
    ...services,
    [service]: {
      phase,
      error,
    },
  };
}

export const useStartupStore = create<StartupState>()((set) => ({
  ...createInitialState(),

  reset: () => set(createInitialState()),

  startCriticalBootstrap: () =>
    set({
      phase: 'critical-bootstrap',
      criticalBootstrapComplete: false,
      criticalBootstrapError: null,
    }),

  completeCriticalBootstrap: () =>
    set({
      phase: 'critical-ready',
      criticalBootstrapComplete: true,
      criticalBootstrapError: null,
    }),

  failCriticalBootstrap: (error) =>
    set({
      phase: 'critical-degraded',
      criticalBootstrapComplete: true,
      criticalBootstrapError: error,
    }),

  startDeferredServices: () =>
    set((state) => ({
      ...state,
      phase: 'deferred-services',
      deferredServicesComplete: false,
      deferredServicesError: null,
    })),

  completeDeferredServices: () =>
    set((state) => ({
      ...state,
      phase: state.criticalBootstrapError ? 'degraded' : 'ready',
      deferredServicesComplete: true,
      deferredServicesError: null,
    })),

  failDeferredServices: (error) =>
    set((state) => ({
      ...state,
      phase: 'degraded',
      deferredServicesComplete: true,
      deferredServicesError: error,
    })),

  markServiceRunning: (service) =>
    set((state) => ({
      ...state,
      services: updateServiceState(state.services, service, 'running', null),
    })),

  markServiceReady: (service) =>
    set((state) => ({
      ...state,
      services: updateServiceState(state.services, service, 'ready', null),
    })),

  markServiceDegraded: (service, error) =>
    set((state) => ({
      ...state,
      services: updateServiceState(state.services, service, 'degraded', error),
    })),
}));
