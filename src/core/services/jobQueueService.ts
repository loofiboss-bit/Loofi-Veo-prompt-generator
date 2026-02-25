/**
 * Job Queue Service
 * Unified queue for background jobs: export, batch prompt generation, analysis, etc.
 * Follows ADR-002: Singleton pattern with getInstance()
 *
 * @module jobQueueService
 * @since v1.8.0
 */

import { get, set } from 'idb-keyval';
import { logger } from './loggerService';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type JobType = 'export' | 'batch-prompt' | 'analysis' | 'video-generation';
export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type JobPriority = 'low' | 'normal' | 'high';

export interface Job<TResult = unknown> {
  id: string;
  type: JobType;
  label: string;
  status: JobStatus;
  priority: JobPriority;
  progress: number; // 0–100
  result?: TResult;
  error?: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  /** Opaque payload the executor receives */
  payload?: unknown;
  /** True when job was enqueued while offline and awaits replay */
  queuedOffline?: boolean;
}

export interface JobExecutor<TResult = unknown> {
  /**
   * Run the job. Implementations should call `onProgress` periodically.
   * Throw to signal failure. Return value becomes `job.result`.
   */
  execute(
    job: Job<TResult>,
    onProgress: (pct: number) => void,
    signal: AbortSignal,
  ): Promise<TResult>;
}

type JobListener = (jobs: Job[]) => void;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const IDB_KEY = 'job-queue-v1';
const MAX_HISTORY = 50;

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

class JobQueueService {
  private static instance: JobQueueService;

  private jobs: Job[] = [];
  private executors = new Map<JobType, JobExecutor>();
  private abortControllers = new Map<string, AbortController>();
  private listeners = new Set<JobListener>();
  private isProcessing = false;
  private hydrated = false;
  private isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private networkListenersAttached = false;

  private constructor() {
    if (typeof window !== 'undefined' && !this.networkListenersAttached) {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
      this.networkListenersAttached = true;
    }
  }

  static getInstance(): JobQueueService {
    if (!JobQueueService.instance) {
      JobQueueService.instance = new JobQueueService();
    }
    return JobQueueService.instance;
  }

  // ── Hydration ──────────────────────────────────────────────────────────

  /** Load persisted queue from IndexedDB. Safe to call multiple times. */
  async hydrate(): Promise<void> {
    if (this.hydrated) return;
    try {
      const stored = await get<Job[]>(IDB_KEY);
      if (stored) {
        // Reset any "processing" jobs to "queued" (stale from crash)
        this.jobs = stored.map((j) => (j.status === 'processing' ? { ...j, status: 'queued' } : j));
        logger.info(`JobQueue hydrated: ${this.jobs.length} jobs`);
      }
    } catch (err) {
      logger.error('JobQueue hydration failed', err);
    }
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    this.hydrated = true;
    this.notify();
    // Resume queue if there are pending jobs
    void this.processNext();
  }

  // ── Registration ───────────────────────────────────────────────────────

  /** Register an executor for a given job type */
  registerExecutor<T>(type: JobType, executor: JobExecutor<T>): void {
    this.executors.set(type, executor as JobExecutor);
    logger.debug(`JobQueue executor registered: ${type}`);
  }

  // ── Enqueueing ─────────────────────────────────────────────────────────

  /** Enqueue a new job. Returns the job id. */
  async enqueue<T>(
    type: JobType,
    label: string,
    payload?: unknown,
    priority: JobPriority = 'normal',
  ): Promise<string> {
    const currentlyOnline = typeof navigator !== 'undefined' ? navigator.onLine : this.isOnline;
    this.isOnline = currentlyOnline;

    const job: Job<T> = {
      id: `job-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      type,
      label,
      status: 'queued',
      priority,
      progress: 0,
      createdAt: Date.now(),
      payload,
      queuedOffline: !currentlyOnline,
    };
    this.jobs.push(job);
    await this.persist();
    this.notify();
    logger.info(`Job enqueued: ${label} [${type}] id=${job.id}`);
    void this.processNext();
    return job.id;
  }

  // ── Cancellation ───────────────────────────────────────────────────────

  /** Cancel a queued or processing job */
  async cancel(jobId: string): Promise<boolean> {
    const job = this.jobs.find((j) => j.id === jobId);
    if (!job) return false;
    if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
      return false;
    }

    // Abort if running
    const controller = this.abortControllers.get(jobId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(jobId);
    }

    job.status = 'cancelled';
    job.completedAt = Date.now();
    await this.persist();
    this.notify();
    logger.info(`Job cancelled: ${job.label} id=${jobId}`);
    return true;
  }

  /** Retry a failed or cancelled job */
  async retry(jobId: string): Promise<boolean> {
    const job = this.jobs.find((j) => j.id === jobId);
    if (!job || (job.status !== 'failed' && job.status !== 'cancelled')) return false;

    job.status = 'queued';
    job.progress = 0;
    job.error = undefined;
    job.result = undefined;
    job.completedAt = undefined;
    job.startedAt = undefined;

    await this.persist();
    this.notify();
    logger.info(`Job retried: ${job.label} id=${jobId}`);
    void this.processNext();
    return true;
  }

  // ── Removal ────────────────────────────────────────────────────────────

  /** Remove a completed / failed / cancelled job from the list */
  async remove(jobId: string): Promise<boolean> {
    const idx = this.jobs.findIndex((j) => j.id === jobId);
    if (idx === -1) return false;
    const job = this.jobs[idx];
    if (job.status === 'processing') return false; // can't remove active
    this.jobs.splice(idx, 1);
    await this.persist();
    this.notify();
    return true;
  }

  /** Clear all terminal (completed/failed/cancelled) jobs */
  async clearHistory(): Promise<void> {
    this.jobs = this.jobs.filter((j) => j.status === 'queued' || j.status === 'processing');
    await this.persist();
    this.notify();
  }

  // ── Queries ────────────────────────────────────────────────────────────

  getJobs(): ReadonlyArray<Job> {
    return this.jobs;
  }

  getJob(id: string): Job | undefined {
    return this.jobs.find((j) => j.id === id);
  }

  getActiveJobs(): Job[] {
    return this.jobs.filter((j) => j.status === 'processing');
  }

  getQueuedJobs(): Job[] {
    return this.jobs.filter((j) => j.status === 'queued');
  }

  getPendingCount(): number {
    return this.jobs.filter((j) => j.status === 'queued' || j.status === 'processing').length;
  }

  /** Explicitly sync queue connectivity state (useful for tests and app-level adapters). */
  setNetworkOnline(online: boolean): void {
    this.isOnline = online;

    if (!online) {
      logger.info('JobQueue paused: offline mode enabled');
      this.notify();
      return;
    }

    let resumedCount = 0;
    for (const job of this.jobs) {
      if (job.status === 'queued' && job.queuedOffline) {
        job.queuedOffline = false;
        resumedCount += 1;
      }
    }

    if (resumedCount > 0) {
      logger.info(`JobQueue resumed ${resumedCount} offline-queued job(s)`);
      void this.persist();
      this.notify();
    }

    void this.processNext();
  }

  // ── Subscription ───────────────────────────────────────────────────────

  /** Subscribe to job list changes. Returns unsubscribe function. */
  subscribe(listener: JobListener): () => void {
    this.listeners.add(listener);
    // Deliver current state immediately
    listener([...this.jobs]);
    return () => this.listeners.delete(listener);
  }

  // ── Processing Engine ──────────────────────────────────────────────────

  private async processNext(): Promise<void> {
    if (this.isProcessing) return;
    if (!this.isOnline) return;

    // Find highest-priority queued job
    const priorityOrder: Record<JobPriority, number> = { high: 0, normal: 1, low: 2 };
    const next = [...this.jobs]
      .filter((j) => j.status === 'queued')
      .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])[0];

    if (!next) return;

    const executor = this.executors.get(next.type);
    if (!executor) {
      logger.warn(`No executor for job type: ${next.type} id=${next.id}`);
      return;
    }

    this.isProcessing = true;
    next.status = 'processing';
    next.startedAt = Date.now();

    const controller = new AbortController();
    this.abortControllers.set(next.id, controller);

    await this.persist();
    this.notify();

    try {
      const result = await executor.execute(
        next,
        (pct: number) => {
          next.progress = Math.min(100, Math.max(0, pct));
          this.notify(); // Don't persist on every progress tick (perf)
        },
        controller.signal,
      );

      next.result = result;
      next.status = 'completed';
      next.progress = 100;
      next.completedAt = Date.now();
      const durationMs = next.completedAt - (next.startedAt ?? next.createdAt);
      logger.info(`Job completed: ${next.label} (${durationMs}ms)`);
    } catch (err) {
      if (controller.signal.aborted) {
        next.status = 'cancelled';
      } else {
        next.status = 'failed';
        next.error = err instanceof Error ? err.message : String(err);
        logger.error(`Job failed: ${next.label}`, err);
      }
      next.completedAt = Date.now();
    } finally {
      this.abortControllers.delete(next.id);
      this.isProcessing = false;
      this.trimHistory();
      await this.persist();
      this.notify();
      // Process next in queue
      void this.processNext();
    }
  }

  // ── Internals ──────────────────────────────────────────────────────────

  private notify(): void {
    const snapshot = [...this.jobs];
    this.listeners.forEach((fn) => fn(snapshot));
  }

  private handleOnline = (): void => {
    this.setNetworkOnline(true);
  };

  private handleOffline = (): void => {
    this.setNetworkOnline(false);
  };

  private async persist(): Promise<void> {
    try {
      // Persist jobs without transient result blobs
      const serializable = this.jobs.map(({ result, ...rest }) => ({
        ...rest,
        // Only persist primitive results (not Blobs / large objects)
        result: result && typeof result !== 'object' ? result : undefined,
      }));
      await set(IDB_KEY, serializable);
    } catch (err) {
      logger.error('JobQueue persist failed', err);
    }
  }

  private trimHistory(): void {
    const terminal = this.jobs.filter(
      (j) => j.status === 'completed' || j.status === 'failed' || j.status === 'cancelled',
    );
    if (terminal.length > MAX_HISTORY) {
      // Remove oldest terminal jobs
      const toRemove = terminal
        .sort((a, b) => (a.completedAt ?? 0) - (b.completedAt ?? 0))
        .slice(0, terminal.length - MAX_HISTORY);
      const removeIds = new Set(toRemove.map((j) => j.id));
      this.jobs = this.jobs.filter((j) => !removeIds.has(j.id));
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

export const jobQueueService = JobQueueService.getInstance();
