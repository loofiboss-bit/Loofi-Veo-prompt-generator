/**
 * Settings Resolution Service
 * Resolves effective settings by merging global → workspace → project layers.
 * v1.9.0 - Platform Foundations (Sprint 2)
 *
 * Resolution order (highest precedence last):
 *   1. Defaults (hard-coded in useSettingsStore)
 *   2. Global settings (from useSettingsStore persisted state)
 *   3. Workspace settings overrides (sparse object from current workspace)
 *   4. Project settings overrides (sparse object from current project — future)
 *
 * Global-only settings (apiKey, apiEndpoint, enableAnalytics, enableCrashReporting)
 * are never overridden by workspace-level values.
 */

import { logger } from './loggerService';
import { workspaceService } from './workspaceService';
import { useSettingsStore, type AppSettings } from '@core/store/useSettingsStore';
import type {
  WorkspaceSettingsOverrides,
  OverridableSettingKeys,
  GlobalOnlySettingKeys,
  ResolvedSetting,
  SettingSource,
} from '@core/types/workspace';

// ─── Derived Types ──────────────────────────────────────────────────

/** AppSettings without action functions — pure data shape. */
type SettingsData = Omit<AppSettings, 'updateSettings' | 'resetSettings'>;

/** Valid setting keys (excluding actions). */
type SettingKey = keyof SettingsData;

// ─── Constants ──────────────────────────────────────────────────────

/**
 * Settings keys that are only configurable at the global level.
 */
const GLOBAL_ONLY_KEYS: ReadonlySet<string> = new Set<GlobalOnlySettingKeys>([
  'apiKey',
  'apiEndpoint',
  'enableAnalytics',
  'enableCrashReporting',
]);

/**
 * Settings keys that can be overridden at the workspace level.
 */
const OVERRIDABLE_KEYS: ReadonlySet<string> = new Set<OverridableSettingKeys>([
  'autoSave',
  'autoSaveInterval',
  'defaultExportFormat',
  'defaultExportQuality',
  'compactMode',
  'enableExperimentalFeatures',
]);

// ─── Service ────────────────────────────────────────────────────────

class SettingsResolutionService {
  private static instance: SettingsResolutionService;

  static getInstance(): SettingsResolutionService {
    if (!SettingsResolutionService.instance) {
      SettingsResolutionService.instance = new SettingsResolutionService();
    }
    return SettingsResolutionService.instance;
  }

  // ─── Full Resolution ─────────────────────────────────────────────

  /**
   * Resolve effective settings by merging global + workspace overrides.
   * Returns a full AppSettings-shaped object with resolved values.
   */
  async resolveEffectiveSettings(): Promise<SettingsData> {
    const global = this.getGlobalSettings();
    const wsOverrides = await this.getWorkspaceOverrides();

    // Start with global settings
    const effective = { ...global };

    // Apply workspace overrides for overridable keys only
    if (wsOverrides) {
      for (const key of OVERRIDABLE_KEYS) {
        const overrideValue = wsOverrides[key as OverridableSettingKeys];
        if (overrideValue !== undefined) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (effective as Record<string, any>)[key] = overrideValue;
        }
      }
    }

    return effective;
  }

  // ─── Single Setting Resolution ────────────────────────────────────

  /**
   * Resolve a single setting with provenance information.
   */
  async resolveSetting<K extends SettingKey>(key: K): Promise<ResolvedSetting<SettingsData[K]>> {
    const globalValue = this.getGlobalSettings()[key];

    // Global-only keys — never overridden
    if (GLOBAL_ONLY_KEYS.has(key as string)) {
      return {
        value: globalValue,
        source: 'global' as SettingSource,
      };
    }

    // Check workspace override
    if (OVERRIDABLE_KEYS.has(key as string)) {
      const wsOverrides = await this.getWorkspaceOverrides();
      if (wsOverrides) {
        const overrideValue = wsOverrides[key as unknown as OverridableSettingKeys];
        if (overrideValue !== undefined) {
          return {
            value: overrideValue as unknown as SettingsData[K],
            source: 'workspace' as SettingSource,
          };
        }
      }
    }

    return {
      value: globalValue,
      source: 'global' as SettingSource,
    };
  }

  // ─── Batch Resolution ─────────────────────────────────────────────

  /**
   * Resolve multiple settings at once with provenance for each.
   */
  async resolveSettings<K extends SettingKey>(
    settingKeys: K[],
  ): Promise<Record<K, ResolvedSetting<SettingsData[K]>>> {
    const result = {} as Record<K, ResolvedSetting<SettingsData[K]>>;
    const wsOverrides = await this.getWorkspaceOverrides();
    const global = this.getGlobalSettings();

    for (const key of settingKeys) {
      // Global-only: always from global
      if (GLOBAL_ONLY_KEYS.has(key as string)) {
        result[key] = { value: global[key], source: 'global' };
        continue;
      }

      // Check workspace override
      if (OVERRIDABLE_KEYS.has(key as string) && wsOverrides) {
        const overrideValue = wsOverrides[key as unknown as OverridableSettingKeys];
        if (overrideValue !== undefined) {
          result[key] = {
            value: overrideValue as unknown as SettingsData[K],
            source: 'workspace',
          };
          continue;
        }
      }

      result[key] = { value: global[key], source: 'global' };
    }

    return result;
  }

  // ─── Helpers ──────────────────────────────────────────────────────

  /**
   * Check whether a setting key is overridable at the workspace level.
   */
  isOverridable(key: string): boolean {
    return OVERRIDABLE_KEYS.has(key);
  }

  /**
   * Check whether a setting key is global-only.
   */
  isGlobalOnly(key: string): boolean {
    return GLOBAL_ONLY_KEYS.has(key);
  }

  /**
   * Get the list of overridable setting keys.
   */
  getOverridableKeys(): OverridableSettingKeys[] {
    return [...OVERRIDABLE_KEYS] as OverridableSettingKeys[];
  }

  // ─── Internal ─────────────────────────────────────────────────────

  /**
   * Get current global settings from the Zustand store.
   */
  private getGlobalSettings(): SettingsData {
    const state = useSettingsStore.getState();
    const { updateSettings: _, resetSettings: __, ...settings } = state;
    return settings;
  }

  /**
   * Get the workspace overrides for the current workspace.
   * Returns null if no workspace is active or no overrides exist.
   */
  private async getWorkspaceOverrides(): Promise<WorkspaceSettingsOverrides | null> {
    try {
      const wsId = await workspaceService.getCurrentWorkspaceId();
      if (!wsId) return null;

      const settings = await workspaceService.getWorkspaceSettings(wsId);
      if (!settings || Object.keys(settings).length === 0) return null;

      return settings;
    } catch (error) {
      logger.warn('Failed to load workspace settings overrides', undefined, error);
      return null;
    }
  }
}

export const settingsResolutionService = SettingsResolutionService.getInstance();
