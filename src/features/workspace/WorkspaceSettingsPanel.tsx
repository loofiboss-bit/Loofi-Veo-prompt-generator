/**
 * WorkspaceSettingsPanel
 * Per-workspace settings overrides with "Use global default" / "Override" toggles.
 * v1.9.0 - Platform Foundations (Sprint 3, Task 2.4)
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useWorkspaceStore } from '@core/store/useWorkspaceStore';
import { useSettingsStore } from '@core/store/useSettingsStore';
import Icon from '@shared/components/ui/Icon';
import type { Workspace, WorkspaceSettingsOverrides } from '@core/types/workspace';

// ─── Overridable Settings Config ────────────────────────────────────

interface SettingConfig {
  key: keyof WorkspaceSettingsOverrides;
  label: string;
  description: string;
  type: 'boolean' | 'number' | 'select';
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

const OVERRIDABLE_SETTINGS: SettingConfig[] = [
  {
    key: 'autoSave',
    label: 'Auto Save',
    description: 'Automatically save changes at regular intervals',
    type: 'boolean',
  },
  {
    key: 'autoSaveInterval',
    label: 'Auto Save Interval',
    description: 'Time between auto-saves',
    type: 'number',
    min: 5000,
    max: 300000,
    step: 5000,
    unit: 'ms',
  },
  {
    key: 'defaultExportFormat',
    label: 'Default Export Format',
    description: 'Preferred format for video exports',
    type: 'select',
    options: [
      { value: 'mp4', label: 'MP4' },
      { value: 'webm', label: 'WebM' },
      { value: 'mov', label: 'MOV' },
    ],
  },
  {
    key: 'defaultExportQuality',
    label: 'Default Export Quality',
    description: 'Preferred quality for video exports',
    type: 'select',
    options: [
      { value: 'low', label: 'Low' },
      { value: 'medium', label: 'Medium' },
      { value: 'high', label: 'High' },
      { value: 'ultra', label: 'Ultra' },
    ],
  },
  {
    key: 'compactMode',
    label: 'Compact Mode',
    description: 'Use compact layout for dense information views',
    type: 'boolean',
  },
  {
    key: 'enableExperimentalFeatures',
    label: 'Experimental Features',
    description: 'Enable experimental features for this workspace',
    type: 'boolean',
  },
];

// ─── Props ──────────────────────────────────────────────────────────

interface WorkspaceSettingsPanelProps {
  workspace: Workspace;
}

// ─── Component ──────────────────────────────────────────────────────

export function WorkspaceSettingsPanel({ workspace }: WorkspaceSettingsPanelProps) {
  const { updateWorkspaceSettings, resetWorkspaceSettings } = useWorkspaceStore();
  const globalSettings = useSettingsStore();

  // Local overrides state — mirrors workspace.settings or empty
  const [overrides, setOverrides] = useState<WorkspaceSettingsOverrides>(workspace.settings ?? {});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync when workspace changes externally
  useEffect(() => {
    setOverrides(workspace.settings ?? {});
  }, [workspace]);

  // ─── Handlers ─────────────────────────────────────────────────────

  const isOverridden = useCallback(
    (key: keyof WorkspaceSettingsOverrides): boolean => {
      return overrides[key] !== undefined;
    },
    [overrides],
  );

  const getGlobalValue = useCallback(
    (key: keyof WorkspaceSettingsOverrides) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (globalSettings as Record<string, any>)[key];
    },
    [globalSettings],
  );

  const getEffectiveValue = useCallback(
    (key: keyof WorkspaceSettingsOverrides) => {
      if (overrides[key] !== undefined) return overrides[key];
      return getGlobalValue(key);
    },
    [overrides, getGlobalValue],
  );

  const handleToggleOverride = useCallback(
    (key: keyof WorkspaceSettingsOverrides) => {
      setOverrides((prev) => {
        const next = { ...prev };
        if (next[key] !== undefined) {
          // Remove override — fall back to global
          delete next[key];
        } else {
          // Start overriding — initialize with current global value
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (next as Record<string, any>)[key] = getGlobalValue(key);
        }
        return next;
      });
    },
    [getGlobalValue],
  );

  const handleValueChange = useCallback(
    (key: keyof WorkspaceSettingsOverrides, value: boolean | number | string) => {
      setOverrides((prev) => ({
        ...prev,
        [key]: value,
      }));
    },
    [],
  );

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await updateWorkspaceSettings(workspace.id, overrides);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } finally {
      setIsSaving(false);
    }
  }, [workspace.id, overrides, updateWorkspaceSettings]);

  const handleResetAll = useCallback(async () => {
    setIsSaving(true);
    try {
      await resetWorkspaceSettings(workspace.id);
      setOverrides({});
    } finally {
      setIsSaving(false);
    }
  }, [workspace.id, resetWorkspaceSettings]);

  const overriddenCount = Object.values(overrides).filter((v) => v !== undefined).length;

  // ─── Render ───────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">
      {/* Header info */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-400">
            Override global settings for this workspace. Unoverridden settings inherit from global.
          </p>
          {overriddenCount > 0 && (
            <p className="text-xs text-cyan-400 mt-1">
              {overriddenCount} setting{overriddenCount !== 1 ? 's' : ''} overridden
            </p>
          )}
        </div>
        {overriddenCount > 0 && (
          <button
            onClick={handleResetAll}
            disabled={isSaving}
            className="px-3 py-1.5 text-xs font-medium text-slate-400 bg-slate-800 border border-slate-700 rounded-lg hover:text-white hover:bg-slate-700 disabled:opacity-50 transition-colors"
          >
            Reset All to Global
          </button>
        )}
      </div>

      {/* Settings list */}
      <div className="space-y-3">
        {OVERRIDABLE_SETTINGS.map((config) => {
          const overridden = isOverridden(config.key);
          const effectiveValue = getEffectiveValue(config.key);
          const globalValue = getGlobalValue(config.key);

          return (
            <div
              key={config.key}
              className={`p-4 rounded-xl border transition-colors ${
                overridden
                  ? 'border-cyan-500/30 bg-cyan-500/5'
                  : 'border-slate-700/50 bg-slate-800/20'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                {/* Label & description */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-200">{config.label}</span>
                    {overridden && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-cyan-500/15 text-cyan-400 rounded">
                        Overridden
                      </span>
                    )}
                    {!overridden && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-slate-700 text-slate-500 rounded">
                        Global
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{config.description}</p>
                  {!overridden && (
                    <p className="text-xs text-slate-600 mt-0.5">
                      Current: {String(globalValue)}
                      {config.unit ? ` ${config.unit}` : ''}
                    </p>
                  )}
                </div>

                {/* Override toggle */}
                <button
                  onClick={() => handleToggleOverride(config.key)}
                  className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ${
                    overridden ? 'bg-cyan-600' : 'bg-slate-700'
                  }`}
                  aria-label={`${overridden ? 'Use global default' : 'Override'} ${config.label}`}
                  title={overridden ? 'Click to use global default' : 'Click to override'}
                >
                  <div
                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      overridden ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Value control (only when overridden) */}
              {overridden && (
                <div className="mt-3 pl-0">
                  {config.type === 'boolean' && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={effectiveValue as boolean}
                        onChange={(e) => handleValueChange(config.key, e.target.checked)}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0"
                      />
                      <span className="text-sm text-slate-300">
                        {effectiveValue ? 'Enabled' : 'Disabled'}
                      </span>
                    </label>
                  )}

                  {config.type === 'number' && (
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        value={effectiveValue as number}
                        onChange={(e) =>
                          handleValueChange(config.key, parseInt(e.target.value, 10))
                        }
                        min={config.min}
                        max={config.max}
                        step={config.step}
                        className="flex-1 h-2 rounded-full appearance-none cursor-pointer bg-slate-700 accent-cyan-500"
                      />
                      <span className="text-sm text-slate-300 font-mono min-w-[70px] text-right">
                        {(effectiveValue as number) / 1000}s
                      </span>
                    </div>
                  )}

                  {config.type === 'select' && config.options && (
                    <select
                      value={effectiveValue as string}
                      onChange={(e) => handleValueChange(config.key, e.target.value)}
                      className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500"
                    >
                      {config.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Save button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1 px-4 py-3 bg-cyan-600 text-white font-semibold rounded-xl hover:bg-cyan-500 disabled:opacity-50 transition-colors"
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
        {saveSuccess && (
          <span className="flex items-center gap-1 text-sm text-green-400">
            <Icon name="check" className="w-4 h-4" />
            Saved
          </span>
        )}
      </div>
    </div>
  );
}
