import React, { useState, useEffect } from 'react';
import { updateService, UpdateConfig, ReleaseChannel } from '@core/services/updateService';

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
            console.error('Failed to check for updates:', error);
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
        <div className="update-settings">
            <div className="settings-section">
                <h3>Update Settings</h3>
                <p className="section-description">
                    Configure how the application checks for and installs updates
                </p>
            </div>

            {/* Release Channel */}
            <div className="setting-group">
                <label className="setting-label">
                    <span className="label-text">Release Channel</span>
                    <span className="label-description">
                        Choose which type of releases to receive
                    </span>
                </label>
                <div className="channel-selector">
                    {(['stable', 'beta', 'dev'] as ReleaseChannel[]).map(channel => (
                        <button
                            key={channel}
                            className={`channel-btn ${config.channel === channel ? 'active' : ''}`}
                            onClick={() => handleConfigChange({ channel })}
                        >
                            <div className="channel-info">
                                <span className="channel-name">
                                    {channel.charAt(0).toUpperCase() + channel.slice(1)}
                                </span>
                                <span className="channel-description">
                                    {channel === 'stable' && 'Recommended for most users'}
                                    {channel === 'beta' && 'Early access to new features'}
                                    {channel === 'dev' && 'Latest development builds'}
                                </span>
                            </div>
                            {config.channel === channel && (
                                <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Auto Check */}
            <div className="setting-group">
                <label className="setting-toggle">
                    <div className="toggle-info">
                        <span className="label-text">Automatic Update Checks</span>
                        <span className="label-description">
                            Automatically check for updates in the background
                        </span>
                    </div>
                    <input
                        type="checkbox"
                        checked={config.autoCheck}
                        onChange={e => handleConfigChange({ autoCheck: e.target.checked })}
                    />
                    <span className="toggle-slider" />
                </label>
            </div>

            {/* Check Interval */}
            {config.autoCheck && (
                <div className="setting-group">
                    <label className="setting-label">
                        <span className="label-text">Check Interval</span>
                        <span className="label-description">
                            How often to check for updates
                        </span>
                    </label>
                    <select
                        className="setting-select"
                        value={config.checkInterval}
                        onChange={e => handleConfigChange({ checkInterval: Number(e.target.value) })}
                    >
                        <option value={1800000}>30 minutes</option>
                        <option value={3600000}>1 hour</option>
                        <option value={7200000}>2 hours</option>
                        <option value={21600000}>6 hours</option>
                        <option value={43200000}>12 hours</option>
                        <option value={86400000}>24 hours</option>
                    </select>
                    <span className="setting-value">
                        Currently: {formatInterval(config.checkInterval)}
                    </span>
                </div>
            )}

            {/* Auto Download */}
            <div className="setting-group">
                <label className="setting-toggle">
                    <div className="toggle-info">
                        <span className="label-text">Automatic Downloads</span>
                        <span className="label-description">
                            Download updates automatically when available
                        </span>
                    </div>
                    <input
                        type="checkbox"
                        checked={config.autoDownload}
                        onChange={e => handleConfigChange({ autoDownload: e.target.checked })}
                    />
                    <span className="toggle-slider" />
                </label>
            </div>

            {/* Auto Install */}
            <div className="setting-group">
                <label className="setting-toggle">
                    <div className="toggle-info">
                        <span className="label-text">Automatic Installation</span>
                        <span className="label-description">
                            Install updates automatically (requires restart)
                        </span>
                    </div>
                    <input
                        type="checkbox"
                        checked={config.autoInstall}
                        onChange={e => handleConfigChange({ autoInstall: e.target.checked })}
                        disabled={!config.autoDownload}
                    />
                    <span className="toggle-slider" />
                </label>
            </div>

            {/* Manual Check */}
            <div className="setting-group">
                <button
                    className="check-now-btn"
                    onClick={handleCheckNow}
                    disabled={checking}
                >
                    {checking ? (
                        <>
                            <svg className="spinner" viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" />
                                <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" opacity="0.75" />
                            </svg>
                            Checking...
                        </>
                    ) : (
                        <>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Check for Updates Now
                        </>
                    )}
                </button>
                {lastCheck && (
                    <p className="last-check">
                        Last checked: {lastCheck.toLocaleString()}
                    </p>
                )}
            </div>

            <style>{`
        .update-settings {
          max-width: 600px;
        }

        .settings-section {
          margin-bottom: 24px;
        }

        .settings-section h3 {
          margin: 0 0 8px 0;
          font-size: 20px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .section-description {
          margin: 0;
          font-size: 14px;
          color: var(--text-secondary);
        }

        .setting-group {
          margin-bottom: 24px;
          padding-bottom: 24px;
          border-bottom: 1px solid var(--border-color);
        }

        .setting-group:last-child {
          border-bottom: none;
        }

        .setting-label {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-bottom: 12px;
        }

        .label-text {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .label-description {
          font-size: 13px;
          color: var(--text-secondary);
        }

        /* Channel Selector */
        .channel-selector {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .channel-btn {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          background: var(--bg-secondary);
          border: 2px solid var(--border-color);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .channel-btn:hover {
          background: var(--bg-hover);
          border-color: var(--accent-color);
        }

        .channel-btn.active {
          background: var(--accent-bg);
          border-color: var(--accent-color);
        }

        .channel-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
          text-align: left;
        }

        .channel-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .channel-description {
          font-size: 12px;
          color: var(--text-secondary);
        }

        .check-icon {
          width: 20px;
          height: 20px;
          color: var(--accent-color);
        }

        /* Toggle Switch */
        .setting-toggle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          position: relative;
        }

        .toggle-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .setting-toggle input[type="checkbox"] {
          position: absolute;
          opacity: 0;
          width: 0;
          height: 0;
        }

        .toggle-slider {
          position: relative;
          width: 48px;
          height: 24px;
          background: var(--bg-tertiary);
          border-radius: 12px;
          transition: background 0.2s;
        }

        .toggle-slider::before {
          content: '';
          position: absolute;
          top: 2px;
          left: 2px;
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 50%;
          transition: transform 0.2s;
        }

        .setting-toggle input:checked + .toggle-slider {
          background: var(--accent-color);
        }

        .setting-toggle input:checked + .toggle-slider::before {
          transform: translateX(24px);
        }

        .setting-toggle input:disabled + .toggle-slider {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Select */
        .setting-select {
          width: 100%;
          padding: 10px 12px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          color: var(--text-primary);
          font-size: 14px;
          cursor: pointer;
          margin-bottom: 8px;
        }

        .setting-select:focus {
          outline: none;
          border-color: var(--accent-color);
        }

        .setting-value {
          font-size: 12px;
          color: var(--text-secondary);
        }

        /* Check Now Button */
        .check-now-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 12px 24px;
          background: var(--accent-color);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .check-now-btn:hover:not(:disabled) {
          background: var(--accent-hover);
          transform: translateY(-1px);
        }

        .check-now-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .check-now-btn svg {
          width: 20px;
          height: 20px;
        }

        .spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .last-check {
          margin: 8px 0 0 0;
          font-size: 12px;
          color: var(--text-secondary);
          text-align: center;
        }
      `}</style>
        </div>
    );
};
