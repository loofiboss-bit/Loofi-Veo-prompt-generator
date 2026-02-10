/**
 * Error Logging Service
 * Persists error and warning entries to IndexedDB (up to 100 entries).
 * In Electron, additionally forwards WARN/ERROR entries to the main process
 * via IPC for file-system logging. In web builds, falls back to localStorage.
 * v1.5.0 - Sprint 1: Centralized Error Handling
 */

import { get, set } from 'idb-keyval';
import { logger } from './loggerService';

// ─── Public Interface ────────────────────────────────────────────────────────

/** A single persisted log entry produced by this service. */
export interface ErrorLogEntry {
    /** Unique identifier for this entry */
    id: string;
    /** Unix timestamp in milliseconds */
    timestamp: number;
    /** Severity level */
    level: 'error' | 'warning';
    /** Human-readable description of the problem */
    message: string;
    /** Optional stack trace (errors only) */
    stack?: string;
    /** Optional context string (e.g. service name or component) */
    context?: string;
    /** Optional correlation id for tracing related events */
    correlationId?: string;
}

// ─── Internal Constants ──────────────────────────────────────────────────────

const IDB_KEY = 'error-log';
const MAX_ENTRIES = 100;

// ─── Service Class ───────────────────────────────────────────────────────────

class ErrorLoggingService {
    /** In-memory buffer; initialised from IndexedDB on first use. */
    private entries: ErrorLogEntry[] = [];
    /** Tracks whether we have loaded the persisted log from IDB. */
    private loaded = false;
    /** True when running inside Electron (window.electron is exposed by preload). */
    private readonly isElectron: boolean =
        typeof window !== 'undefined' && (window as any).electron !== undefined;

    // ── IPC Batching (Electron path only) ──────────────────────────────────

    /** Pending entries waiting to be flushed to the Electron main process. */
    private ipcQueue: ErrorLogEntry[] = [];
    /** Debounce timer handle for the scheduled flush. */
    private ipcFlushTimer: ReturnType<typeof setTimeout> | null = null;
    /**
     * Per-fingerprint timestamp of the last IPC send.
     * Used to suppress identical errors within a 5-second window.
     */
    private lastFingerprints: Map<string, number> = new Map();

    constructor() {
        // Flush any pending IPC queue before the page unloads so entries are
        // not silently dropped when the renderer is torn down.
        if (typeof window !== 'undefined') {
            window.addEventListener('beforeunload', () => {
                this.flushIpcQueueBeforeUnload();
            });
        }
    }

    // ── Private Helpers ────────────────────────────────────────────────────

    /** Generate a short unique id. */
    private generateId(): string {
        return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Lazy-load the persisted entries from IndexedDB on first access.
     * Subsequent calls return immediately.
     */
    private async ensureLoaded(): Promise<void> {
        if (this.loaded) return;
        try {
            const stored = await get<ErrorLogEntry[]>(IDB_KEY);
            if (Array.isArray(stored)) {
                this.entries = stored;
            }
            this.loaded = true;
        } catch (error) {
            // Log to the underlying logger but do not re-throw — logging must never crash the app.
            logger.error('ErrorLoggingService: failed to load persisted error log', 'ErrorLoggingService', error);
            this.loaded = true;
        }
    }

    /**
     * Persist the current in-memory entries to IndexedDB.
     * Silently swallows storage errors so callers are never blocked.
     */
    private async persist(): Promise<void> {
        try {
            await set(IDB_KEY, this.entries);
        } catch (error) {
            logger.error('ErrorLoggingService: failed to persist error log', 'ErrorLoggingService', error);
        }
    }

    /**
     * Enforce the MAX_ENTRIES cap by dropping the oldest entries.
     * Called after every append.
     */
    private trim(): void {
        if (this.entries.length > MAX_ENTRIES) {
            this.entries = this.entries.slice(-MAX_ENTRIES);
        }
    }

    /**
     * Forward an entry to Electron main process for file-system logging.
     * In Electron, entries are batched: flushed when the queue reaches 5,
     * or after a 2000 ms debounce — whichever comes first.
     * Identical entries (same message + stack prefix) are suppressed for 5 s.
     * Falls back to localStorage in web builds (no batching).
     */
    private forwardToFile(entry: ErrorLogEntry): void {
        if (this.isElectron) {
            // ── Deduplication ──────────────────────────────────────────────
            const fingerprint = `${entry.message}:${entry.stack ?? ''}`.slice(0, 100);
            const now = Date.now();
            const lastSeen = this.lastFingerprints.get(fingerprint);
            if (lastSeen !== undefined && now - lastSeen < 5000) {
                // Same error within the suppression window — skip.
                return;
            }
            this.lastFingerprints.set(fingerprint, now);

            // ── Enqueue ────────────────────────────────────────────────────
            this.ipcQueue.push(entry);

            if (this.ipcQueue.length >= 5) {
                // Flush immediately when the batch threshold is reached.
                if (this.ipcFlushTimer !== null) {
                    clearTimeout(this.ipcFlushTimer);
                    this.ipcFlushTimer = null;
                }
                this.flushIpcQueue();
            } else {
                // Schedule a debounced flush.
                if (this.ipcFlushTimer !== null) {
                    clearTimeout(this.ipcFlushTimer);
                }
                this.ipcFlushTimer = setTimeout(() => {
                    this.ipcFlushTimer = null;
                    this.flushIpcQueue();
                }, 2000);
            }
        } else {
            try {
                const raw = localStorage.getItem('veo-studio-error-logs') || '[]';
                const stored: ErrorLogEntry[] = JSON.parse(raw);
                stored.push(entry);
                if (stored.length > MAX_ENTRIES) {
                    stored.splice(0, stored.length - MAX_ENTRIES);
                }
                localStorage.setItem('veo-studio-error-logs', JSON.stringify(stored));
            } catch {
                // Silently ignore localStorage failures.
            }
        }
    }

    /**
     * Flush all queued entries to the Electron main process in a single IPC
     * call. Clears the queue on success or failure.
     * Called either when the batch threshold is hit or the debounce fires.
     */
    private flushIpcQueue(): void {
        if (this.ipcQueue.length === 0) return;
        const batch = this.ipcQueue.slice();
        this.ipcQueue = [];
        try {
            (window as any).electron.logError(batch);
        } catch {
            // Silently ignore IPC failures — avoid infinite error loops.
        }
    }

    /**
     * Unload-safe best-effort flush:
     * 1) fire-and-forget send (non-blocking)
     * 2) synchronous fallback only if send path is unavailable
     */
    private flushIpcQueueBeforeUnload(): void {
        if (!this.isElectron || this.ipcQueue.length === 0) return;

        if (this.ipcFlushTimer !== null) {
            clearTimeout(this.ipcFlushTimer);
            this.ipcFlushTimer = null;
        }

        const batch = this.ipcQueue.slice();
        this.ipcQueue = [];

        try {
            (window as any).electron.logErrorFireAndForget(batch);
            return;
        } catch {
            // Fall through to sync best-effort fallback.
        }

        try {
            (window as any).electron.logErrorSync(batch);
        } catch {
            // Silently ignore IPC failures — unloading must continue.
        }
    }

    /**
     * Core append logic shared by logError and logWarning.
     */
    private async append(entry: ErrorLogEntry): Promise<void> {
        await this.ensureLoaded();
        this.entries.push(entry);
        this.trim();
        await this.persist();
        this.forwardToFile(entry);
    }

    // ── Public API ─────────────────────────────────────────────────────────

    /**
     * Log an Error instance at the 'error' level.
     * @param error   The caught Error object.
     * @param context Optional label identifying the call site (e.g. service name).
     */
    async logError(error: Error, context?: string): Promise<void> {
        const entry: ErrorLogEntry = {
            id: this.generateId(),
            timestamp: Date.now(),
            level: 'error',
            message: error.message,
            stack: error.stack,
            context,
        };

        logger.error('ErrorLoggingService: error captured', 'ErrorLoggingService', error);

        await this.append(entry);
    }

    /**
     * Log a plain warning message at the 'warning' level.
     * @param message Human-readable warning description.
     * @param context Optional label identifying the call site.
     */
    async logWarning(message: string, context?: string): Promise<void> {
        const entry: ErrorLogEntry = {
            id: this.generateId(),
            timestamp: Date.now(),
            level: 'warning',
            message,
            context,
        };

        logger.warn('ErrorLoggingService: warning captured', 'ErrorLoggingService', { message, context });

        await this.append(entry);
    }

    /**
     * Return a copy of all in-memory error log entries, newest last.
     * Triggers a lazy load from IndexedDB if not yet initialised.
     */
    async getRecentErrors(): Promise<ErrorLogEntry[]> {
        await this.ensureLoaded();
        return [...this.entries];
    }

    /**
     * Delete all error log entries from memory and IndexedDB.
     */
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

// ─── Singleton Export ────────────────────────────────────────────────────────

export const errorLoggingService = new ErrorLoggingService();
