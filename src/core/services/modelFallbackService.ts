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
    models: ['veo-3.1-generate-preview', 'veo-3.1-fast-generate-preview'],
    endpointMap: {
      'veo-3.1-generate-preview': 'veo-video-quality',
      'veo-3.1-fast-generate-preview': 'veo-video-fast',
    },
  },
  {
    id: 'video-generation-fast',
    label: 'Video Generation (Fast)',
    models: ['veo-3.1-fast-generate-preview', 'veo-3.1-generate-preview'],
    endpointMap: {
      'veo-3.1-fast-generate-preview': 'veo-video-fast',
      'veo-3.1-generate-preview': 'veo-video-quality',
    },
  },
  {
    id: 'prompt-generation',
    label: 'Prompt Generation',
    models: [
      'gemini-3-pro-preview',
      'gemini-2.5-pro-preview-05-06',
      'gemini-2.5-flash-preview-05-20',
      'gemini-2.0-flash',
    ],
    endpointMap: {
      'gemini-3-pro-preview': 'gemini-prompt',
      'gemini-2.5-pro-preview-05-06': 'gemini-prompt',
      'gemini-2.5-flash-preview-05-20': 'gemini-prompt-flash',
      'gemini-2.0-flash': 'gemini-prompt-flash',
    },
  },
  {
    id: 'vision-analysis',
    label: 'Vision Analysis',
    models: ['gemini-3-pro-preview', 'gemini-2.5-flash-preview-05-20'],
    endpointMap: {
      'gemini-3-pro-preview': 'gemini-vision',
      'gemini-2.5-flash-preview-05-20': 'gemini-vision-flash',
    },
  },
  {
    id: 'audio-processing',
    label: 'Audio Processing',
    models: ['gemini-3-pro-preview', 'gemini-2.5-flash-preview-05-20'],
    endpointMap: {
      'gemini-3-pro-preview': 'gemini-audio',
      'gemini-2.5-flash-preview-05-20': 'gemini-audio-flash',
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

    const primaryModelId = chain.models[0];

    for (let i = 0; i < chain.models.length; i++) {
      const modelId = chain.models[i];
      const endpointId = chain.endpointMap[modelId];

      // If no endpoint mapping, assume it's available
      if (!endpointId) {
        return this.createResult(modelId, i, primaryModelId);
      }

      // Check if circuit breaker allows execution
      const canExecute = circuitBreakerService.canExecute(endpointId);
      if (canExecute) {
        const result = this.createResult(modelId, i, primaryModelId);
        if (i > 0) {
          logger.info(
            `[ModelFallback] Fallback activated: ${primaryModelId} → ${modelId} (chain: ${chainId})`,
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
      `[ModelFallback] All models in chain "${chainId}" have open circuits. Using primary: ${primaryModelId}`,
    );
    return this.createResult(primaryModelId, 0, primaryModelId);
  }

  /**
   * Select a model for a specific model ID by finding the chain it belongs to.
   * If the requested model's circuit is open, falls back through its chain.
   */
  selectModelForId(modelId: string): FallbackResult {
    // Find a chain containing this model as primary
    for (const chain of this.chains.values()) {
      if (chain.models[0] === modelId) {
        const result = this.selectModel(chain.id);
        if (result) return result;
      }
    }

    // Find any chain containing this model
    for (const chain of this.chains.values()) {
      if (chain.models.includes(modelId)) {
        const result = this.selectModel(chain.id);
        if (result) return result;
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
  ): FallbackResult {
    return {
      modelId,
      isFallback: chainIndex > 0,
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
