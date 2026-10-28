/// <reference types="vite/client" />

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface ImportMetaEnv {
  readonly VITE_APP_VERSION?: string;
  // Add more env variables as needed
}

// Electron API types
interface ElectronAPI {
  listTimelineRenderJobs?: (
    projectId?: string,
  ) => Promise<import('./src/core/types').TimelineRenderJobV1[]>;
  retryTimelineRender?: (id: string) => Promise<import('./src/core/types').TimelineRenderJobV1>;
  getTimelineRenderPreview?: (
    id: string,
  ) => Promise<{ url: string; displayUrl?: string; contentHash: string }>;
  inspectTimelineRenderMedia?: (mediaId: string) => Promise<{
    available: boolean;
    durationSeconds?: number;
    streamTypes?: string[];
    mimeType?: string;
    sha256?: string;
    reason?: string;
  }>;
  createDesktopMediaProxy?: (
    mediaId: string,
  ) => Promise<{ key: string; url: string; sha256: string }>;
  detectTimelineSilence?: (input: {
    mediaId: string;
    noiseThresholdDb?: number;
    minDurationSeconds?: number;
  }) => Promise<Array<{ start: number; end: number; duration: number }>>;
  extractTimelineAudio?: (input: {
    mediaId: string;
    offsetSeconds: number;
    durationSeconds: number;
  }) => Promise<{
    mediaId: string;
    mediaSha256: string;
    sampleRate: 16000;
    channels: 1;
    durationSeconds: number;
    pcm: ArrayBuffer;
  }>;
  getCreatorAsrModelInfo?: () => Promise<{
    manifest: {
      modelId: string;
      revision: string;
      totalBytes: number;
      files: Array<{ path: string; size: number }>;
      source: string;
    };
    status: {
      installed: boolean;
      state: 'not-installed' | 'ready' | 'corrupt';
      revision: string;
      totalBytes: number;
    };
  }>;
  installCreatorAsrModel?: (request: {
    installId: string;
    modelId: string;
    revision: string;
    confirmedBytes: number;
    confirmed: true;
  }) => Promise<{
    installed: boolean;
    state: 'not-installed' | 'ready' | 'corrupt';
    revision: string;
    totalBytes: number;
  }>;
  cancelCreatorAsrModelInstall?: (installId: string) => Promise<boolean>;
  removeCreatorAsrModel?: () => Promise<{
    installed: boolean;
    state: 'not-installed' | 'ready' | 'corrupt';
    revision: string;
    totalBytes: number;
  }>;
  onCreatorAsrModelProgress?: (
    callback: (progress: {
      installId: string;
      status: 'downloading' | 'verifying' | 'ready';
      file: string | null;
      loadedBytes: number;
      totalBytes: number;
      complete?: boolean;
    }) => void,
  ) => () => void;
  getTimelineRenderCapabilities?: () => Promise<
    import('./src/core/types').TimelineRenderCapabilities
  >;
  startTimelineRender?: (
    plan: import('./src/core/types').TimelineRenderPlanV1,
  ) => Promise<import('./src/core/types').TimelineRenderJobV1>;
  getTimelineRenderJob?: (
    id: string,
  ) => Promise<import('./src/core/types').TimelineRenderJobV1 | null>;
  cancelTimelineRender?: (id: string) => Promise<boolean>;
  saveTimelineRender?: (input: {
    id: string;
    package: boolean;
  }) => Promise<{ saved: boolean; name?: string }>;
  onTimelineRenderUpdate?: (
    callback: (job: import('./src/core/types').TimelineRenderJobV1) => void,
  ) => () => void;
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
  approveProviderCost?: (input: {
    requestId?: string;
    provider: import('./src/core/models/catalog').ModelProvider;
    providerModelId: string;
    operation: import('./src/core/models/catalog').ModelOperation;
    prompt: string;
    inputs?: readonly { mimeType: string; data: string }[];
    interactionId?: string;
    systemInstruction?: string;
    config?: Record<string, unknown>;
    costApproval: {
      maximumChargeUsd: number;
      currency: 'USD';
      confidence: 'exact' | 'upper-bound';
      sourceUrl: string;
      verifiedDate: string;
      providerModelId: string;
      calculationInputs: import('./src/core/models/cost').ModelCostContext;
    };
  }) => Promise<string>;
  executeProvider?: (input: {
    requestId?: string;
    provider: import('./src/core/models/catalog').ModelProvider;
    providerModelId: string;
    operation: import('./src/core/models/catalog').ModelOperation;
    prompt: string;
    inputs?: readonly { mimeType: string; data: string }[];
    interactionId?: string;
    systemInstruction?: string;
    config?: Record<string, unknown>;
    approvalToken: string;
  }) => Promise<
    import('./src/core/providers/types').ProviderResponse & {
      failure?: import('./src/core/providers/types').ProviderFailureKind;
      message?: string;
    }
  >;
  cancelProviderRequest?: (requestId: string) => Promise<boolean>;
  executeInteraction?: (input: {
    requestId?: string;
    provider: 'gemini-api';
    providerModelId: string;
    operation: 'video' | 'video-edit';
    prompt: string;
    inputs?: readonly { mimeType: string; data: string }[];
    interactionId?: string;
    systemInstruction?: string;
    config?: Record<string, unknown>;
    approvalToken: string;
  }) => Promise<
    import('./src/core/providers/types').ProviderResponse & {
      failure?: import('./src/core/providers/types').ProviderFailureKind;
      message?: string;
    }
  >;
  submitPaidJob?: (
    task: import('./src/core/types').PaidJobTask,
  ) => Promise<import('./src/core/types').PaidJobTask>;
  listPaidJobs?: () => Promise<import('./src/core/types').PaidJobTask[]>;
  cancelPaidJob?: (id: string) => Promise<boolean>;
  recoverPaidJob?: (context: {
    id: string;
    runId: string;
    shotId: number;
    takeId: string;
  }) => Promise<boolean>;
  retryPaidJob?: (id: string) => Promise<boolean>;
  onPaidJobUpdate?: (callback: (job: import('./src/core/types').PaidJobTask) => void) => () => void;
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
  readDesktopMedia?: (key: string) => Promise<{
    bytes: ArrayBuffer;
    mimeType: string;
    localUrl: string;
    displayUrl?: string;
  } | null>;
  importDesktopMedia?: (input: {
    key: string;
    bytes: ArrayBuffer;
    mimeType: string;
    metadata?: { accepted?: boolean };
  }) => Promise<{
    key: string;
    path: string;
    localUrl: string;
    displayUrl?: string;
    sha256: string;
    sizeBytes: number;
    migratedFrom: 'indexeddb-v1';
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
