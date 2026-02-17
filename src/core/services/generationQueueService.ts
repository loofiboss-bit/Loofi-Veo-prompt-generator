/**
 * Generation Queue Service
 * Unified offline-aware queue for all generation requests (video, prompt, image, audio).
 * Persists to IndexedDB. Defers execution when offline and auto-resumes when online.
 * Integrates with circuit breaker, health monitor, and cost tracking.
 *
 * Follows ADR-002: Singleton pattern with getInstance()
 *
 * @module generationQueueService
 * @since v2.5.0
 */

import { createStore, get, set } from 'idb-keyval';
import { logger } from './loggerService';
import { apiHealthMonitorService } from './apiHealthMonitorService';
import { costTrackingService } from './costTrackingService';
import type { GenerationQueueItem, GenerationQueueItemStatus, CostEstimate } from '@core/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const IDB_STORE = createStore('veo-db', 'generation-queue');
const IDB_KEY = 'generation-queue-v1';
const MAX_CONCURRENT = 2;
const MAX_RETRIES = 3;
const MAX_HISTORY_ITEMS = 100;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Executor function for a generation type */
export interface GenerationExecutor {
  /**
   * Execute a generation request.
   * Should call `onProgress` periodically with 0–100.
   * Return value is stored as the item's result.
   */
  execute(
    item: GenerationQueueItem,
    onProgress: (progress: number) => void,
    signal: AbortSignal,
  ): Promise<unknown>;
}

type QueueListener = (items: GenerationQueueItem[]) => void;

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

class GenerationQueueService {
  private static instance: GenerationQueueService;

  private items: GenerationQueueItem[] = [];
  private executors = new Map<string, GenerationExecutor>();
  private abortControllers = new Map<string, AbortController>();
  private listeners = new Set<QueueListener>();
  private activeCount = 0;
  private isProcessing = false;
  private hydrated = false;
  private onlineUnsubscribe: (() => void) | null = null;

  private constructor() {
    // Listen for online status changes to resume queued offline items
    if (typeof window !== 'undefined') {
      const onOnline = () => this.onNetworkOnline();
      window.addEventListener('online', onOnline);
      this.onlineUnsubscribe = () => window.removeEventListener('online', onOnline);
    }
  }

  static getInstance(): GenerationQueueService {
    if (!GenerationQueueService.instance) {
      GenerationQueueService.instance = new GenerationQueueService();
    }
    return GenerationQueueService.instance;
  }

  // ── Hydration ────────────────────────────────────────────────────────

  /** Restore persisted queue from IndexedDB */
  async hydrate(): Promise<void> {
    if (this.hydrated) return;
    try {
      const stored = await get<GenerationQueueItem[]>(IDB_KEY, IDB_STORE);
      if (stored) {
        // Re-queue items that were active when the app closed
        this.items = stored.map((item) => {
          if (item.status === 'active') {
            return { ...item, status: 'pending' as GenerationQueueItemStatus };
          }
          return item;
        });
        logger.info(`[GenerationQueue] Hydrated ${this.items.length} item(s)`);
      }
    } catch (err) {
      logger.warn('[GenerationQueue] Failed to hydrate from IDB', err);
    }
    this.hydrated = true;
    // Try to process any pending items
    this.processNext();
  }

  /** Cleanup resources */
  destroy(): void {
    this.onlineUnsubscribe?.();
  }

  // ── Executor Registration ────────────────────────────────────────────

  /** Register an executor for a generation type */
  registerExecutor(type: string, executor: GenerationExecutor): void {
    this.executors.set(type, executor);
    logger.debug(`[GenerationQueue] Registered executor: ${type}`);
  }

  // ── Enqueue ──────────────────────────────────────────────────────────

  /** Add a generation request to the queue */
  enqueue(params: {
    type: 'video' | 'prompt' | 'image' | 'audio';
    label: string;
    payload: unknown;
    priority?: number;
    costEstimate?: CostEstimate;
  }): GenerationQueueItem {
    const isOnline = apiHealthMonitorService.getIsOnline();

    const item: GenerationQueueItem = {
      id: crypto.randomUUID(),
      type: params.type,
      label: params.label,
      status: isOnline ? 'pending' : 'waiting-online',
      priority: params.priority ?? 0,
      progress: 0,
      payload: params.payload,
      costEstimate: params.costEstimate,
      retryCount: 0,
      queuedOffline: !isOnline,
      createdAt: Date.now(),
    };

    this.items.push(item);
    this.sortByPriority();
    this.notifyListeners();
    this.persist();

    logger.info(
      `[GenerationQueue] Enqueued: ${item.label} (${item.type}, ${isOnline ? 'online' : 'offline'})`,
    );

    // If online, start processing
    if (isOnline) {
      this.processNext();
    }

    return item;
  }

  // ── Cancel / Retry ───────────────────────────────────────────────────

  /** Cancel a queued or active item */
  cancel(itemId: string): void {
    const item = this.items.find((i) => i.id === itemId);
    if (!item) return;

    if (item.status === 'active') {
      const ac = this.abortControllers.get(itemId);
      if (ac) {
        ac.abort();
        this.abortControllers.delete(itemId);
      }
    }

    item.status = 'cancelled';
    item.completedAt = Date.now();
    this.notifyListeners();
    this.persist();
    logger.info(`[GenerationQueue] Cancelled: ${item.label}`);
  }

  /** Retry a failed item */
  retry(itemId: string): void {
    const item = this.items.find((i) => i.id === itemId);
    if (!item || item.status !== 'failed') return;

    item.status = 'pending';
    item.error = undefined;
    item.progress = 0;
    item.retryCount++;
    this.notifyListeners();
    this.persist();
    this.processNext();
    logger.info(`[GenerationQueue] Retrying: ${item.label} (attempt ${item.retryCount})`);
  }

  /** Remove a completed/failed/cancelled item from history */
  remove(itemId: string): void {
    this.items = this.items.filter((i) => i.id !== itemId);
    this.notifyListeners();
    this.persist();
  }

  /** Clear all completed/failed/cancelled items */
  clearHistory(): void {
    this.items = this.items.filter(
      (i) => i.status === 'pending' || i.status === 'active' || i.status === 'waiting-online',
    );
    this.notifyListeners();
    this.persist();
  }

  // ── Queries ──────────────────────────────────────────────────────────

  /** Get all queue items */
  getItems(): GenerationQueueItem[] {
    return [...this.items];
  }

  /** Get items by status */
  getItemsByStatus(status: GenerationQueueItemStatus): GenerationQueueItem[] {
    return this.items.filter((i) => i.status === status);
  }

  /** Get count of active items */
  getActiveCount(): number {
    return this.activeCount;
  }

  /** Get count of items waiting for online */
  getOfflinePendingCount(): number {
    return this.items.filter((i) => i.status === 'waiting-online').length;
  }

  /** Check if any items are queued or active */
  isActive(): boolean {
    return this.items.some((i) => i.status === 'pending' || i.status === 'active');
  }

  // ── Event System ─────────────────────────────────────────────────────

  /** Subscribe to queue changes */
  subscribe(listener: QueueListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // ── Internals ────────────────────────────────────────────────────────

  private async processNext(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (this.activeCount < MAX_CONCURRENT) {
        const nextItem = this.items.find((i) => i.status === 'pending');
        if (!nextItem) break;

        // Check online status before processing
        if (!apiHealthMonitorService.getIsOnline()) {
          nextItem.status = 'waiting-online';
          this.notifyListeners();
          this.persist();
          break;
        }

        await this.executeItem(nextItem);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async executeItem(item: GenerationQueueItem): Promise<void> {
    const executor = this.executors.get(item.type);
    if (!executor) {
      logger.warn(`[GenerationQueue] No executor registered for type: ${item.type}`);
      item.status = 'failed';
      item.error = `No executor registered for type: ${item.type}`;
      item.completedAt = Date.now();
      this.notifyListeners();
      this.persist();
      return;
    }

    // Mark as active
    item.status = 'active';
    item.startedAt = Date.now();
    this.activeCount++;
    this.notifyListeners();
    this.persist();

    // Create abort controller
    const ac = new AbortController();
    this.abortControllers.set(item.id, ac);

    try {
      await executor.execute(
        item,
        (progress) => {
          item.progress = Math.min(100, Math.max(0, progress));
          this.notifyListeners();
        },
        ac.signal,
      );

      // Record cost on completion
      if (item.costEstimate) {
        item.actualCost = costTrackingService.recordEstimatedCost(
          item.costEstimate,
          `${item.type}-generation`,
          item.label,
        );
      }

      item.status = 'completed';
      item.progress = 100;
      item.completedAt = Date.now();
      logger.info(`[GenerationQueue] Completed: ${item.label}`);
    } catch (err) {
      if (ac.signal.aborted) {
        // Already handled in cancel()
        return;
      }

      item.status = 'failed';
      item.error = err instanceof Error ? err.message : String(err);
      item.completedAt = Date.now();

      // Auto-retry if under limit
      if (item.retryCount < MAX_RETRIES) {
        item.retryCount++;
        item.status = 'pending';
        item.error = undefined;
        item.progress = 0;
        item.completedAt = undefined;
        logger.warn(
          `[GenerationQueue] Auto-retrying: ${item.label} (attempt ${item.retryCount}/${MAX_RETRIES})`,
        );
      } else {
        logger.error(`[GenerationQueue] Failed after ${MAX_RETRIES} retries: ${item.label}`, err);
      }
    } finally {
      this.abortControllers.delete(item.id);
      this.activeCount--;
      this.notifyListeners();
      this.persist();

      // Trim completed history
      this.trimHistory();

      // Process next item
      this.processNext();
    }
  }

  private onNetworkOnline(): void {
    logger.info('[GenerationQueue] Network online — resuming offline-queued items');

    let resumed = 0;
    for (const item of this.items) {
      if (item.status === 'waiting-online') {
        item.status = 'pending';
        item.queuedOffline = false;
        resumed++;
      }
    }

    if (resumed > 0) {
      this.notifyListeners();
      this.persist();
      this.processNext();
      logger.info(`[GenerationQueue] Resumed ${resumed} offline-queued item(s)`);
    }
  }

  private sortByPriority(): void {
    this.items.sort((a, b) => {
      // Active items first, then pending/waiting by priority, then completed at the end
      const statusOrder: Record<GenerationQueueItemStatus, number> = {
        active: 0,
        pending: 1,
        'waiting-online': 2,
        failed: 3,
        completed: 4,
        cancelled: 5,
      };
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;
      return b.priority - a.priority; // Higher priority first
    });
  }

  private trimHistory(): void {
    const completed = this.items.filter(
      (i) => i.status === 'completed' || i.status === 'cancelled' || i.status === 'failed',
    );
    if (completed.length > MAX_HISTORY_ITEMS) {
      const toRemove = completed.slice(0, completed.length - MAX_HISTORY_ITEMS);
      const removeIds = new Set(toRemove.map((i) => i.id));
      this.items = this.items.filter((i) => !removeIds.has(i.id));
    }
  }

  private notifyListeners(): void {
    const items = this.getItems();
    for (const listener of this.listeners) {
      try {
        listener(items);
      } catch (err) {
        logger.warn('[GenerationQueue] Listener error', err);
      }
    }
  }

  private async persist(): Promise<void> {
    try {
      await set(IDB_KEY, this.items, IDB_STORE);
    } catch (err) {
      logger.warn('[GenerationQueue] Failed to persist state', err);
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

export const generationQueueService = GenerationQueueService.getInstance();
