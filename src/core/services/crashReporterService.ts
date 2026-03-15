/**
 * Crash Reporter Service
 * v2.0.0 - Platform Transformation
 *
 * Collects, stores, and optionally submits crash reports.
 * Integrates with both renderer-side error boundaries and
 * Electron main process error logging.
 *
 * Privacy-first: all data stored locally by default.
 * External submission only with explicit user opt-in.
 */

import { get, set } from 'idb-keyval';
import { logger } from './loggerService';
import { getElectron, isElectronEnvironment } from '@core/utils/electronBridge';
import type {
  CrashReport,
  CrashReporterConfig,
  CrashReporterState,
  CrashSeverity,
  CrashSource,
} from '@core/types/desktopProduction';

// ─── Constants ──────────────────────────────────────────────────────

const IDB_KEY_REPORTS = 'crash-reporter:reports';
const IDB_KEY_CONFIG = 'crash-reporter:config';
const IDB_KEY_SUBMITTED_COUNT = 'crash-reporter:submitted-count';

const APP_VERSION =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_APP_VERSION) || '2.0.0';

const DEFAULT_CONFIG: CrashReporterConfig = {
  enabled: true,
  endpoint: '',
  maxStoredReports: 100,
  maxRetries: 3,
  includeComponentStack: true,
  includePluginContext: true,
  rateLimitPerMinute: 30,
};

// ─── Session ────────────────────────────────────────────────────────

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const SESSION_ID = generateId();

// ─── Service ────────────────────────────────────────────────────────

class CrashReporterService {
  private static instance: CrashReporterService;

  private _config: CrashReporterConfig = { ...DEFAULT_CONFIG };
  private _reports: CrashReport[] = [];
  private _submittedCount = 0;
  private _sessionCrashCount = 0;
  private _isSubmitting = false;
  private _initialized = false;
  private _initializingPromise: Promise<void> | null = null;
  private _rateLimitWindow: number[] = [];
  private _listeners = new Set<(state: CrashReporterState) => void>();

  static getInstance(): CrashReporterService {
    if (!CrashReporterService.instance) {
      CrashReporterService.instance = new CrashReporterService();
    }
    return CrashReporterService.instance;
  }

  // ─── Initialization ─────────────────────────────────────────────

  async initialize(): Promise<void> {
    if (this._initialized) return;
    if (this._initializingPromise) {
      return this._initializingPromise;
    }

    this._initializingPromise = (async () => {
      try {
        // Load stored config
        const storedConfig = await get<CrashReporterConfig>(IDB_KEY_CONFIG);
        if (storedConfig) {
          this._config = { ...DEFAULT_CONFIG, ...storedConfig };
        }

        // Load stored reports
        const storedReports = await get<CrashReport[]>(IDB_KEY_REPORTS);
        if (storedReports) {
          this._reports = storedReports;
        }

        // Load submitted count
        const submittedCount = await get<number>(IDB_KEY_SUBMITTED_COUNT);
        if (typeof submittedCount === 'number') {
          this._submittedCount = submittedCount;
        }

        // Install global error handlers
        this._installGlobalHandlers();

        this._initialized = true;
        logger.info('[CrashReporter] Initialized', 'crashReporter', {
          storedReports: this._reports.length,
          enabled: this._config.enabled,
        });
      } catch (err) {
        this._initialized = false;
        logger.error('[CrashReporter] Failed to initialize', String(err));
        throw err;
      } finally {
        this._initializingPromise = null;
      }
    })();

    return this._initializingPromise;
  }

  // ─── Reporting ──────────────────────────────────────────────────

  /**
   * Report a crash from any source.
   */
  async reportCrash(params: {
    message: string;
    stack?: string;
    severity?: CrashSeverity;
    source?: CrashSource;
    componentStack?: string;
    context?: Record<string, string>;
  }): Promise<CrashReport | null> {
    if (!this._config.enabled) return null;

    // Rate limiting
    if (!this._checkRateLimit()) {
      logger.warn('[CrashReporter] Rate limit exceeded, skipping report');
      return null;
    }

    const platform = this._getPlatform();
    const arch = this._getArch();

    const report: CrashReport = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      appVersion: APP_VERSION,
      platform,
      arch,
      electronVersion: this._getElectronVersion(),
      severity: params.severity ?? 'error',
      source: params.source ?? 'renderer',
      message: params.message,
      stack: params.stack ?? '',
      componentStack: this._config.includeComponentStack ? params.componentStack : undefined,
      context: params.context ?? {},
      sessionId: SESSION_ID,
      state: 'pending',
      submissionAttempts: 0,
    };

    this._sessionCrashCount++;
    this._reports.push(report);

    // Prune old reports if over limit
    if (this._reports.length > this._config.maxStoredReports) {
      this._reports = this._reports.slice(-this._config.maxStoredReports);
    }

    // Mark as stored
    report.state = 'stored';

    // Persist to IndexedDB
    await this._persistReports();

    // Forward to Electron main process error log
    this._forwardToElectron(report);

    // Notify listeners
    this._notify();

    logger.info('[CrashReporter] Crash recorded', 'crashReporter', {
      id: report.id,
      severity: report.severity,
      source: report.source,
    });

    // Try to submit if endpoint configured
    if (this._config.endpoint) {
      // Fire and forget — don't block the caller
      void this._submitPending();
    }

    return report;
  }

  /**
   * Report a React error boundary catch.
   */
  async reportErrorBoundary(
    error: Error,
    componentStack?: string,
    context?: Record<string, string>,
  ): Promise<CrashReport | null> {
    return this.reportCrash({
      message: error.message,
      stack: error.stack,
      severity: 'fatal',
      source: 'renderer',
      componentStack,
      context,
    });
  }

  /**
   * Report an unhandled promise rejection.
   */
  async reportUnhandledRejection(
    reason: unknown,
    context?: Record<string, string>,
  ): Promise<CrashReport | null> {
    const message = reason instanceof Error ? reason.message : String(reason);
    const stack = reason instanceof Error ? reason.stack : undefined;

    return this.reportCrash({
      message,
      stack,
      severity: 'error',
      source: 'renderer',
      context: { ...context, type: 'unhandledrejection' },
    });
  }

  /**
   * Report a plugin crash.
   */
  async reportPluginCrash(
    pluginId: string,
    error: Error,
    context?: Record<string, string>,
  ): Promise<CrashReport | null> {
    if (!this._config.includePluginContext) {
      return this.reportCrash({
        message: error.message,
        stack: error.stack,
        severity: 'error',
        source: 'plugin',
      });
    }

    return this.reportCrash({
      message: error.message,
      stack: error.stack,
      severity: 'error',
      source: 'plugin',
      context: { pluginId, ...context },
    });
  }

  // ─── Submission ─────────────────────────────────────────────────

  /**
   * Submit all pending crash reports to the configured endpoint.
   */
  async submitPending(): Promise<{ submitted: number; failed: number }> {
    return this._submitPending();
  }

  private async _submitPending(): Promise<{ submitted: number; failed: number }> {
    if (!this._config.endpoint || this._isSubmitting) {
      return { submitted: 0, failed: 0 };
    }

    this._isSubmitting = true;
    this._notify();

    const pending = this._reports.filter(
      (r) =>
        (r.state === 'stored' || r.state === 'failed') &&
        r.submissionAttempts < this._config.maxRetries,
    );

    let submitted = 0;
    let failed = 0;

    for (const report of pending) {
      try {
        report.submissionAttempts++;

        const response = await fetch(this._config.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this._sanitizeReport(report)),
          signal: AbortSignal.timeout(15000),
        });

        if (response.ok) {
          report.state = 'submitted';
          submitted++;
          this._submittedCount++;
        } else {
          report.state = 'failed';
          report.lastSubmissionError = `HTTP ${response.status}`;
          failed++;
        }
      } catch (err) {
        report.state = 'failed';
        report.lastSubmissionError = err instanceof Error ? err.message : String(err);
        failed++;
      }
    }

    await this._persistReports();
    await set(IDB_KEY_SUBMITTED_COUNT, this._submittedCount);

    this._isSubmitting = false;
    this._notify();

    logger.info('[CrashReporter] Submission complete', `submitted=${submitted} failed=${failed}`);
    return { submitted, failed };
  }

  // ─── Query ──────────────────────────────────────────────────────

  /** Get all crash reports. */
  getReports(): readonly CrashReport[] {
    return this._reports;
  }

  /** Get recent crash reports (last N). */
  getRecentReports(count: number): CrashReport[] {
    return this._reports.slice(-count);
  }

  /** Get crash reports for a specific session. */
  getSessionReports(sessionId?: string): CrashReport[] {
    const targetSession = sessionId ?? SESSION_ID;
    return this._reports.filter((r) => r.sessionId === targetSession);
  }

  /** Get current reporter state. */
  getState(): CrashReporterState {
    return {
      initialized: this._initialized,
      config: { ...this._config },
      pendingCount: this._reports.filter((r) => r.state === 'stored' || r.state === 'pending')
        .length,
      submittedCount: this._submittedCount,
      sessionCrashCount: this._sessionCrashCount,
      lastCrash: this._reports.length > 0 ? this._reports[this._reports.length - 1] : null,
      isSubmitting: this._isSubmitting,
    };
  }

  /** Get current session ID. */
  getSessionId(): string {
    return SESSION_ID;
  }

  // ─── Configuration ─────────────────────────────────────────────

  /** Update crash reporter configuration. */
  async updateConfig(config: Partial<CrashReporterConfig>): Promise<void> {
    this._config = { ...this._config, ...config };
    await set(IDB_KEY_CONFIG, this._config);
    this._notify();
    logger.info('[CrashReporter] Config updated', JSON.stringify(config));
  }

  /** Get current configuration. */
  getConfig(): CrashReporterConfig {
    return { ...this._config };
  }

  // ─── Cleanup ────────────────────────────────────────────────────

  /** Clear all stored crash reports. */
  async clearReports(): Promise<void> {
    this._reports = [];
    await this._persistReports();
    this._notify();
    logger.info('[CrashReporter] Reports cleared');
  }

  /** Clear only submitted reports. */
  async clearSubmitted(): Promise<void> {
    this._reports = this._reports.filter((r) => r.state !== 'submitted');
    await this._persistReports();
    this._notify();
  }

  // ─── Subscription ──────────────────────────────────────────────

  /** Subscribe to state changes. Returns unsubscribe function. */
  subscribe(listener: (state: CrashReporterState) => void): () => void {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }

  // ─── Private ────────────────────────────────────────────────────

  private _notify(): void {
    const state = this.getState();
    this._listeners.forEach((listener) => {
      try {
        listener(state);
      } catch {
        // Swallow listener errors
      }
    });
  }

  private async _persistReports(): Promise<void> {
    try {
      await set(IDB_KEY_REPORTS, this._reports);
    } catch (err) {
      logger.error('[CrashReporter] Failed to persist reports', String(err));
    }
  }

  private _checkRateLimit(): boolean {
    const now = Date.now();
    const windowStart = now - 60_000;
    this._rateLimitWindow = this._rateLimitWindow.filter((t) => t > windowStart);

    if (this._rateLimitWindow.length >= this._config.rateLimitPerMinute) {
      return false;
    }

    this._rateLimitWindow.push(now);
    return true;
  }

  private _sanitizeReport(report: CrashReport): CrashReport {
    // Remove potentially sensitive data before submission
    const sanitized = { ...report };
    // Filter out context keys that might contain PII
    const safeContext: Record<string, string> = {};
    for (const [key, value] of Object.entries(sanitized.context)) {
      // Skip keys that might contain user data
      if (!key.toLowerCase().includes('path') && !key.toLowerCase().includes('user')) {
        safeContext[key] = value;
      }
    }
    sanitized.context = safeContext;
    return sanitized;
  }

  private _forwardToElectron(report: CrashReport): void {
    if (!isElectronEnvironment()) return;

    const electron = getElectron();
    if (!electron?.logError) return;

    try {
      electron.logError({
        code: `CRASH_${report.severity.toUpperCase()}`,
        message: report.message,
        stack: report.stack,
        context: {
          crashId: report.id,
          source: report.source,
          severity: report.severity,
          ...report.context,
        },
        timestamp: report.timestamp,
        level: report.severity === 'fatal' ? 'error' : report.severity,
      });
    } catch {
      // Swallow — don't let Electron logging failures cascade
    }
  }

  private _installGlobalHandlers(): void {
    // Global error handlers are already installed by globalUnhandledRejectionService
    // in index.tsx. CrashReporter hooks into errorLoggingService instead of
    // duplicating window.addEventListener listeners (consolidated in v2.8.0).
  }

  private _getPlatform(): string {
    if (isElectronEnvironment()) {
      return getElectron()?.platform ?? 'unknown';
    }
    return navigator.platform ?? 'web';
  }

  private _getArch(): string {
    if (isElectronEnvironment()) {
      return getElectron()?.arch ?? 'unknown';
    }
    return 'web';
  }

  private _getElectronVersion(): string {
    if (isElectronEnvironment()) {
      return navigator.userAgent.match(/Electron\/([\d.]+)/)?.[1] ?? '';
    }
    return '';
  }
}

export const crashReporterService = CrashReporterService.getInstance();
