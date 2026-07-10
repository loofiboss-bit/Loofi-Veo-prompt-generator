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

import { createStore, get, set } from 'idb-keyval';
import { logger } from './loggerService';
import type { CostEstimate, CostRecord, CostTrackingState } from '@core/types';
import {
  estimateTextCost,
  estimateVideoCost,
  estimateImageCost,
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

class CostTrackingService {
  private static instance: CostTrackingService;

  private sessionRecords: CostRecord[] = [];
  private sessionTotalUsd = 0;
  private lifetimeTotalUsd = 0;
  private monthlySpentUsd = 0;
  private monthlyBudgetUsd: number | null = null;
  private currentMonthKey = '';
  private listeners = new Set<CostListener>();
  private hydrated = false;

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
    try {
      const [lifetime, budget] = await Promise.all([
        get<LifetimeData>(IDB_KEY_LIFETIME, IDB_STORE),
        get<number | null>(IDB_KEY_BUDGET, IDB_STORE),
      ]);

      if (lifetime) {
        this.lifetimeTotalUsd = lifetime.totalUsd;
        // Reset monthly if new month
        if (lifetime.monthKey === this.currentMonthKey) {
          this.monthlySpentUsd = lifetime.monthlyUsd;
        } else {
          this.monthlySpentUsd = 0;
        }
      }

      if (budget !== undefined && budget !== null) {
        this.monthlyBudgetUsd = budget;
      }

      logger.info(
        `[CostTracking] Hydrated — lifetime: $${this.lifetimeTotalUsd.toFixed(4)}, monthly: $${this.monthlySpentUsd.toFixed(4)}`,
      );
    } catch (err) {
      logger.warn('[CostTracking] Failed to hydrate from IDB', err);
    }
    this.hydrated = true;
  }

  // ── Estimation ───────────────────────────────────────────────────────

  /** Estimate cost before executing a text/prompt API call */
  estimatePromptCost(modelId: string, promptText: string, useCase?: string): CostEstimate {
    const inputTokens = estimateTokenCount(promptText);
    const outputTokens = TYPICAL_OUTPUT_TOKENS[useCase ?? 'prompt-generation'] ?? 300;
    const estimatedCostUsd = estimateTextCost(modelId, inputTokens, outputTokens);

    return {
      modelId,
      estimatedInputTokens: inputTokens,
      estimatedOutputTokens: outputTokens,
      estimatedCostUsd,
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

    return {
      modelId,
      estimatedInputTokens: 0,
      estimatedOutputTokens: 0,
      estimatedVideoDurationSeconds: duration,
      estimatedCostUsd,
    };
  }

  /** Estimate cost for an image generation call */
  estimateImageGenerationCost(modelId: string): CostEstimate {
    return {
      modelId,
      estimatedInputTokens: 0,
      estimatedOutputTokens: 0,
      estimatedCostUsd: estimateImageCost(modelId),
    };
  }

  // ── Recording ────────────────────────────────────────────────────────

  /** Record the cost of a completed API call */
  recordCost(record: Omit<CostRecord, 'id' | 'timestamp'>): CostRecord {
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
    this.persist();

    logger.debug(
      `[CostTracking] Recorded: $${fullRecord.costUsd.toFixed(6)} for ${fullRecord.modelId} (${fullRecord.description})`,
    );

    return fullRecord;
  }

  /** Record cost from a CostEstimate (estimated data, marks isEstimated=true) */
  recordEstimatedCost(estimate: CostEstimate, endpointId: string, description: string): CostRecord {
    return this.recordCost({
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
    if (this.monthlyBudgetUsd === null) return true;
    return this.monthlySpentUsd < this.monthlyBudgetUsd;
  }

  /** Get remaining budget (null if no budget set) */
  getRemainingBudget(): number | null {
    if (this.monthlyBudgetUsd === null) return null;
    return Math.max(0, this.monthlyBudgetUsd - this.monthlySpentUsd);
  }

  // ── Queries ──────────────────────────────────────────────────────────

  /** Get the current cost tracking state */
  getState(): CostTrackingState {
    return {
      sessionRecords: [...this.sessionRecords],
      sessionTotalUsd: this.sessionTotalUsd,
      lifetimeTotalUsd: this.lifetimeTotalUsd,
      monthlyBudgetUsd: this.monthlyBudgetUsd,
      monthlySpentUsd: this.monthlySpentUsd,
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

  private async persist(): Promise<void> {
    try {
      const lifetimeData: LifetimeData = {
        totalUsd: this.lifetimeTotalUsd,
        monthlyUsd: this.monthlySpentUsd,
        monthKey: this.currentMonthKey,
      };
      await Promise.all([
        set(IDB_KEY_RECORDS, this.sessionRecords.slice(-MAX_RECORDS), IDB_STORE),
        set(IDB_KEY_LIFETIME, lifetimeData, IDB_STORE),
      ]);
    } catch (err) {
      logger.warn('[CostTracking] Failed to persist state', err);
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

export const costTrackingService = CostTrackingService.getInstance();
