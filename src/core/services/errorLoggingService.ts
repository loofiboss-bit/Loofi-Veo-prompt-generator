/**
 * Error Logging Service
 * v1.5.0 Sprint 1: centralized and versioned error schema.
 */

import { get, set } from 'idb-keyval';
import { logger } from './loggerService';
import {
  createStructuredErrorLogEntry,
  normalizeStructuredErrorLogEntry,
  type ErrorLogContext,
  type StructuredErrorLogEntry,
} from '@core/utils/errorSchema';
import { getElectron, isElectronEnvironment } from '@core/utils/electronBridge';

export type ErrorLogEntry = StructuredErrorLogEntry;

const IDB_KEY = 'error-log';
const MAX_ENTRIES = 100;
const IPC_BATCH_SIZE = 10;
const IPC_FLUSH_DEBOUNCE_MS = 1500;
const DEDUPE_WINDOW_MS = 5000;
const MAX_QUEUE_SIZE = 200;

class ErrorLoggingService {
  private entries: ErrorLogEntry[] = [];
  private loaded = false;
  private readonly isElectron: boolean = isElectronEnvironment();

  private ipcQueue: ErrorLogEntry[] = [];
  private ipcFlushTimer: ReturnType<typeof setTimeout> | null = null;
  private lastFingerprints: Map<string, number> = new Map();

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flushIpcQueueBeforeUnload();
      });
    }
  }

  private ensureContext(context?: string | ErrorLogContext): ErrorLogContext | undefined {
    if (!context) return undefined;
    if (typeof context === 'string') {
      return { source: context };
    }
    return context;
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    try {
      const stored = await get<ErrorLogEntry[]>(IDB_KEY);
      if (Array.isArray(stored)) {
        this.entries = stored.map((entry) => normalizeStructuredErrorLogEntry(entry));
      }
      this.loaded = true;
    } catch (error) {
      logger.error(
        'ErrorLoggingService: failed to load persisted error log',
        'ErrorLoggingService',
        error,
      );
      this.loaded = true;
    }
  }

  private async persist(): Promise<void> {
    try {
      await set(IDB_KEY, this.entries);
    } catch (error) {
      logger.error(
        'ErrorLoggingService: failed to persist error log',
        'ErrorLoggingService',
        error,
      );
    }
  }

  private trim(): void {
    if (this.entries.length > MAX_ENTRIES) {
      this.entries = this.entries.slice(-MAX_ENTRIES);
    }
  }

  private buildFingerprint(entry: ErrorLogEntry): string {
    return `${entry.code}:${entry.message}:${entry.stack ?? ''}`.slice(0, 200);
  }

  private shouldSuppress(entry: ErrorLogEntry): boolean {
    const fingerprint = this.buildFingerprint(entry);
    const now = Date.now();
    const lastSeen = this.lastFingerprints.get(fingerprint);

    if (lastSeen !== undefined && now - lastSeen < DEDUPE_WINDOW_MS) {
      return true;
    }

    this.lastFingerprints.set(fingerprint, now);

    if (this.lastFingerprints.size > 500) {
      const cutoff = now - DEDUPE_WINDOW_MS;
      for (const [key, timestamp] of this.lastFingerprints.entries()) {
        if (timestamp < cutoff) {
          this.lastFingerprints.delete(key);
        }
      }
    }

    return false;
  }

  private enqueueForIpc(entry: ErrorLogEntry): void {
    if (this.shouldSuppress(entry)) return;

    this.ipcQueue.push(entry);

    if (this.ipcQueue.length > MAX_QUEUE_SIZE) {
      this.ipcQueue.splice(0, this.ipcQueue.length - MAX_QUEUE_SIZE);
    }

    if (this.ipcQueue.length >= IPC_BATCH_SIZE) {
      if (this.ipcFlushTimer !== null) {
        clearTimeout(this.ipcFlushTimer);
        this.ipcFlushTimer = null;
      }
      this.flushIpcQueue();
      return;
    }

    if (this.ipcFlushTimer !== null) {
      clearTimeout(this.ipcFlushTimer);
    }
    this.ipcFlushTimer = setTimeout(() => {
      this.ipcFlushTimer = null;
      this.flushIpcQueue();
    }, IPC_FLUSH_DEBOUNCE_MS);
  }

  private forwardToFile(entry: ErrorLogEntry): void {
    if (this.isElectron) {
      this.enqueueForIpc(entry);
      return;
    }

    try {
      const raw = localStorage.getItem('veo-studio-error-logs') || '[]';
      const stored = JSON.parse(raw) as ErrorLogEntry[];
      stored.push(entry);
      if (stored.length > MAX_ENTRIES) {
        stored.splice(0, stored.length - MAX_ENTRIES);
      }
      localStorage.setItem('veo-studio-error-logs', JSON.stringify(stored));
    } catch {
      // Best-effort logging path.
    }
  }

  private flushIpcQueue(): void {
    if (this.ipcQueue.length === 0 || !this.isElectron) return;

    const batch = this.ipcQueue.slice();
    this.ipcQueue = [];

    try {
      const electron = getElectron();
      electron?.logErrorFireAndForget(batch);
    } catch {
      // Avoid recursive failures in the error pipeline.
    }
  }

  private flushIpcQueueBeforeUnload(): void {
    if (!this.isElectron || this.ipcQueue.length === 0) return;

    if (this.ipcFlushTimer !== null) {
      clearTimeout(this.ipcFlushTimer);
      this.ipcFlushTimer = null;
    }

    const batch = this.ipcQueue.slice();
    this.ipcQueue = [];

    try {
      const electron = getElectron();
      electron?.logErrorFireAndForget(batch);
    } catch {
      try {
        const electron = getElectron();
        electron?.logErrorSync(batch);
      } catch {
        // Final fallback intentionally ignored.
      }
    }
  }

  private async append(entry: ErrorLogEntry): Promise<void> {
    await this.ensureLoaded();
    this.entries.push(entry);
    this.trim();
    await this.persist();
    this.forwardToFile(entry);
  }

  async logError(
    error: Error,
    context?: string | ErrorLogContext,
    code = 'UNEXPECTED_ERROR',
    correlationId?: string,
  ): Promise<void> {
    const entry = createStructuredErrorLogEntry({
      level: 'error',
      code,
      message: error.message,
      stack: error.stack,
      context: this.ensureContext(context),
      correlationId,
    });

    logger.error('ErrorLoggingService: error captured', 'ErrorLoggingService', error);
    await this.append(entry);
  }

  async logUnknownError(
    reason: unknown,
    context?: string | ErrorLogContext,
    code = 'UNEXPECTED_ERROR',
    correlationId?: string,
  ): Promise<void> {
    const normalized =
      reason instanceof Error
        ? reason
        : new Error(typeof reason === 'string' ? reason : 'Unknown error');

    await this.logError(normalized, context, code, correlationId);
  }

  async logWarning(
    message: string,
    context?: string | ErrorLogContext,
    code = 'WARNING',
    correlationId?: string,
  ): Promise<void> {
    const entry = createStructuredErrorLogEntry({
      level: 'warning',
      code,
      message,
      context: this.ensureContext(context),
      correlationId,
    });

    logger.warn('ErrorLoggingService: warning captured', 'ErrorLoggingService', {
      message,
      context,
    });
    await this.append(entry);
  }

  async getRecentErrors(): Promise<ErrorLogEntry[]> {
    await this.ensureLoaded();
    return [...this.entries];
  }

  async clearErrorLog(): Promise<void> {
    try {
      this.entries = [];
      await set(IDB_KEY, []);
      logger.info('Error log cleared', 'ErrorLoggingService');
    } catch (error) {
      logger.error('ErrorLoggingService: failed to clear error log', 'ErrorLoggingService', error);
      throw error;
    }
  }
}

export const errorLoggingService = new ErrorLoggingService();
