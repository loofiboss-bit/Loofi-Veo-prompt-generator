/// <reference types="vite/client" />

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface ImportMetaEnv {
  readonly VITE_APP_VERSION?: string;
  // Add more env variables as needed
}

// Electron API types
interface ElectronAPI {
  platform: string;
  arch: string;
  downloadUpdate: (url: string) => Promise<string>;
  installUpdate: (filePath?: string) => Promise<void>;
  getPlatformInfo: () => Promise<{ platform: string; arch: string; version: string }>;
  getSafeModeStatus: () => Promise<{
    enabled: boolean;
    reason: 'manual' | 'crash-loop' | 'none';
    crashCount: number;
  }>;
  resetSafeMode: () => Promise<boolean>;
  onDownloadProgress: (callback: (progress: number) => void) => void;
  logError: (entryOrBatch: unknown) => Promise<void>;
  logErrorFireAndForget: (entryOrBatch: unknown) => void;
  logErrorSync: (entryOrBatch: unknown) => boolean;
  getNleStatus: (app?: 'resolve' | 'premiere') => Promise<{
    app: 'resolve' | 'premiere';
    available: boolean;
    running: boolean;
    executablePath?: string;
  }>;
  directExportToNle: (request: {
    app: 'resolve' | 'premiere';
    payload: Record<string, unknown>;
  }) => Promise<{
    success: boolean;
    message: string;
    fallbackSuggested?: boolean;
    manifestPath?: string;
  }>;
  getSecureItem?: (key: string) => Promise<string | null>;
  setSecureItem?: (key: string, value: string) => Promise<boolean>;
  deleteSecureItem?: (key: string) => Promise<void>;
  testProviderConnection?: (input: {
    profile: import('./src/core/providers/types').ProviderConnectionProfile;
    providerModelId?: string;
  }) => Promise<import('./src/core/providers/types').ProviderConnectionResult>;
  executeProvider?: (input: {
    provider: import('./src/core/models/catalog').ModelProvider;
    providerModelId: string;
    operation: import('./src/core/models/catalog').ModelOperation;
    prompt: string;
    inputs?: readonly { mimeType: string; data: string }[];
    interactionId?: string;
  }) => Promise<
    import('./src/core/providers/types').ProviderResponse & {
      failure?: import('./src/core/providers/types').ProviderFailureKind;
      message?: string;
    }
  >;
  submitPaidJob?: (
    task: import('./src/core/types').GenerationTask,
  ) => Promise<import('./src/core/types').GenerationTask>;
  listPaidJobs?: () => Promise<import('./src/core/types').GenerationTask[]>;
  cancelPaidJob?: (id: string) => Promise<boolean>;
  onPaidJobUpdate?: (
    callback: (job: import('./src/core/types').GenerationTask) => void,
  ) => () => void;
}

declare global {
  interface Window {
    electron?: ElectronAPI;
  }
}

export {};
