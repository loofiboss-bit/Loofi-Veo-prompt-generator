import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage } from '@core/utils/storage';

export interface AppSettings {
  // General Settings
  autoSave: boolean;
  autoSaveInterval: number; // in milliseconds

  // API Settings
  apiKey: string;
  apiEndpoint: string;

  // UI Preferences
  showTooltips: boolean;
  showTutorial: boolean;
  compactMode: boolean;

  // Performance Settings
  enableHardwareAcceleration: boolean;
  maxConcurrentGenerations: number;

  // Export Settings
  defaultExportFormat: 'mp4' | 'webm' | 'mov';
  defaultExportQuality: 'low' | 'medium' | 'high' | 'ultra';

  // Privacy Settings
  enableAnalytics: boolean;
  enableCrashReporting: boolean;

  // Experimental Features
  enableExperimentalFeatures: boolean;

  // Actions
  updateSettings: (settings: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

const DEFAULT_SETTINGS: Omit<AppSettings, 'updateSettings' | 'resetSettings'> = {
  autoSave: true,
  autoSaveInterval: 30000, // 30 seconds
  apiKey: '',
  apiEndpoint: 'https://generativelanguage.googleapis.com',
  showTooltips: true,
  showTutorial: true,
  compactMode: false,
  enableHardwareAcceleration: true,
  maxConcurrentGenerations: 3,
  defaultExportFormat: 'mp4',
  defaultExportQuality: 'high',
  enableAnalytics: false,
  enableCrashReporting: true,
  enableExperimentalFeatures: false,
};

export const useSettingsStore = create<AppSettings>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,

      updateSettings: (settings) => set((state) => ({ ...state, ...settings })),

      resetSettings: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: 'veo-studio-settings-v1',
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => {
        // Exclude apiKey from persistence (security: avoid storing secrets
        // in plaintext IndexedDB). Also exclude action functions.
        const { apiKey: _apiKey, updateSettings: _u, resetSettings: _r, ...persisted } = state;
        return persisted;
      },
    },
  ),
);
