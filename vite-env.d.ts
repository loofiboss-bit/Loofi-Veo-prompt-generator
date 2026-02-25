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
}

declare global {
  interface Window {
    electron?: ElectronAPI;
  }
}

export {};
