import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock idb-keyval
const mockStore = new Map<string, unknown>();
vi.mock('idb-keyval', () => ({
  get: vi.fn((key: string) => Promise.resolve(mockStore.get(key))),
  set: vi.fn((key: string, value: unknown) => {
    mockStore.set(key, value);
    return Promise.resolve();
  }),
  del: vi.fn((key: string) => {
    mockStore.delete(key);
    return Promise.resolve();
  }),
  keys: vi.fn(() => Promise.resolve([...mockStore.keys()])),
  createStore: vi.fn(),
}));

// Mock loggerService
vi.mock('./loggerService', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock workspaceService for getWorkspaceSettings / getCurrentWorkspaceId
vi.mock('./workspaceService', () => ({
  workspaceService: {
    getCurrentWorkspaceId: vi.fn().mockResolvedValue('default'),
    getWorkspaceSettings: vi.fn().mockResolvedValue({}),
  },
}));

// Mock the Zustand store
vi.mock('@core/store/useSettingsStore', () => ({
  useSettingsStore: {
    getState: vi.fn(() => ({
      autoSave: true,
      autoSaveInterval: 30000,
      apiKey: 'test-key',
      apiEndpoint: 'https://api.example.com',
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
      updateSettings: vi.fn(),
      resetSettings: vi.fn(),
    })),
  },
}));

import { settingsResolutionService } from './settingsResolutionService';
import { workspaceService } from './workspaceService';

beforeEach(() => {
  mockStore.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SettingsResolutionService', () => {
  // ─── Effective Settings ──────────────────────────────────────────

  describe('resolveEffectiveSettings', () => {
    it('should return global settings when no workspace overrides exist', async () => {
      const settings = await settingsResolutionService.resolveEffectiveSettings();
      expect(settings.autoSave).toBe(true);
      expect(settings.autoSaveInterval).toBe(30000);
      expect(settings.defaultExportFormat).toBe('mp4');
    });

    it('should apply workspace overrides for overridable keys', async () => {
      vi.mocked(workspaceService.getWorkspaceSettings).mockResolvedValueOnce({
        autoSave: false,
        compactMode: true,
        defaultExportFormat: 'webm',
      });

      const settings = await settingsResolutionService.resolveEffectiveSettings();
      expect(settings.autoSave).toBe(false);
      expect(settings.compactMode).toBe(true);
      expect(settings.defaultExportFormat).toBe('webm');
    });

    it('should not override global-only keys even if workspace has them', async () => {
      vi.mocked(workspaceService.getWorkspaceSettings).mockResolvedValueOnce({
        autoSave: false,
      });

      const settings = await settingsResolutionService.resolveEffectiveSettings();
      // apiKey should remain from global
      expect(settings.apiKey).toBe('test-key');
      expect(settings.apiEndpoint).toBe('https://api.example.com');
    });

    it('should handle null workspace gracefully', async () => {
      vi.mocked(workspaceService.getCurrentWorkspaceId).mockResolvedValueOnce(null);

      const settings = await settingsResolutionService.resolveEffectiveSettings();
      expect(settings.autoSave).toBe(true); // defaults
    });
  });

  // ─── Single Setting Resolution ────────────────────────────────────

  describe('resolveSetting', () => {
    it('should resolve a global-only setting with source "global"', async () => {
      const result = await settingsResolutionService.resolveSetting('apiKey');
      expect(result.value).toBe('test-key');
      expect(result.source).toBe('global');
    });

    it('should resolve an overridable setting from workspace', async () => {
      vi.mocked(workspaceService.getWorkspaceSettings).mockResolvedValueOnce({
        compactMode: true,
      });

      const result = await settingsResolutionService.resolveSetting('compactMode');
      expect(result.value).toBe(true);
      expect(result.source).toBe('workspace');
    });

    it('should fall back to global when workspace has no override', async () => {
      vi.mocked(workspaceService.getWorkspaceSettings).mockResolvedValueOnce({});

      const result = await settingsResolutionService.resolveSetting('autoSave');
      expect(result.value).toBe(true);
      expect(result.source).toBe('global');
    });
  });

  // ─── Batch Resolution ─────────────────────────────────────────────

  describe('resolveSettings', () => {
    it('should resolve multiple settings at once', async () => {
      vi.mocked(workspaceService.getWorkspaceSettings).mockResolvedValueOnce({
        autoSave: false,
      });

      const results = await settingsResolutionService.resolveSettings([
        'autoSave',
        'apiKey',
        'compactMode',
      ]);

      expect(results.autoSave.value).toBe(false);
      expect(results.autoSave.source).toBe('workspace');
      expect(results.apiKey.value).toBe('test-key');
      expect(results.apiKey.source).toBe('global');
      expect(results.compactMode.value).toBe(false);
      expect(results.compactMode.source).toBe('global');
    });
  });

  // ─── Key Classification ────────────────────────────────────────────

  describe('isOverridable / isGlobalOnly', () => {
    it('should identify overridable keys', () => {
      expect(settingsResolutionService.isOverridable('autoSave')).toBe(true);
      expect(settingsResolutionService.isOverridable('compactMode')).toBe(true);
      expect(settingsResolutionService.isOverridable('defaultExportFormat')).toBe(true);
    });

    it('should identify global-only keys', () => {
      expect(settingsResolutionService.isGlobalOnly('apiKey')).toBe(true);
      expect(settingsResolutionService.isGlobalOnly('apiEndpoint')).toBe(true);
      expect(settingsResolutionService.isGlobalOnly('enableAnalytics')).toBe(true);
    });

    it('should not cross-report keys', () => {
      expect(settingsResolutionService.isOverridable('apiKey')).toBe(false);
      expect(settingsResolutionService.isGlobalOnly('autoSave')).toBe(false);
    });
  });

  describe('getOverridableKeys', () => {
    it('should return all overridable keys', () => {
      const keys = settingsResolutionService.getOverridableKeys();
      expect(keys).toContain('autoSave');
      expect(keys).toContain('compactMode');
      expect(keys).toContain('defaultExportFormat');
      expect(keys).not.toContain('apiKey');
    });
  });
});
