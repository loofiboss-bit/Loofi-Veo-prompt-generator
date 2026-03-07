/**
 * useSettingsStore Tests
 *
 * Verifies settings store behavior: default values, partial updates,
 * reset, and persistence partialize (apiKey excluded).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock idb-keyval before any store imports
vi.mock('idb-keyval', () => ({
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
  createStore: vi.fn(),
  update: vi.fn(),
}));

import { useSettingsStore } from './useSettingsStore';

// ─── Default values reference ───────────────────────────────────────

const DEFAULTS = {
  autoSave: true,
  autoSaveInterval: 30000,
  apiKey: '',
  apiEndpoint: 'https://generativelanguage.googleapis.com',
  showTooltips: true,
  showTutorial: true,
  compactMode: false,
  enableHardwareAcceleration: true,
  maxConcurrentGenerations: 3,
  defaultExportFormat: 'mp4' as const,
  defaultExportQuality: 'high' as const,
  enableAnalytics: false,
  enableCrashReporting: true,
  enableExperimentalFeatures: false,
  registryUrl: '',
  promptGenerationProvider: 'gemini' as const,
  localLlmEnabled: false,
  localLlmEndpoint: 'http://localhost:11434',
  localLlmModel: 'llama3',
};

// ─── Tests ──────────────────────────────────────────────────────────

describe('useSettingsStore', () => {
  beforeEach(() => {
    useSettingsStore.getState().resetSettings();
  });

  // ── Default values ────────────────────────────────────────────

  describe('default values', () => {
    it('should have correct initial defaults', () => {
      const state = useSettingsStore.getState();

      expect(state.autoSave).toBe(DEFAULTS.autoSave);
      expect(state.autoSaveInterval).toBe(DEFAULTS.autoSaveInterval);
      expect(state.apiKey).toBe('');
      expect(state.apiEndpoint).toBe(DEFAULTS.apiEndpoint);
      expect(state.showTooltips).toBe(true);
      expect(state.showTutorial).toBe(true);
      expect(state.compactMode).toBe(false);
      expect(state.enableHardwareAcceleration).toBe(true);
      expect(state.maxConcurrentGenerations).toBe(3);
      expect(state.defaultExportFormat).toBe('mp4');
      expect(state.defaultExportQuality).toBe('high');
      expect(state.enableAnalytics).toBe(false);
      expect(state.enableCrashReporting).toBe(true);
      expect(state.enableExperimentalFeatures).toBe(false);
      expect(state.registryUrl).toBe('');
      expect(state.promptGenerationProvider).toBe('gemini');
      expect(state.localLlmEnabled).toBe(false);
      expect(state.localLlmEndpoint).toBe('http://localhost:11434');
      expect(state.localLlmModel).toBe('llama3');
    });

    it('should have action functions', () => {
      const state = useSettingsStore.getState();
      expect(typeof state.updateSettings).toBe('function');
      expect(typeof state.resetSettings).toBe('function');
    });
  });

  // ── updateSettings ────────────────────────────────────────────

  describe('updateSettings', () => {
    it('should partially update settings', () => {
      useSettingsStore.getState().updateSettings({ autoSave: false });

      const state = useSettingsStore.getState();
      expect(state.autoSave).toBe(false);
      // Other settings unchanged
      expect(state.autoSaveInterval).toBe(30000);
      expect(state.showTooltips).toBe(true);
    });

    it('should update multiple settings at once', () => {
      useSettingsStore.getState().updateSettings({
        compactMode: true,
        defaultExportFormat: 'webm',
        maxConcurrentGenerations: 5,
        promptGenerationProvider: 'ollama',
      });

      const state = useSettingsStore.getState();
      expect(state.compactMode).toBe(true);
      expect(state.defaultExportFormat).toBe('webm');
      expect(state.maxConcurrentGenerations).toBe(5);
      expect(state.promptGenerationProvider).toBe('ollama');
    });

    it('should update apiKey', () => {
      useSettingsStore.getState().updateSettings({ apiKey: 'my-secret-key' });

      expect(useSettingsStore.getState().apiKey).toBe('my-secret-key');
    });

    it('should update registryUrl', () => {
      useSettingsStore.getState().updateSettings({
        registryUrl: 'https://registry.example.com',
      });

      expect(useSettingsStore.getState().registryUrl).toBe('https://registry.example.com');
    });

    it('should update Ollama provider settings', () => {
      useSettingsStore.getState().updateSettings({
        promptGenerationProvider: 'ollama',
        localLlmEnabled: true,
        localLlmEndpoint: 'http://127.0.0.1:11434',
        localLlmModel: 'qwen2.5-coder:14b',
      });

      const state = useSettingsStore.getState();
      expect(state.promptGenerationProvider).toBe('ollama');
      expect(state.localLlmEnabled).toBe(true);
      expect(state.localLlmEndpoint).toBe('http://127.0.0.1:11434');
      expect(state.localLlmModel).toBe('qwen2.5-coder:14b');
    });
  });

  // ── resetSettings ─────────────────────────────────────────────

  describe('resetSettings', () => {
    it('should reset all settings to defaults', () => {
      useSettingsStore.getState().updateSettings({
        autoSave: false,
        compactMode: true,
        apiKey: 'secret',
        defaultExportFormat: 'webm',
        enableAnalytics: true,
        promptGenerationProvider: 'ollama',
        localLlmEnabled: true,
        localLlmEndpoint: 'http://127.0.0.1:11434',
        localLlmModel: 'mistral',
      });

      useSettingsStore.getState().resetSettings();

      const state = useSettingsStore.getState();
      expect(state.autoSave).toBe(DEFAULTS.autoSave);
      expect(state.compactMode).toBe(DEFAULTS.compactMode);
      expect(state.apiKey).toBe('');
      expect(state.defaultExportFormat).toBe(DEFAULTS.defaultExportFormat);
      expect(state.enableAnalytics).toBe(DEFAULTS.enableAnalytics);
      expect(state.promptGenerationProvider).toBe(DEFAULTS.promptGenerationProvider);
      expect(state.localLlmEnabled).toBe(DEFAULTS.localLlmEnabled);
      expect(state.localLlmEndpoint).toBe(DEFAULTS.localLlmEndpoint);
      expect(state.localLlmModel).toBe(DEFAULTS.localLlmModel);
    });
  });

  // ── Persistence (partialize) ──────────────────────────────────

  describe('partialize', () => {
    it('should exclude apiKey from persisted state', () => {
      // Access the persist options from the store
      const persistOptions = (
        useSettingsStore as unknown as {
          persist: {
            getOptions: () => {
              partialize: (s: Record<string, unknown>) => Record<string, unknown>;
            };
          };
        }
      ).persist.getOptions();

      const fullState = {
        ...DEFAULTS,
        apiKey: 'my-secret-key',
        updateSettings: () => {},
        resetSettings: () => {},
      };

      const persisted = persistOptions.partialize(fullState);

      expect(persisted).not.toHaveProperty('apiKey');
      expect(persisted).not.toHaveProperty('updateSettings');
      expect(persisted).not.toHaveProperty('resetSettings');
      // Normal fields should be included
      expect(persisted).toHaveProperty('autoSave');
      expect(persisted).toHaveProperty('compactMode');
      expect(persisted).toHaveProperty('enableAnalytics');
      expect(persisted).toHaveProperty('promptGenerationProvider', 'gemini');
      expect(persisted).toHaveProperty('localLlmEndpoint', 'http://localhost:11434');
    });
  });

  // ── Store name ────────────────────────────────────────────────

  describe('persistence config', () => {
    it('should use correct storage key', () => {
      const persistOptions = (
        useSettingsStore as unknown as {
          persist: { getOptions: () => { migrate: Function; name: string; version: number } };
        }
      ).persist.getOptions();

      expect(persistOptions.name).toBe('veo-studio-settings-v1');
      expect(persistOptions.version).toBe(2);
    });

    it('should migrate legacy local LLM settings to the Ollama provider', () => {
      const persistOptions = (
        useSettingsStore as unknown as {
          persist: { getOptions: () => { migrate: Function; name: string; version: number } };
        }
      ).persist.getOptions();

      const migrated = persistOptions.migrate(
        {
          ...DEFAULTS,
          promptGenerationProvider: undefined,
          localLlmEnabled: true,
        },
        1,
      ) as Record<string, unknown>;

      expect(migrated.promptGenerationProvider).toBe('ollama');
    });
  });
});
