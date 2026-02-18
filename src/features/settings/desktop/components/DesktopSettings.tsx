/**
 * DesktopSettings — Desktop Health & Privacy settings panel
 * v2.0.0 - Production Desktop
 *
 * Provides controls for crash reporting, opt-in telemetry,
 * differential update strategy, and rollback management.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useSettingsStore } from '@core/store/useSettingsStore';
import { crashReporterService } from '@core/services/crashReporterService';
import { telemetryService } from '@core/services/telemetryService';
import { differentialUpdateService } from '@core/services/differentialUpdateService';
import type { CrashReporterConfig } from '@core/types/desktopProduction';
import type { DiffUpdateConfig, DiffUpdateProgress } from '@core/types/desktopProduction';

type SubTab = 'crash' | 'telemetry' | 'updates';

export const DesktopSettings: React.FC = () => {
  const { enableCrashReporting, enableAnalytics, updateSettings } = useSettingsStore();

  // ─── Crash Reporter State ──────────────────────────────────────
  const [crashConfig, setCrashConfig] = useState<CrashReporterConfig>(
    crashReporterService.getConfig(),
  );
  const [crashReportCount, setCrashReportCount] = useState(
    crashReporterService.getReports().length,
  );
  const [recentCrashes, setRecentCrashes] = useState(crashReporterService.getRecentReports(5));

  // ─── Telemetry State ──────────────────────────────────────────
  const [telemetryEventCount, setTelemetryEventCount] = useState(0);

  // ─── Diff Update State ────────────────────────────────────────
  const [diffConfig, setDiffConfig] = useState<DiffUpdateConfig>(
    differentialUpdateService.getConfig(),
  );
  const [diffProgress, setDiffProgress] = useState<DiffUpdateProgress>(
    differentialUpdateService.getProgress(),
  );
  const [rollbackCount] = useState(differentialUpdateService.getRollbackSnapshots().length);

  // ─── Sub-tab ──────────────────────────────────────────────────
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('crash');

  // ─── Effects ──────────────────────────────────────────────────
  useEffect(() => {
    const unsubCrash = crashReporterService.subscribe((state) => {
      setCrashReportCount(state.pendingCount + state.submittedCount);
      setRecentCrashes(crashReporterService.getRecentReports(5));
    });

    const unsubDiff = differentialUpdateService.subscribe((progress) => {
      setDiffProgress(progress);
    });

    // Refresh telemetry count
    const telemetryState = telemetryService.getState();
    setTelemetryEventCount(telemetryState.sessionEventCount);

    return () => {
      unsubCrash();
      unsubDiff();
    };
  }, []);

  // ─── Handlers ─────────────────────────────────────────────────
  const handleCrashReportingToggle = useCallback(
    (enabled: boolean) => {
      updateSettings({ enableCrashReporting: enabled });
      crashReporterService.updateConfig({ enabled });
    },
    [updateSettings],
  );

  const handleAnalyticsToggle = useCallback(
    (enabled: boolean) => {
      updateSettings({ enableAnalytics: enabled });
      telemetryService.updateConfig({ enabled });
    },
    [updateSettings],
  );

  const handleCrashConfigChange = useCallback(
    (updates: Partial<CrashReporterConfig>) => {
      const newConfig = { ...crashConfig, ...updates };
      setCrashConfig(newConfig);
      crashReporterService.updateConfig(updates);
    },
    [crashConfig],
  );

  const handleDiffConfigChange = useCallback(
    (updates: Partial<DiffUpdateConfig>) => {
      const newConfig = { ...diffConfig, ...updates };
      setDiffConfig(newConfig);
      differentialUpdateService.updateConfig(updates);
    },
    [diffConfig],
  );

  const handleClearReports = useCallback(() => {
    crashReporterService.clearReports();
    setCrashReportCount(0);
    setRecentCrashes([]);
  }, []);

  const handleClearTelemetry = useCallback(() => {
    telemetryService.clearEvents();
    setTelemetryEventCount(0);
  }, []);

  return (
    <div className="desktop-settings">
      {/* Sub-tabs */}
      <div className="desktop-subtabs">
        <button
          className={`desktop-subtab ${activeSubTab === 'crash' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('crash')}
        >
          Crash Reporting
          {crashReportCount > 0 && <span className="desktop-badge">{crashReportCount}</span>}
        </button>
        <button
          className={`desktop-subtab ${activeSubTab === 'telemetry' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('telemetry')}
        >
          Privacy & Telemetry
        </button>
        <button
          className={`desktop-subtab ${activeSubTab === 'updates' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('updates')}
        >
          Update Strategy
        </button>
      </div>

      {/* ─── Crash Reporting Tab ──────────────────────────────── */}
      {activeSubTab === 'crash' && (
        <div className="settings-section">
          <h3>Crash Reporting</h3>
          <p className="section-description">
            Collect and optionally submit crash reports to help improve the app. Reports are stored
            locally and never sent without your consent.
          </p>

          <div className="setting-group">
            <div className="setting-label">
              <span className="label-text">Enable crash reporting</span>
              <span className="label-description">Capture errors and unhandled exceptions</span>
            </div>
            <label className="setting-toggle" aria-label="Enable crash reporting">
              <input
                type="checkbox"
                checked={enableCrashReporting}
                onChange={(e) => handleCrashReportingToggle(e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>

          <div className="setting-group">
            <div className="setting-label">
              <span className="label-text">Include component stack</span>
              <span className="label-description">Add React component tree to crash reports</span>
            </div>
            <label className="setting-toggle" aria-label="Include component stack">
              <input
                type="checkbox"
                checked={crashConfig.includeComponentStack}
                onChange={(e) =>
                  handleCrashConfigChange({ includeComponentStack: e.target.checked })
                }
                disabled={!enableCrashReporting}
              />
              <span className="toggle-slider" />
            </label>
          </div>

          <div className="setting-group">
            <div className="setting-label">
              <span className="label-text">Include plugin context</span>
              <span className="label-description">Add active plugin info to crash reports</span>
            </div>
            <label className="setting-toggle" aria-label="Include plugin context">
              <input
                type="checkbox"
                checked={crashConfig.includePluginContext}
                onChange={(e) =>
                  handleCrashConfigChange({ includePluginContext: e.target.checked })
                }
                disabled={!enableCrashReporting}
              />
              <span className="toggle-slider" />
            </label>
          </div>

          <div className="setting-group">
            <div className="setting-label">
              <span className="label-text">Max stored reports</span>
              <span className="label-description">Maximum crash reports kept locally</span>
            </div>
            <select
              className="setting-select"
              value={crashConfig.maxStoredReports}
              onChange={(e) =>
                handleCrashConfigChange({ maxStoredReports: Number(e.target.value) })
              }
              disabled={!enableCrashReporting}
              aria-label="Max stored reports"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </div>

          {/* Recent Crashes */}
          <div className="crash-reports-section">
            <div className="crash-reports-header">
              <h4>Recent Crash Reports ({crashReportCount})</h4>
              {crashReportCount > 0 && (
                <button className="clear-reports-btn" onClick={handleClearReports}>
                  Clear All
                </button>
              )}
            </div>
            {recentCrashes.length === 0 ? (
              <p className="no-reports">No crash reports recorded.</p>
            ) : (
              <div className="crash-list">
                {recentCrashes.map((report) => (
                  <div key={report.id} className="crash-item">
                    <div className="crash-item-header">
                      <span className={`crash-severity crash-severity-${report.severity}`}>
                        {report.severity}
                      </span>
                      <span className="crash-source">{report.source}</span>
                      <span className="crash-time">
                        {new Date(report.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="crash-message">{report.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Telemetry Tab ────────────────────────────────────── */}
      {activeSubTab === 'telemetry' && (
        <div className="settings-section">
          <h3>Privacy & Telemetry</h3>
          <p className="section-description">
            Opt-in anonymous usage analytics help us improve the app. No personal data is ever
            collected. All telemetry is disabled by default.
          </p>

          <div className="setting-group">
            <div className="setting-label">
              <span className="label-text">Enable anonymous analytics</span>
              <span className="label-description">
                Share anonymous usage data to help improve the app
              </span>
            </div>
            <label className="setting-toggle" aria-label="Enable anonymous analytics">
              <input
                type="checkbox"
                checked={enableAnalytics}
                onChange={(e) => handleAnalyticsToggle(e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>

          <div className="setting-group">
            <div className="setting-label">
              <span className="label-text">Track feature usage</span>
              <span className="label-description">Record which features are used most</span>
            </div>
            <label className="setting-toggle" aria-label="Track feature usage">
              <input
                type="checkbox"
                checked={telemetryService.getConfig().trackFeatureUsage}
                onChange={(e) =>
                  telemetryService.updateConfig({ trackFeatureUsage: e.target.checked })
                }
                disabled={!enableAnalytics}
              />
              <span className="toggle-slider" />
            </label>
          </div>

          <div className="setting-group">
            <div className="setting-label">
              <span className="label-text">Track performance metrics</span>
              <span className="label-description">Record render times and memory usage</span>
            </div>
            <label className="setting-toggle" aria-label="Track performance metrics">
              <input
                type="checkbox"
                checked={telemetryService.getConfig().trackPerformance}
                onChange={(e) =>
                  telemetryService.updateConfig({ trackPerformance: e.target.checked })
                }
                disabled={!enableAnalytics}
              />
              <span className="toggle-slider" />
            </label>
          </div>

          <div className="telemetry-stats">
            <div className="telemetry-stat">
              <span className="stat-value">{telemetryEventCount}</span>
              <span className="stat-label">Events stored</span>
            </div>
            <div className="telemetry-stat">
              <span className="stat-value">{enableAnalytics ? 'Active' : 'Disabled'}</span>
              <span className="stat-label">Status</span>
            </div>
          </div>

          {telemetryEventCount > 0 && (
            <button className="clear-telemetry-btn" onClick={handleClearTelemetry}>
              Clear All Telemetry Data
            </button>
          )}

          <div className="privacy-notice">
            <h4>What we collect</h4>
            <ul>
              <li>Feature usage counts (e.g. export, timeline edits)</li>
              <li>Performance metrics (render times, memory)</li>
              <li>App version and platform</li>
              <li>Session duration</li>
            </ul>
            <h4>What we never collect</h4>
            <ul>
              <li>Prompt content or project data</li>
              <li>Personal information or API keys</li>
              <li>File paths or system details</li>
              <li>Browsing or usage patterns outside this app</li>
            </ul>
          </div>
        </div>
      )}

      {/* ─── Update Strategy Tab ─────────────────────────────── */}
      {activeSubTab === 'updates' && (
        <div className="settings-section">
          <h3>Update Strategy</h3>
          <p className="section-description">
            Configure how updates are downloaded and installed. Differential updates save bandwidth
            by only downloading changed portions.
          </p>

          <div className="setting-group">
            <div className="setting-label">
              <span className="label-text">Download strategy</span>
              <span className="label-description">How update files are downloaded</span>
            </div>
            <div className="strategy-buttons">
              {(['auto', 'differential', 'full'] as const).map((strategy) => (
                <button
                  key={strategy}
                  className={`strategy-btn ${diffConfig.strategy === strategy ? 'active' : ''}`}
                  onClick={() => handleDiffConfigChange({ strategy })}
                >
                  {strategy === 'auto'
                    ? 'Auto'
                    : strategy === 'differential'
                      ? 'Differential'
                      : 'Full'}
                </button>
              ))}
            </div>
          </div>

          <div className="setting-group">
            <div className="setting-label">
              <span className="label-text">Stage for restart</span>
              <span className="label-description">
                Download updates in the background and apply on restart
              </span>
            </div>
            <label className="setting-toggle" aria-label="Stage for restart">
              <input
                type="checkbox"
                checked={diffConfig.stageForRestart}
                onChange={(e) => handleDiffConfigChange({ stageForRestart: e.target.checked })}
              />
              <span className="toggle-slider" />
            </label>
          </div>

          <div className="setting-group">
            <div className="setting-label">
              <span className="label-text">Keep rollback snapshots</span>
              <span className="label-description">
                Save previous version for rollback capability
              </span>
            </div>
            <label className="setting-toggle" aria-label="Keep rollback snapshots">
              <input
                type="checkbox"
                checked={diffConfig.keepRollbackSnapshot}
                onChange={(e) => handleDiffConfigChange({ keepRollbackSnapshot: e.target.checked })}
              />
              <span className="toggle-slider" />
            </label>
          </div>

          <div className="setting-group">
            <div className="setting-label">
              <span className="label-text">Verify checksums</span>
              <span className="label-description">SHA-256 verification of downloaded files</span>
            </div>
            <label className="setting-toggle" aria-label="Verify checksums">
              <input
                type="checkbox"
                checked={diffConfig.verifyChecksum}
                onChange={(e) => handleDiffConfigChange({ verifyChecksum: e.target.checked })}
              />
              <span className="toggle-slider" />
            </label>
          </div>

          <div className="setting-group">
            <div className="setting-label">
              <span className="label-text">Min savings threshold</span>
              <span className="label-description">
                Minimum bandwidth savings to use differential (auto mode)
              </span>
            </div>
            <select
              className="setting-select"
              value={diffConfig.minSavingsPercent}
              onChange={(e) =>
                handleDiffConfigChange({ minSavingsPercent: Number(e.target.value) })
              }
              aria-label="Min savings threshold"
            >
              <option value={10}>10%</option>
              <option value={20}>20%</option>
              <option value={30}>30%</option>
              <option value={50}>50%</option>
            </select>
          </div>

          {/* Diff progress */}
          {diffProgress.state !== 'idle' && (
            <div className="diff-progress">
              <div className="diff-progress-header">
                <span className="diff-progress-state">{diffProgress.state}</span>
                <span className="diff-progress-pct">{diffProgress.progress}%</span>
              </div>
              <div className="diff-progress-bar">
                <div
                  className="diff-progress-fill"
                  style={{ width: `${diffProgress.progress}%` }}
                />
              </div>
              <p className="diff-progress-message">{diffProgress.message}</p>
              {diffProgress.savingsPercent > 0 && (
                <p className="diff-savings">Bandwidth savings: {diffProgress.savingsPercent}%</p>
              )}
            </div>
          )}

          {/* Rollback */}
          <div className="rollback-section">
            <h4>Rollback Snapshots ({rollbackCount})</h4>
            {rollbackCount === 0 ? (
              <p className="no-reports">No rollback snapshots available.</p>
            ) : (
              <div className="rollback-list">
                {differentialUpdateService.getRollbackSnapshots().map((snapshot) => (
                  <div key={snapshot.id} className="rollback-item">
                    <span>
                      v{snapshot.fromVersion} → v{snapshot.toVersion}
                    </span>
                    <span className="rollback-date">
                      {new Date(snapshot.createdAt).toLocaleDateString()}
                    </span>
                    <button
                      className="rollback-btn"
                      onClick={() => differentialUpdateService.rollback(snapshot.id)}
                    >
                      Rollback
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Staged update */}
          {differentialUpdateService.hasStagedUpdate() && (
            <div className="staged-update-banner">
              <span>Update v{differentialUpdateService.getStagedVersion()} is staged.</span>
              <button
                className="install-staged-btn"
                onClick={() => differentialUpdateService.installStagedUpdate()}
              >
                Restart &amp; Install
              </button>
            </div>
          )}
        </div>
      )}

      <style>{`
        .desktop-settings {
          color: var(--text-primary, #e0e0e0);
        }

        .desktop-subtabs {
          display: flex;
          gap: 4px;
          margin-bottom: 20px;
          padding: 4px;
          background: var(--bg-tertiary, rgba(255, 255, 255, 0.05));
          border-radius: 10px;
        }

        .desktop-subtab {
          flex: 1;
          padding: 8px 12px;
          background: transparent;
          border: none;
          color: var(--text-secondary, #a0a0a0);
          cursor: pointer;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .desktop-subtab:hover {
          color: var(--text-primary, #e0e0e0);
          background: rgba(255, 255, 255, 0.05);
        }

        .desktop-subtab.active {
          color: var(--accent-color, #00d4ff);
          background: rgba(0, 212, 255, 0.1);
        }

        .desktop-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 18px;
          height: 18px;
          padding: 0 5px;
          font-size: 11px;
          font-weight: 600;
          background: var(--accent-color, #00d4ff);
          color: #000;
          border-radius: 9px;
        }

        .settings-section h3 {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 6px;
          color: var(--text-primary, #e0e0e0);
        }

        .section-description {
          font-size: 13px;
          color: var(--text-secondary, #a0a0a0);
          margin-bottom: 20px;
          line-height: 1.5;
        }

        .setting-group {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .setting-label {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .label-text {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary, #e0e0e0);
        }

        .label-description {
          font-size: 12px;
          color: var(--text-secondary, #a0a0a0);
        }

        .setting-toggle {
          position: relative;
          display: inline-block;
          width: 42px;
          height: 24px;
          cursor: pointer;
          flex-shrink: 0;
        }

        .setting-toggle input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .toggle-slider {
          position: absolute;
          inset: 0;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 12px;
          transition: background 0.2s;
        }

        .toggle-slider::before {
          content: '';
          position: absolute;
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background: white;
          border-radius: 50%;
          transition: transform 0.2s;
        }

        .setting-toggle input:checked + .toggle-slider {
          background: var(--accent-color, #00d4ff);
        }

        .setting-toggle input:checked + .toggle-slider::before {
          transform: translateX(18px);
        }

        .setting-toggle input:disabled + .toggle-slider {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .setting-select {
          background: var(--bg-tertiary, rgba(255, 255, 255, 0.08));
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--text-primary, #e0e0e0);
          padding: 6px 10px;
          border-radius: 8px;
          font-size: 13px;
          min-width: 80px;
        }

        .setting-select:disabled {
          opacity: 0.4;
        }

        /* Strategy buttons */
        .strategy-buttons {
          display: flex;
          gap: 4px;
          background: var(--bg-tertiary, rgba(255, 255, 255, 0.05));
          border-radius: 8px;
          padding: 3px;
        }

        .strategy-btn {
          padding: 6px 14px;
          background: transparent;
          border: none;
          color: var(--text-secondary, #a0a0a0);
          cursor: pointer;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.2s;
        }

        .strategy-btn:hover {
          color: var(--text-primary, #e0e0e0);
        }

        .strategy-btn.active {
          background: var(--accent-color, #00d4ff);
          color: #000;
        }

        /* Crash reports */
        .crash-reports-section {
          margin-top: 20px;
        }

        .crash-reports-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .crash-reports-header h4 {
          font-size: 14px;
          font-weight: 600;
          margin: 0;
        }

        .clear-reports-btn,
        .clear-telemetry-btn {
          padding: 6px 14px;
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #ef4444;
          border-radius: 8px;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s;
        }

        .clear-reports-btn:hover,
        .clear-telemetry-btn:hover {
          background: rgba(239, 68, 68, 0.25);
        }

        .no-reports {
          font-size: 13px;
          color: var(--text-secondary, #a0a0a0);
          font-style: italic;
        }

        .crash-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .crash-item {
          background: var(--bg-tertiary, rgba(255, 255, 255, 0.04));
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 8px;
          padding: 10px 12px;
        }

        .crash-item-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }

        .crash-severity {
          font-size: 11px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 4px;
          text-transform: uppercase;
        }

        .crash-severity-fatal {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }

        .crash-severity-error {
          background: rgba(245, 158, 11, 0.2);
          color: #f59e0b;
        }

        .crash-severity-warning {
          background: rgba(59, 130, 246, 0.2);
          color: #3b82f6;
        }

        .crash-source {
          font-size: 11px;
          color: var(--text-secondary, #a0a0a0);
        }

        .crash-time {
          font-size: 11px;
          color: var(--text-secondary, #a0a0a0);
          margin-left: auto;
        }

        .crash-message {
          font-size: 12px;
          color: var(--text-primary, #e0e0e0);
          margin: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* Telemetry */
        .telemetry-stats {
          display: flex;
          gap: 16px;
          margin: 16px 0;
        }

        .telemetry-stat {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 16px;
          background: var(--bg-tertiary, rgba(255, 255, 255, 0.04));
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .stat-value {
          font-size: 24px;
          font-weight: 700;
          color: var(--accent-color, #00d4ff);
        }

        .stat-label {
          font-size: 12px;
          color: var(--text-secondary, #a0a0a0);
          margin-top: 4px;
        }

        .privacy-notice {
          margin-top: 20px;
          padding: 16px;
          background: var(--bg-tertiary, rgba(255, 255, 255, 0.04));
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .privacy-notice h4 {
          font-size: 13px;
          font-weight: 600;
          margin: 0 0 8px;
          color: var(--text-primary, #e0e0e0);
        }

        .privacy-notice h4:nth-of-type(2) {
          margin-top: 16px;
        }

        .privacy-notice ul {
          margin: 0;
          padding-left: 20px;
        }

        .privacy-notice li {
          font-size: 12px;
          color: var(--text-secondary, #a0a0a0);
          line-height: 1.6;
        }

        .clear-telemetry-btn {
          margin-top: 12px;
          width: 100%;
        }

        /* Diff progress */
        .diff-progress {
          margin-top: 16px;
          padding: 14px;
          background: var(--bg-tertiary, rgba(255, 255, 255, 0.04));
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .diff-progress-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .diff-progress-state {
          font-size: 12px;
          font-weight: 600;
          color: var(--accent-color, #00d4ff);
          text-transform: capitalize;
        }

        .diff-progress-pct {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary, #e0e0e0);
        }

        .diff-progress-bar {
          height: 6px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
          overflow: hidden;
        }

        .diff-progress-fill {
          height: 100%;
          background: var(--accent-color, #00d4ff);
          border-radius: 3px;
          transition: width 0.3s;
        }

        .diff-progress-message {
          font-size: 12px;
          color: var(--text-secondary, #a0a0a0);
          margin: 8px 0 0;
        }

        .diff-savings {
          font-size: 12px;
          color: #22c55e;
          margin: 4px 0 0;
        }

        /* Rollback */
        .rollback-section {
          margin-top: 20px;
        }

        .rollback-section h4 {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 10px;
        }

        .rollback-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .rollback-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          background: var(--bg-tertiary, rgba(255, 255, 255, 0.04));
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 8px;
          font-size: 13px;
        }

        .rollback-date {
          font-size: 12px;
          color: var(--text-secondary, #a0a0a0);
          margin-left: auto;
        }

        .rollback-btn {
          padding: 4px 12px;
          background: rgba(245, 158, 11, 0.15);
          border: 1px solid rgba(245, 158, 11, 0.3);
          color: #f59e0b;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s;
        }

        .rollback-btn:hover {
          background: rgba(245, 158, 11, 0.25);
        }

        /* Staged update */
        .staged-update-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 16px;
          padding: 14px;
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.3);
          border-radius: 10px;
          color: #22c55e;
          font-size: 13px;
          font-weight: 500;
        }

        .install-staged-btn {
          padding: 6px 16px;
          background: #22c55e;
          border: none;
          color: #000;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.2s;
        }

        .install-staged-btn:hover {
          background: #16a34a;
        }
      `}</style>
    </div>
  );
};
