/**
 * Cost Tracking Service
 * Estimates per-call costs, logs cost records to IndexedDB,
 * and tracks cumulative session/lifetime costs with budget alerts.
 *
 * Follows ADR-002: Singleton pattern with getInstance()
 *
 * @module costTrackingService
 * @since v2.5.0
 */

import { createStore, get, set, update } from 'idb-keyval';
import { logger } from './loggerService';
import type { CostEstimate, CostRecord, CostTrackingState } from '@core/types';
import { getModel } from '@core/models/catalog';
import { estimateMaximumModelCost, requireUsableCostEstimate } from '@core/models/cost';
import {
  estimateTextCost,
  estimateVideoCost,
  estimateTokenCount,
  getModelPricing,
  TYPICAL_OUTPUT_TOKENS,
  DEFAULT_VIDEO_DURATION_SECONDS,
} from '@core/constants/pricing';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const IDB_STORE = createStore('veo-db', 'cost-tracking');
const IDB_KEY_RECORDS = 'cost-records-v1';
const IDB_KEY_LIFETIME = 'cost-lifetime-v1';
const IDB_KEY_BUDGET = 'cost-budget-v1';
const MAX_RECORDS = 500;
const IDB_KEY_LEDGER = 'cost-ledger-v2';
interface CostLedgerV2 {
  schemaVersion: 2;
  records: CostRecord[];
  seen: string[];
  totalUsd: number;
  monthlyUsd: number;
  monthKey: string;
  legacyCutoff: number;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LifetimeData {
  totalUsd: number;
  monthlyUsd: number;
  monthKey: string; // e.g. "2026-02"
}

type CostListener = (state: CostTrackingState) => void;

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class CostTrackingService {
  private static instance: CostTrackingService;

  private sessionRecords: CostRecord[] = [];
  private sessionTotalUsd = 0;
  private lifetimeTotalUsd = 0;
  private monthlySpentUsd = 0;
  private monthlyBudgetUsd: number | null = null;
  private currentMonthKey = '';
  private listeners = new Set<CostListener>();
  private hydrated = false;
  private hydration: Promise<void> | null = null;
  private pendingWrites: Promise<void> = Promise.resolve();
  private persistenceError: string | undefined;

  private constructor() {
    this.currentMonthKey = this.getMonthKey();
  }

  static getInstance(): CostTrackingService {
    if (!CostTrackingService.instance) {
      CostTrackingService.instance = new CostTrackingService();
    }
    return CostTrackingService.instance;
  }

  // ── Hydration ────────────────────────────────────────────────────────

  /** Restore persisted cost data from IndexedDB */
  async hydrate(): Promise<void> {
    if (this.hydrated) return;
    if (this.hydration) return this.hydration;
    this.hydration = (async () => {
      const [lifetime, budget, records] = await Promise.all([
        get<LifetimeData>(IDB_KEY_LIFETIME, IDB_STORE),
        get<number | null>(IDB_KEY_BUDGET, IDB_STORE),
        get<CostRecord[]>(IDB_KEY_RECORDS, IDB_STORE),
      ]);
      await update<CostLedgerV2>(
        IDB_KEY_LEDGER,
        (stored) =>
          stored ?? {
            schemaVersion: 2,
            records: records ?? [],
            seen: (records ?? []).map((record) => record.sourceJobId ?? record.id),
            totalUsd: lifetime?.totalUsd ?? 0,
            monthlyUsd: lifetime?.monthKey === this.getMonthKey() ? lifetime.monthlyUsd : 0,
            monthKey: this.getMonthKey(),
            // Old totals contain no job identities. Preserve them without replaying old jobs.
            legacyCutoff: lifetime?.totalUsd ? Date.now() : 0,
          },
        IDB_STORE,
      );
      const ledger = await get<CostLedgerV2>(IDB_KEY_LEDGER, IDB_STORE);
      if (ledger) this.applyLedger(ledger);
      if (budget !== undefined) this.monthlyBudgetUsd = budget;
      this.hydrated = true;
      this.persistenceError = undefined;
      this.notifyListeners();
    })()
      .catch((error: unknown) => {
        this.persistenceError = 'Cost history could not be saved or restored.';
        this.notifyListeners();
        throw error;
      })
      .finally(() => {
        this.hydration = null;
      });
    return this.hydration;
  }

  private applyLedger(ledger: CostLedgerV2): void {
    this.lifetimeTotalUsd = ledger.totalUsd;
    this.currentMonthKey = this.getMonthKey();
    this.monthlySpentUsd = ledger.monthKey === this.currentMonthKey ? ledger.monthlyUsd : 0;
  }

  private async commit(record: CostRecord): Promise<boolean> {
    await this.hydrate();
    let added = false;
    await update<CostLedgerV2>(
      IDB_KEY_LEDGER,
      (ledger) => {
        if (!ledger) throw new Error('Cost history is unavailable.');
        const identity = record.sourceJobId ?? record.id;
        if (ledger.seen.includes(identity)) return ledger;
        const migrated = Boolean(record.sourceJobId && record.timestamp <= ledger.legacyCutoff);
        added = !migrated;
        const monthKey = this.getMonthKey();
        const sameMonth = this.getMonthKeyForTime(record.timestamp) === monthKey;
        return {
          ...ledger,
          seen: [...ledger.seen, identity],
          records: migrated ? ledger.records : [...ledger.records, record].slice(-MAX_RECORDS),
          totalUsd: ledger.totalUsd + (migrated ? 0 : record.costUsd),
          monthlyUsd:
            (ledger.monthKey === monthKey ? ledger.monthlyUsd : 0) +
            (!migrated && sameMonth ? record.costUsd : 0),
          monthKey,
        };
      },
      IDB_STORE,
    );
    const ledger = await get<CostLedgerV2>(IDB_KEY_LEDGER, IDB_STORE);
    if (ledger) this.applyLedger(ledger);
    this.persistenceError = undefined;
    this.notifyListeners();
    return added;
  }

  /** Durable idempotency survives route changes, renderer restart and concurrent observers. */
  async recordPaidJobCost(record: Omit<CostRecord, 'id'> & { sourceJobId: string }): Promise<void> {
    const operation = this.pendingWrites
      .catch(() => {})
      .then(async () => {
        const added = await this.commit({
          ...record,
          id: `paid:${record.sourceJobId}`,
          isEstimated: true,
        });
        if (added && !this.sessionRecords.some((item) => item.sourceJobId === record.sourceJobId)) {
          this.sessionRecords.push({
            ...record,
            id: `paid:${record.sourceJobId}`,
            isEstimated: true,
          });
          this.sessionTotalUsd += record.costUsd;
        }
        this.notifyListeners();
      });
    this.pendingWrites = operation.catch((error: unknown) => {
      this.persistenceError = 'Cost history could not be saved or restored.';
      this.notifyListeners();
      logger.warn('[CostTracking] Failed to persist job cost', error);
    });
    return operation;
  }

  async flush(): Promise<void> {
    await this.pendingWrites;
  }

  private getMonthKeyForTime(timestamp: number): string {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  // ── Estimation ───────────────────────────────────────────────────────

  /** Estimate cost before executing a text/prompt API call */
  estimatePromptCost(modelId: string, promptText: string, useCase?: string): CostEstimate {
    const inputTokens = estimateTokenCount(promptText);
    const outputTokens = TYPICAL_OUTPUT_TOKENS[useCase ?? 'prompt-generation'] ?? 300;
    const estimatedCostUsd = estimateTextCost(modelId, inputTokens, outputTokens);
    const model = getModel(modelId);
    if (!model) throw new Error(`No catalog entry exists for ${modelId}.`);
    const audit = estimateMaximumModelCost(model, {
      estimatedInputTokens: inputTokens,
      estimatedOutputTokens: outputTokens,
    });
    requireUsableCostEstimate(audit);

    return {
      modelId,
      estimatedInputTokens: inputTokens,
      estimatedOutputTokens: outputTokens,
      estimatedCostUsd,
      confidence: audit.confidence as 'exact' | 'upper-bound',
      sourceUrl: audit.source.sourceUrl,
      verifiedDate: audit.source.verifiedDate,
      explanation: audit.explanation,
      assumptions: audit.assumptions,
    };
  }

  /** Estimate cost before executing a video generation call */
  estimateVideoGenerationCost(
    modelId: string,
    durationSeconds?: number,
    resolution: '720p' | '1080p' | '4k' = '720p',
  ): CostEstimate {
    const duration = durationSeconds ?? DEFAULT_VIDEO_DURATION_SECONDS;
    const estimatedCostUsd = estimateVideoCost(modelId, duration, resolution);
    const model = getModel(modelId);
    if (!model) throw new Error(`No catalog entry exists for ${modelId}.`);
    const audit = estimateMaximumModelCost(model, {
      videoDurationSeconds: duration,
      videoResolution: resolution,
    });
    requireUsableCostEstimate(audit);

    return {
      modelId,
      estimatedInputTokens: 0,
      estimatedOutputTokens: 0,
      estimatedVideoDurationSeconds: duration,
      estimatedCostUsd,
      confidence: audit.confidence as 'exact' | 'upper-bound',
      sourceUrl: audit.source.sourceUrl,
      verifiedDate: audit.source.verifiedDate,
      explanation: audit.explanation,
      assumptions: audit.assumptions,
    };
  }

  /** Estimate cost for an image generation call */
  estimateImageGenerationCost(
    modelId: string,
    promptText: string,
    resolution: import('@core/models/catalog').ImageResolution = '1k',
  ): CostEstimate {
    const inputTokens = estimateTokenCount(promptText);
    const model = getModel(modelId);
    if (!model) throw new Error(`No catalog entry exists for ${modelId}.`);
    const audit = estimateMaximumModelCost(model, {
      estimatedInputTokens: inputTokens,
      imageCount: 1,
      imageResolution: resolution,
    });
    const estimatedCostUsd = requireUsableCostEstimate(audit);
    return {
      modelId,
      estimatedInputTokens: inputTokens,
      estimatedOutputTokens: 0,
      estimatedCostUsd,
      confidence: audit.confidence as 'exact' | 'upper-bound',
      sourceUrl: audit.source.sourceUrl,
      verifiedDate: audit.source.verifiedDate,
      explanation: audit.explanation,
      assumptions: audit.assumptions,
    };
  }

  // ── Recording ────────────────────────────────────────────────────────

  /** Record the cost of a completed API call */
  recordCost(record: Omit<CostRecord, 'id' | 'timestamp'>): CostRecord {
    const existing =
      record.sourceJobId &&
      this.sessionRecords.find((item) => item.sourceJobId === record.sourceJobId);
    if (existing) return existing;
    const fullRecord: CostRecord = {
      ...record,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };

    this.sessionRecords.push(fullRecord);
    this.sessionTotalUsd += fullRecord.costUsd;
    this.lifetimeTotalUsd += fullRecord.costUsd;
    this.monthlySpentUsd += fullRecord.costUsd;

    // Trim session records
    if (this.sessionRecords.length > MAX_RECORDS) {
      this.sessionRecords = this.sessionRecords.slice(-MAX_RECORDS);
    }

    // Check budget
    this.checkBudget(fullRecord.costUsd);

    this.notifyListeners();
    const write = this.pendingWrites
      .catch(() => {})
      .then(async () => {
        await this.commit(fullRecord);
      });
    this.pendingWrites = write.catch((error: unknown) => {
      this.persistenceError = 'Cost history could not be saved or restored.';
      this.notifyListeners();
      logger.warn('[CostTracking] Failed to persist cost', error);
    });

    logger.debug(
      `[CostTracking] Recorded: $${fullRecord.costUsd.toFixed(6)} for ${fullRecord.modelId} (${fullRecord.description})`,
    );

    return fullRecord;
  }

  /** Record cost from a CostEstimate (estimated data, marks isEstimated=true) */
  recordEstimatedCost(
    estimate: CostEstimate,
    endpointId: string,
    description: string,
    sourceJobId?: string,
  ): CostRecord {
    return this.recordCost({
      sourceJobId,
      modelId: estimate.modelId,
      endpointId,
      inputTokens: estimate.estimatedInputTokens,
      outputTokens: estimate.estimatedOutputTokens,
      videoDurationSeconds: estimate.estimatedVideoDurationSeconds,
      costUsd: estimate.estimatedCostUsd,
      isEstimated: true,
      description,
    });
  }

  // ── Budget ───────────────────────────────────────────────────────────

  /** Set a monthly budget in USD (null to remove) */
  async setMonthlyBudget(budgetUsd: number | null): Promise<void> {
    this.monthlyBudgetUsd = budgetUsd;
    try {
      await set(IDB_KEY_BUDGET, budgetUsd, IDB_STORE);
    } catch (err) {
      logger.warn('[CostTracking] Failed to persist budget', err);
    }
    this.notifyListeners();
  }

  /** Check if spending is within budget */
  isWithinBudget(): boolean {
    this.getState();
    if (this.monthlyBudgetUsd === null) return true;
    return this.monthlySpentUsd < this.monthlyBudgetUsd;
  }

  /** Get remaining budget (null if no budget set) */
  getRemainingBudget(): number | null {
    this.getState();
    if (this.monthlyBudgetUsd === null) return null;
    return Math.max(0, this.monthlyBudgetUsd - this.monthlySpentUsd);
  }

  // ── Queries ──────────────────────────────────────────────────────────

  /** Get the current cost tracking state */
  getState(): CostTrackingState {
    if (this.currentMonthKey !== this.getMonthKey()) {
      this.currentMonthKey = this.getMonthKey();
      this.monthlySpentUsd = 0;
    }
    return {
      sessionRecords: [...this.sessionRecords],
      sessionTotalUsd: this.sessionTotalUsd,
      lifetimeTotalUsd: this.lifetimeTotalUsd,
      monthlyBudgetUsd: this.monthlyBudgetUsd,
      monthlySpentUsd: this.monthlySpentUsd,
      persistenceError: this.persistenceError,
    };
  }

  /** Get session records filtered by model */
  getRecordsByModel(modelId: string): CostRecord[] {
    return this.sessionRecords.filter((r) => r.modelId === modelId);
  }

  /** Check if a model has pricing data available */
  hasPricing(modelId: string): boolean {
    return getModelPricing(modelId) !== undefined;
  }

  /** Reset session tracking (e.g., on app restart) */
  resetSession(): void {
    this.sessionRecords = [];
    this.sessionTotalUsd = 0;
    this.notifyListeners();
  }

  // ── Event System ─────────────────────────────────────────────────────

  /** Subscribe to cost state changes */
  subscribe(listener: CostListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // ── Internals ────────────────────────────────────────────────────────

  private checkBudget(addedCostUsd: number): void {
    if (this.monthlyBudgetUsd === null) return;

    const percentUsed = (this.monthlySpentUsd / this.monthlyBudgetUsd) * 100;

    if (percentUsed >= 100) {
      logger.warn(
        `[CostTracking] Monthly budget exceeded! $${this.monthlySpentUsd.toFixed(2)} / $${this.monthlyBudgetUsd.toFixed(2)}`,
      );
    } else if (percentUsed >= 80) {
      logger.warn(
        `[CostTracking] 80% of monthly budget used: $${this.monthlySpentUsd.toFixed(2)} / $${this.monthlyBudgetUsd.toFixed(2)} (+$${addedCostUsd.toFixed(4)})`,
      );
    }
  }

  private getMonthKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  private notifyListeners(): void {
    const state = this.getState();
    for (const listener of this.listeners) {
      try {
        listener(state);
      } catch (err) {
        logger.warn('[CostTracking] Listener error', err);
      }
    }
  }
}

export const costTrackingService = CostTrackingService.getInstance();
