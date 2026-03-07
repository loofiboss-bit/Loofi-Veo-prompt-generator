import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage } from '@core/utils/storage';

export type PromptGenerationProvider = 'gemini' | 'ollama';

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

  // Plugin Registry
  registryUrl: string;

  // Prompt Generation Provider
  promptGenerationProvider: PromptGenerationProvider;

  // Local LLM (Privacy Mode)
  localLlmEnabled: boolean;
  localLlmEndpoint: string;
  localLlmModel: string;

  // Actions
  updateSettings: (settings: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

type PersistedAppSettings = Omit<AppSettings, 'updateSettings' | 'resetSettings'>;

const DEFAULT_SETTINGS: PersistedAppSettings = {
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
  registryUrl: '',
  promptGenerationProvider: 'gemini',
  localLlmEnabled: false,
  localLlmEndpoint: 'http://localhost:11434',
  localLlmModel: 'llama3',
};

function migrateSettings(persistedState: unknown, version: number): PersistedAppSettings {
  const state = (persistedState ?? {}) as Partial<PersistedAppSettings>;

  if (version < 2) {
    return {
      ...DEFAULT_SETTINGS,
      ...state,
      promptGenerationProvider:
        state.promptGenerationProvider ?? (state.localLlmEnabled ? 'ollama' : 'gemini'),
    };
  }

  return {
    ...DEFAULT_SETTINGS,
    ...state,
  };
}

export const useSettingsStore = create<AppSettings>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,

      updateSettings: (settings) => set((state) => ({ ...state, ...settings })),

      resetSettings: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: 'veo-studio-settings-v1',
      version: 2,
      migrate: migrateSettings,
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
