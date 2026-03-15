import React from 'react';
import { useSettingsStore } from '@core/store/useSettingsStore';

/**
 * Subtle in-workspace reminder that advanced surfaces are intentionally hidden.
 */
export function FocusModeBanner() {
  const { focusMode, updateSettings } = useSettingsStore();

  if (!focusMode) {
    return null;
  }

  return (
    <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-cyan-800/40 bg-cyan-950/20 px-4 py-3 text-sm text-cyan-200">
      <div className="min-w-0">
        <p className="font-medium">Focus Mode is on</p>
        <p className="text-xs text-cyan-300/80">
          Advanced studios and collaboration surfaces are hidden so you can stay on the main prompt
          flow.
        </p>
      </div>
      <button
        type="button"
        onClick={() => updateSettings({ focusMode: false })}
        className="shrink-0 rounded-lg border border-cyan-700/40 px-3 py-1.5 text-xs font-semibold text-cyan-100 transition-colors hover:bg-cyan-900/30 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
        aria-label="Exit Focus Mode"
      >
        Exit Focus Mode
      </button>
    </div>
  );
}
