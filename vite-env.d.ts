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
  downloadUpdate: (input: { url: string; checksumUrl: string }) => Promise<string>;
  installUpdate: () => Promise<void>;
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
  hasSecureItem?: (key: string) => Promise<boolean>;
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
  executeInteraction?: (input: {
    provider: 'gemini-api';
    providerModelId: string;
    operation: 'video' | 'video-edit';
    prompt: string;
    inputs?: readonly { mimeType: string; data: string }[];
    interactionId?: string;
  }) => Promise<
    import('./src/core/providers/types').ProviderResponse & {
      failure?: import('./src/core/providers/types').ProviderFailureKind;
      message?: string;
    }
  >;
  generateGeminiContent?: (input: {
    providerModelId: string;
    operation?: 'plan' | 'review' | 'image' | 'tts';
    prompt: string;
    inputs?: readonly { mimeType: string; data: string }[];
    systemInstruction?: string;
    config?: Record<string, unknown>;
  }) => Promise<{
    text?: string;
    media?: readonly { mimeType: string; data: string }[];
    rawModelId: string;
    failure?: import('./src/core/providers/types').ProviderFailureKind;
    message?: string;
  }>;
  submitPaidJob?: (
    task: import('./src/core/types').GenerationTask,
  ) => Promise<import('./src/core/types').GenerationTask>;
  listPaidJobs?: () => Promise<import('./src/core/types').GenerationTask[]>;
  cancelPaidJob?: (id: string) => Promise<boolean>;
  onPaidJobUpdate?: (
    callback: (job: import('./src/core/types').GenerationTask) => void,
  ) => () => void;
  cacheDesktopMedia?: (input: {
    key: string;
    url: string;
    metadata?: {
      accepted?: boolean;
      dimensions?: { width: number; height: number };
      durationSeconds?: number;
      modelId?: string;
      promptRevision?: number;
      operationId?: string;
      sourceAssetId?: string;
    };
  }) => Promise<{
    schemaVersion: 1;
    key: string;
    path: string;
    localUrl: string;
    sha256: string;
    sizeBytes: number;
    mimeType: string;
    providerUrl: string;
    cachedAt: number;
    accepted: boolean;
    dimensions?: { width: number; height: number };
    durationSeconds?: number;
    modelId?: string;
    promptRevision?: number;
    operationId?: string;
    sourceAssetId?: string;
  }>;
  getDesktopMediaUsage?: () => Promise<{ bytes: number; files: number }>;
  getDesktopMediaHealth?: () => Promise<
    Array<{
      key: string;
      path: string;
      accepted: boolean;
      status: 'healthy' | 'missing' | 'corrupt';
    }>
  >;
  relinkDesktopMedia?: (input: { key: string; candidatePath: string }) => Promise<{
    key: string;
    path: string;
    localUrl: string;
    sha256: string;
  }>;
  setDesktopMediaAccepted?: (input: { key: string; accepted: boolean }) => Promise<{
    key: string;
    accepted: boolean;
  }>;
  previewDesktopMediaCleanup?: (input?: {
    referencedKeys?: string[];
    retentionDays?: number;
  }) => Promise<{
    candidates: Array<{ key: string; path: string; sizeBytes: number; reason: string }>;
    orphanPaths: string[];
    protectedAccepted: string[];
    reclaimableBytes: number;
  }>;
  saveProjectBackup?: (input: {
    projectId: string;
    snapshot: import('./src/core/types').Project;
  }) => Promise<{ id: string; projectId: string; createdAt: number; sha256: string }>;
  listProjectBackups?: (
    projectId: string,
  ) => Promise<
    Array<{ id: string; projectId: string; createdAt: number; sha256: string; corrupt?: boolean }>
  >;
  restoreProjectBackup?: (input: { projectId: string; id: string }) => Promise<{
    snapshot: import('./src/core/types').Project;
    verified: true;
    sha256: string;
    createdAt: number;
  }>;
  selectProjectFolder?: () => Promise<string | null>;
  getDesktopDiagnostics?: () => Promise<{
    app: { version: string; name: string; electron: string };
    platform: { platform: string; arch: string; release: string };
    safeMode: { enabled: boolean; reason: string; crashCount: number };
    provider: { configured: boolean; credentialsIncluded: false };
    storage: { bytes: number; files: number };
    jobs: Array<Record<string, unknown>>;
    logs: string[];
  }>;
  exportSupportBundle?: () => Promise<string | null>;
}

declare global {
  interface Window {
    electron?: ElectronAPI;
  }
}

export {};
