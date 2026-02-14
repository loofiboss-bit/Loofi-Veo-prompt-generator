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
      });

      const state = useSettingsStore.getState();
      expect(state.compactMode).toBe(true);
      expect(state.defaultExportFormat).toBe('webm');
      expect(state.maxConcurrentGenerations).toBe(5);
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
      });

      useSettingsStore.getState().resetSettings();

      const state = useSettingsStore.getState();
      expect(state.autoSave).toBe(DEFAULTS.autoSave);
      expect(state.compactMode).toBe(DEFAULTS.compactMode);
      expect(state.apiKey).toBe('');
      expect(state.defaultExportFormat).toBe(DEFAULTS.defaultExportFormat);
      expect(state.enableAnalytics).toBe(DEFAULTS.enableAnalytics);
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
    });
  });

  // ── Store name ────────────────────────────────────────────────

  describe('persistence config', () => {
    it('should use correct storage key', () => {
      const persistOptions = (
        useSettingsStore as unknown as { persist: { getOptions: () => { name: string } } }
      ).persist.getOptions();

      expect(persistOptions.name).toBe('veo-studio-settings-v1');
    });
  });
});
