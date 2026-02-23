import React, { useState, useEffect } from 'react';
import { updateService, UpdateConfig, ReleaseChannel } from '@core/services/updateService';
import { logger } from '@core/services/loggerService';

const CHANNEL_DESCRIPTIONS: Record<ReleaseChannel, string> = {
  stable: 'Recommended for most users',
  beta: 'Early access to new features',
  dev: 'Latest development builds',
};

const INTERVAL_OPTIONS = [
  { value: 1800000, label: '30 minutes' },
  { value: 3600000, label: '1 hour' },
  { value: 7200000, label: '2 hours' },
  { value: 21600000, label: '6 hours' },
  { value: 43200000, label: '12 hours' },
  { value: 86400000, label: '24 hours' },
];

interface ToggleRowProps {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

const ToggleRow: React.FC<ToggleRowProps> = ({
  id,
  label,
  description,
  checked,
  disabled,
  onChange,
}) => (
  <label
    htmlFor={id}
    className={`flex items-center justify-between py-4 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
  >
    <div className="flex flex-col gap-0.5">
      <span className="text-sm font-medium text-slate-100">{label}</span>
      <span className="text-xs text-slate-400">{description}</span>
    </div>
    <div className="relative">
      <input
        id={id}
        type="checkbox"
        className="sr-only peer"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={label}
      />
      <div className="w-11 h-6 bg-slate-700 rounded-full peer-checked:bg-cyan-600 peer-disabled:opacity-50 transition-colors" />
      <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-5" />
    </div>
  </label>
);

export const UpdateSettings: React.FC = () => {
  const [config, setConfig] = useState<UpdateConfig>(updateService.getConfig());
  const [checking, setChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  useEffect(() => {
    const unsubscribe = updateService.subscribe(() => {
      setLastCheck(new Date());
      setChecking(false);
    });
    return unsubscribe;
  }, []);

  const handleConfigChange = (updates: Partial<UpdateConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    updateService.updateConfig(updates);
  };

  const handleCheckNow = async () => {
    setChecking(true);
    try {
      await updateService.checkForUpdates();
    } catch (error) {
      logger.error('Failed to check for updates:', error);
    } finally {
      setChecking(false);
    }
  };

  const formatInterval = (ms: number): string => {
    const hours = ms / (1000 * 60 * 60);
    if (hours < 1) return `${Math.round(hours * 60)} minutes`;
    if (hours === 1) return '1 hour';
    if (hours < 24) return `${Math.round(hours)} hours`;
    return `${Math.round(hours / 24)} days`;
  };

  return (
    <div className="space-y-8">
      {/* Release Channel */}
      <section>
        <h3 className="text-lg font-semibold text-slate-100 mb-1">Release Channel</h3>
        <p className="text-sm text-slate-400 mb-4">Choose which type of releases to receive</p>
        <div className="flex flex-col gap-2">
          {(['stable', 'beta', 'dev'] as ReleaseChannel[]).map((channel) => {
            const isActive = config.channel === channel;
            return (
              <button
                key={channel}
                className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all text-left ${
                  isActive
                    ? 'bg-cyan-950/40 border-cyan-600'
                    : 'bg-slate-800/50 border-slate-700 hover:border-slate-500 hover:bg-slate-800'
                }`}
                onClick={() => handleConfigChange({ channel })}
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-slate-100">
                    {channel.charAt(0).toUpperCase() + channel.slice(1)}
                  </span>
                  <span className="text-xs text-slate-400">{CHANNEL_DESCRIPTIONS[channel]}</span>
                </div>
                {isActive && (
                  <svg
                    className="w-5 h-5 text-cyan-400 flex-shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Toggle settings */}
      <section className="divide-y divide-slate-700/50">
        <ToggleRow
          id="auto-check-toggle"
          label="Automatic Update Checks"
          description="Automatically check for updates in the background"
          checked={config.autoCheck}
          onChange={(checked) => handleConfigChange({ autoCheck: checked })}
        />

        <ToggleRow
          id="auto-download-toggle"
          label="Automatic Downloads"
          description="Download updates automatically when available"
          checked={config.autoDownload}
          onChange={(checked) => handleConfigChange({ autoDownload: checked })}
        />

        <ToggleRow
          id="auto-install-toggle"
          label="Automatic Installation"
          description="Install updates automatically (requires restart)"
          checked={config.autoInstall}
          disabled={!config.autoDownload}
          onChange={(checked) => handleConfigChange({ autoInstall: checked })}
        />
      </section>

      {/* Check Interval */}
      {config.autoCheck && (
        <section>
          <h3 className="text-lg font-semibold text-slate-100 mb-1">Check Interval</h3>
          <p className="text-sm text-slate-400 mb-4">How often to check for updates</p>
          <select
            className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-slate-200 text-sm focus:border-cyan-500 focus:outline-none cursor-pointer"
            value={config.checkInterval}
            onChange={(e) => handleConfigChange({ checkInterval: Number(e.target.value) })}
          >
            {INTERVAL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500 mt-1.5">
            Currently: {formatInterval(config.checkInterval)}
          </p>
        </section>
      )}

      {/* Manual Check */}
      <section>
        <button
          className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-cyan-600 text-white rounded-lg text-sm font-medium hover:bg-cyan-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-cyan-600/20"
          onClick={handleCheckNow}
          disabled={checking}
        >
          {checking ? (
            <>
              <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  opacity="0.25"
                />
                <path
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  opacity="0.75"
                />
              </svg>
              Checking...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Check for Updates Now
            </>
          )}
        </button>
        {lastCheck && (
          <p className="text-xs text-slate-500 text-center mt-2">
            Last checked: {lastCheck.toLocaleString()}
          </p>
        )}
      </section>
    </div>
  );
};
