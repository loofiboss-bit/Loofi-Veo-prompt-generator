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
    onDownloadProgress: (callback: (progress: number) => void) => void;
}

declare global {
    interface Window {
        electron?: ElectronAPI;
    }
}

export { };
