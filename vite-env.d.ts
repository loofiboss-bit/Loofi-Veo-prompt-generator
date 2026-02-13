/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_VERSION?: string;
  // Add more env variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
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
}

declare global {
  interface Window {
    electron?: ElectronAPI;
  }
}

export {};
