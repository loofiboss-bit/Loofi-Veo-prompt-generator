/**
 * useResolvedSettings Hook
 * Returns resolved settings for the current workspace context.
 * Merges workspace overrides on top of global defaults.
 * v1.9.0 - Platform Foundations (Sprint 3)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { settingsResolutionService } from '@core/services/settingsResolutionService';
import { useSettingsStore, type AppSettings } from '@core/store/useSettingsStore';
import { useWorkspaceStore } from '@core/store/useWorkspaceStore';
import type { SettingSource } from '@core/types/workspace';

// ─── Types ──────────────────────────────────────────────────────────

/** Settings data shape without action methods */
type SettingsData = Omit<AppSettings, 'updateSettings' | 'resetSettings'>;

type SettingKey = keyof SettingsData;

interface ResolvedSettingsState {
  /** Fully resolved settings (workspace overrides applied) */
  settings: SettingsData;
  /** Whether settings are still resolving */
  isLoading: boolean;
  /** Error message if resolution failed */
  error: string | null;
  /** Get the source of a specific setting */
  getSource: (key: SettingKey) => SettingSource;
  /** Force re-resolve settings */
  refresh: () => Promise<void>;
}

// ─── Hook ───────────────────────────────────────────────────────────

/**
 * Hook that returns resolved settings with workspace overrides applied.
 * Falls back to global settings when no workspace is active.
 *
 * @example
 * ```tsx
 * const { settings, isLoading, getSource } = useResolvedSettings();
 * // settings.autoSave — resolved value (may come from workspace or global)
 * // getSource('autoSave') — 'workspace' | 'global' | 'default'
 * ```
 */
export function useResolvedSettings(): ResolvedSettingsState {
  const globalSettings = useSettingsStore();
  const currentWorkspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);

  const [resolvedSettings, setResolvedSettings] = useState<SettingsData>(() => {
    const { updateSettings: _u, resetSettings: _r, ...data } = globalSettings;
    return data;
  });
  const [sources, setSources] = useState<Partial<Record<SettingKey, SettingSource>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resolveIdRef = useRef(0);

  const resolve = useCallback(async () => {
    const id = ++resolveIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const effective = await settingsResolutionService.resolveEffectiveSettings();

      // Stale closure guard
      if (id !== resolveIdRef.current) return;

      setResolvedSettings(effective);

      // Resolve sources for overridable keys
      const overridableKeys = settingsResolutionService.getOverridableKeys();
      const sourceMap: Partial<Record<SettingKey, SettingSource>> = {};
      const resolved = await settingsResolutionService.resolveSettings(overridableKeys);
      for (const key of overridableKeys) {
        sourceMap[key as SettingKey] = resolved[key]?.source ?? 'global';
      }

      if (id !== resolveIdRef.current) return;
      setSources(sourceMap);
      setIsLoading(false);
    } catch (err) {
      if (id !== resolveIdRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to resolve settings');
      setIsLoading(false);
    }
  }, []);

  // Re-resolve when workspace or global settings change
  useEffect(() => {
    resolve();
  }, [resolve, currentWorkspaceId, globalSettings]);

  const getSource = useCallback(
    (key: SettingKey): SettingSource => {
      return sources[key] ?? 'global';
    },
    [sources],
  );

  return {
    settings: resolvedSettings,
    isLoading,
    error,
    getSource,
    refresh: resolve,
  };
}
