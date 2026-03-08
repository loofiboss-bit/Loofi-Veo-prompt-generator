import React from 'react';
import { useSettingsStore } from '@core/store/useSettingsStore';
import Icon from '@shared/components/ui/Icon';

export function FocusModeBanner() {
  const { focusMode, updateSettings } = useSettingsStore();

  if (!focusMode) return null;

  return (
    <div className="flex items-center justify-between px-4 py-1.5 bg-cyan-600/10 border-b border-cyan-600/20 text-xs text-cyan-400">
      <div className="flex items-center gap-2">
        <Icon name="zap" className="w-3.5 h-3.5" />
        <span>Focus Mode — advanced panels hidden</span>
      </div>
      <button
        type="button"
        onClick={() => updateSettings({ focusMode: false })}
        className="hover:text-cyan-200 transition-colors"
        aria-label="Exit focus mode"
      >
        Exit
      </button>
    </div>
  );
}
