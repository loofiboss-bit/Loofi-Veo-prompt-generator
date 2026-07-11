/**
 * Model Fallback Service
 * Config-driven fallback chains per use case. When the primary model fails
 * (circuit breaker open or repeated failures), automatically tries the next
 * model in the chain.
 *
 * Follows ADR-002: Singleton pattern with getInstance()
 *
 * @module modelFallbackService
 * @since v2.5.0
 */

import { logger } from './loggerService';
import { circuitBreakerService } from './circuitBreakerService';
import { isShutdownModel } from '@core/models/catalog';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Fallback chain configuration for a use case */
export interface FallbackChain {
  /** Unique identifier for the chain (e.g., 'video-generation', 'prompt-generation') */
  id: string;
  /** Display name */
  label: string;
  /** Ordered list of model IDs to try (first = primary) */
  models: string[];
  /** Map model ID → circuit breaker endpoint ID */
  endpointMap: Record<string, string>;
}

/** Result of a fallback-aware model selection */
export interface FallbackResult {
  /** The model selected for execution */
  modelId: string;
  /** Whether this is the primary model or a fallback */
  isFallback: boolean;
  /** Index in the fallback chain (0 = primary) */
  chainIndex: number;
  /** The original primary model that was requested */
  primaryModelId: string;
}

type FallbackListener = (result: FallbackResult) => void;

// ---------------------------------------------------------------------------
// Default Fallback Chains
// ---------------------------------------------------------------------------

const DEFAULT_CHAINS: FallbackChain[] = [
  {
    id: 'video-generation-quality',
    label: 'Video Generation (Quality)',
    models: ['veo-3.1-quality', 'veo-3.1-fast'],
    endpointMap: {
      'veo-3.1-quality': 'veo-video-quality',
      'veo-3.1-fast': 'veo-video-fast',
    },
  },
  {
    id: 'video-generation-fast',
    label: 'Video Generation (Fast)',
    models: ['veo-3.1-fast', 'veo-3.1-quality', 'veo-3.1-lite'],
    endpointMap: {
      'veo-3.1-fast': 'veo-video-fast',
      'veo-3.1-quality': 'veo-video-quality',
      'veo-3.1-lite': 'veo-video-lite',
    },
  },
  {
    id: 'prompt-generation',
    label: 'Prompt Generation',
    models: ['gemini-3.5-flash', 'gemini-3.1-pro', 'gemini-3.1-flash-lite'],
    endpointMap: {
      'gemini-3.5-flash': 'gemini-prompt-flash',
      'gemini-3.1-pro': 'gemini-prompt',
      'gemini-3.1-flash-lite': 'gemini-prompt-lite',
    },
  },
  {
    id: 'vision-analysis',
    label: 'Vision Analysis',
    models: ['gemini-3.5-flash', 'gemini-3.1-pro', 'gemini-3.1-flash-lite'],
    endpointMap: {
      'gemini-3.5-flash': 'gemini-vision-flash',
      'gemini-3.1-pro': 'gemini-vision',
      'gemini-3.1-flash-lite': 'gemini-vision-lite',
    },
  },
  {
    id: 'audio-processing',
    label: 'Audio Processing',
    models: ['gemini-3.5-flash', 'gemini-3.1-pro', 'gemini-3.1-flash-lite'],
    endpointMap: {
      'gemini-3.5-flash': 'gemini-audio-flash',
      'gemini-3.1-pro': 'gemini-audio',
      'gemini-3.1-flash-lite': 'gemini-audio-lite',
    },
  },
];

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

class ModelFallbackService {
  private static instance: ModelFallbackService;

  private chains = new Map<string, FallbackChain>();
  private listeners = new Set<FallbackListener>();

  private constructor() {
    // Register default chains
    for (const chain of DEFAULT_CHAINS) {
      this.chains.set(chain.id, chain);
    }
  }

  static getInstance(): ModelFallbackService {
    if (!ModelFallbackService.instance) {
      ModelFallbackService.instance = new ModelFallbackService();
    }
    return ModelFallbackService.instance;
  }

  // ── Chain Management ─────────────────────────────────────────────────

  /** Register or update a fallback chain */
  registerChain(chain: FallbackChain): void {
    const shutdownModel = chain.models.find((modelId) => isShutdownModel(modelId));
    if (shutdownModel) {
      throw new Error(`Cannot register shut-down model in fallback chain: ${shutdownModel}`);
    }
    this.chains.set(chain.id, chain);
    logger.debug(`[ModelFallback] Registered chain: ${chain.id}`);
  }

  /** Get a chain by ID */
  getChain(chainId: string): FallbackChain | undefined {
    return this.chains.get(chainId);
  }

  /** Get all registered chains */
  getAllChains(): FallbackChain[] {
    return Array.from(this.chains.values());
  }

  // ── Model Selection ──────────────────────────────────────────────────

  /**
   * Select the best available model from a fallback chain.
   * Checks circuit breaker state for each model and returns the first
   * one whose circuit is not open.
   */
  selectModel(chainId: string): FallbackResult | null {
    const chain = this.chains.get(chainId);
    if (!chain || chain.models.length === 0) {
      logger.warn(`[ModelFallback] No chain found for: ${chainId}`);
      return null;
    }

    return this.selectFromChain(chain, 0);
  }

  private selectFromChain(chain: FallbackChain, startIndex: number): FallbackResult {
    const primaryModelId = chain.models[startIndex];

    for (let i = startIndex; i < chain.models.length; i++) {
      const modelId = chain.models[i];
      const endpointId = chain.endpointMap[modelId];

      // If no endpoint mapping, assume it's available
      if (!endpointId) {
        return this.createResult(modelId, i, primaryModelId, i > startIndex);
      }

      // Check if circuit breaker allows execution
      const canExecute = circuitBreakerService.canExecute(endpointId);
      if (canExecute) {
        const result = this.createResult(modelId, i, primaryModelId, i > startIndex);
        if (i > startIndex) {
          logger.info(
            `[ModelFallback] Fallback activated: ${primaryModelId} → ${modelId} (chain: ${chain.id})`,
          );
          this.notifyListeners(result);
        }
        return result;
      }

      logger.debug(
        `[ModelFallback] Circuit open for ${modelId} (endpoint: ${endpointId}), trying next...`,
      );
    }

    // All models exhausted — return primary anyway (let circuit breaker handle the error)
    logger.warn(
      `[ModelFallback] All models in chain "${chain.id}" have open circuits. Using primary: ${primaryModelId}`,
    );
    return this.createResult(primaryModelId, startIndex, primaryModelId, false);
  }

  /**
   * Select a model for a specific model ID by finding the chain it belongs to.
   * If the requested model's circuit is open, falls back through its chain.
   */
  selectModelForId(modelId: string): FallbackResult {
    // Start at the explicitly requested model; never silently upgrade/downgrade
    // to an earlier entry in the chain.
    for (const chain of this.chains.values()) {
      const requestedIndex = chain.models.indexOf(modelId);
      if (requestedIndex >= 0) {
        return this.selectFromChain(chain, requestedIndex);
      }
    }

    // No chain found — return the model as-is
    return {
      modelId,
      isFallback: false,
      chainIndex: 0,
      primaryModelId: modelId,
    };
  }

  // ── Event System ─────────────────────────────────────────────────────

  /** Subscribe to fallback activation events */
  subscribe(listener: FallbackListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // ── Internals ────────────────────────────────────────────────────────

  private createResult(
    modelId: string,
    chainIndex: number,
    primaryModelId: string,
    isFallback = chainIndex > 0,
  ): FallbackResult {
    return {
      modelId,
      isFallback,
      chainIndex,
      primaryModelId,
    };
  }

  private notifyListeners(result: FallbackResult): void {
    for (const listener of this.listeners) {
      try {
        listener(result);
      } catch (err) {
        logger.warn('[ModelFallback] Listener error', err);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

export const modelFallbackService = ModelFallbackService.getInstance();
