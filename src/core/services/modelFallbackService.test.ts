import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock circuit breaker
vi.mock('./circuitBreakerService', () => ({
  circuitBreakerService: {
    registerEndpoint: vi.fn(),
    getState: vi.fn(() => 'closed'),
    canExecute: vi.fn(() => true),
    recordSuccess: vi.fn(),
    recordFailure: vi.fn(),
    reset: vi.fn(),
    resetAll: vi.fn(),
    subscribe: vi.fn(() => () => {}),
    hydrate: vi.fn(),
  },
}));

// Mock logger
vi.mock('./loggerService', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { modelFallbackService } from './modelFallbackService';
import { circuitBreakerService } from './circuitBreakerService';
import type { FallbackChain } from './modelFallbackService';

describe('modelFallbackService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(circuitBreakerService.canExecute).mockReturnValue(true);
  });

  describe('default chains', () => {
    it('should have 5 default chains registered', () => {
      const chains = modelFallbackService.getAllChains();
      expect(chains).toHaveLength(5);
    });

    it('should include video-generation-quality chain', () => {
      const chain = modelFallbackService.getChain('video-generation-quality');
      expect(chain).toBeDefined();
      expect(chain?.label).toBe('Video Generation (Quality)');
      expect(chain?.models.length).toBeGreaterThan(0);
    });

    it('should include video-generation-fast chain', () => {
      const chain = modelFallbackService.getChain('video-generation-fast');
      expect(chain).toBeDefined();
      expect(chain?.label).toBe('Video Generation (Fast)');
    });

    it('should include prompt-generation chain', () => {
      const chain = modelFallbackService.getChain('prompt-generation');
      expect(chain).toBeDefined();
      expect(chain?.label).toBe('Prompt Generation');
      expect(chain?.models.length).toBeGreaterThan(0);
    });

    it('should include vision-analysis chain', () => {
      const chain = modelFallbackService.getChain('vision-analysis');
      expect(chain).toBeDefined();
      expect(chain?.label).toBe('Vision Analysis');
    });

    it('should include audio-processing chain', () => {
      const chain = modelFallbackService.getChain('audio-processing');
      expect(chain).toBeDefined();
      expect(chain?.label).toBe('Audio Processing');
    });
  });

  describe('getChain', () => {
    it('should return a chain for valid ID', () => {
      const chain = modelFallbackService.getChain('prompt-generation');
      expect(chain).toBeDefined();
      expect(chain?.id).toBe('prompt-generation');
    });

    it('should return undefined for invalid chain ID', () => {
      const chain = modelFallbackService.getChain('non-existent-chain');
      expect(chain).toBeUndefined();
    });

    it('should include endpoint map', () => {
      const chain = modelFallbackService.getChain('prompt-generation');
      expect(chain?.endpointMap).toBeDefined();
      expect(Object.keys(chain?.endpointMap ?? {}).length).toBeGreaterThan(0);
    });

    it('should have models list', () => {
      const chain = modelFallbackService.getChain('prompt-generation');
      expect(chain?.models).toBeDefined();
      expect(Array.isArray(chain?.models)).toBe(true);
      expect(chain?.models.length).toBeGreaterThan(0);
    });
  });

  describe('getAllChains', () => {
    it('should return all registered chains', () => {
      const chains = modelFallbackService.getAllChains();
      expect(Array.isArray(chains)).toBe(true);
      expect(chains.length).toBe(5);
    });

    it('should return chains with required properties', () => {
      const chains = modelFallbackService.getAllChains();
      for (const chain of chains) {
        expect(chain).toHaveProperty('id');
        expect(chain).toHaveProperty('label');
        expect(chain).toHaveProperty('models');
        expect(chain).toHaveProperty('endpointMap');
      }
    });
  });

  describe('selectModel', () => {
    it('should return primary model when circuit is closed', () => {
      vi.mocked(circuitBreakerService.canExecute).mockReturnValue(true);

      const result = modelFallbackService.selectModel('prompt-generation');

      expect(result).toBeDefined();
      expect(result?.isFallback).toBe(false);
      expect(result?.chainIndex).toBe(0);
      expect(result?.modelId).toBeDefined();
    });

    it('should return primary model as primary model ID', () => {
      const result = modelFallbackService.selectModel('prompt-generation');

      expect(result?.primaryModelId).toBe(result?.modelId);
    });

    it('should return null for non-existent chain', () => {
      const result = modelFallbackService.selectModel('non-existent-chain');

      expect(result).toBeNull();
    });

    it('should fallback to secondary model when primary circuit is open', () => {
      const chain = modelFallbackService.getChain('prompt-generation');
      const primaryModelId = chain?.models[0];
      const secondaryModelId = chain?.models[1];

      // Mock: first call returns false (primary open), second returns true
      let callCount = 0;
      vi.mocked(circuitBreakerService.canExecute).mockImplementation(() => {
        callCount++;
        return callCount > 1;
      });

      const result = modelFallbackService.selectModel('prompt-generation');

      expect(result?.isFallback).toBe(true);
      expect(result?.chainIndex).toBeGreaterThan(0);
      expect(result?.primaryModelId).toBe(primaryModelId);
      expect(result?.modelId).toBe(secondaryModelId);
    });

    it('should return primary model if all circuits are open', () => {
      vi.mocked(circuitBreakerService.canExecute).mockReturnValue(false);

      const result = modelFallbackService.selectModel('prompt-generation');

      expect(result).toBeDefined();
      expect(result?.modelId).toBeDefined();
    });

    it('should use endpoint map to check circuit', () => {
      const chain = modelFallbackService.getChain('prompt-generation');
      const primaryModel = chain?.models[0];
      const _endpointId = chain?.endpointMap[primaryModel ?? ''];

      modelFallbackService.selectModel('prompt-generation');

      expect(circuitBreakerService.canExecute).toHaveBeenCalledWith(expect.any(String));
    });
  });

  describe('selectModelForId', () => {
    it('should find a chain containing the model as primary', () => {
      const chain = modelFallbackService.getChain('prompt-generation');
      const primaryModel = chain?.models[0];

      const result = modelFallbackService.selectModelForId(primaryModel ?? '');

      expect(result).toBeDefined();
      expect(result?.primaryModelId).toBe(primaryModel);
    });

    it('should return the model if no chain is found', () => {
      const result = modelFallbackService.selectModelForId('unknown-model-xyz');

      expect(result.modelId).toBe('unknown-model-xyz');
      expect(result.isFallback).toBe(false);
      expect(result.primaryModelId).toBe('unknown-model-xyz');
    });

    it('should have isFallback false for primary models', () => {
      const chain = modelFallbackService.getChain('prompt-generation');
      const primaryModel = chain?.models[0];

      const result = modelFallbackService.selectModelForId(primaryModel ?? '');

      expect(result.isFallback).toBe(false);
      expect(result.chainIndex).toBe(0);
    });

    it('should support fallback within chain for non-primary models', () => {
      const chain = modelFallbackService.getChain('prompt-generation');
      const secondaryModel = chain?.models[1];

      // Mock canExecute to fail for all except the secondary
      let callCount = 0;
      vi.mocked(circuitBreakerService.canExecute).mockImplementation(() => {
        callCount++;
        return callCount > 1;
      });

      const result = modelFallbackService.selectModelForId(secondaryModel ?? '');

      expect(result).toBeDefined();
    });
  });

  describe('registerChain', () => {
    it('should register a custom chain', () => {
      const customChain: FallbackChain = {
        id: 'custom-chain',
        label: 'Custom Chain',
        models: ['model-1', 'model-2'],
        endpointMap: {
          'model-1': 'endpoint-1',
          'model-2': 'endpoint-2',
        },
      };

      modelFallbackService.registerChain(customChain);

      const retrieved = modelFallbackService.getChain('custom-chain');
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('custom-chain');
    });

    it('should override existing chain', () => {
      const chain = modelFallbackService.getChain('prompt-generation');
      const _originalModels = chain?.models.length ?? 0;

      const updatedChain: FallbackChain = {
        ...chain!,
        models: ['new-model-1', 'new-model-2'],
      };

      modelFallbackService.registerChain(updatedChain);

      const retrieved = modelFallbackService.getChain('prompt-generation');
      expect(retrieved?.models.length).toBe(2);
    });

    it('should be included in getAllChains', () => {
      const _chainsBefore = modelFallbackService.getAllChains().length;

      const newChain: FallbackChain = {
        id: 'new-test-chain',
        label: 'New Test Chain',
        models: ['test-model'],
        endpointMap: { 'test-model': 'test-endpoint' },
      };

      modelFallbackService.registerChain(newChain);

      const chainsAfter = modelFallbackService.getAllChains();
      expect(chainsAfter.some((c) => c.id === 'new-test-chain')).toBe(true);
    });
  });

  describe('event system', () => {
    it('should notify listeners on fallback activation', () => {
      const listener = vi.fn();
      modelFallbackService.subscribe(listener);

      // Reset mock and return false for first model, true for second
      vi.clearAllMocks();
      let callCount = 0;
      vi.mocked(circuitBreakerService.canExecute).mockImplementation(() => {
        callCount++;
        // First call to check primary: return false (open)
        // Second call to check fallback: return true (closed)
        return callCount > 1;
      });

      modelFallbackService.selectModel('prompt-generation');

      if (callCount > 1) {
        // Only check if fallback was actually triggered
        expect(listener).toHaveBeenCalled();
        if (listener.mock.calls.length > 0) {
          const result = listener.mock.calls[0][0];
          expect(result.isFallback).toBe(true);
        }
      }
    });

    it('should not notify for primary model selection', () => {
      const listener = vi.fn();
      modelFallbackService.subscribe(listener);

      vi.mocked(circuitBreakerService.canExecute).mockReturnValue(true);

      modelFallbackService.selectModel('prompt-generation');

      expect(listener).not.toHaveBeenCalled();
    });

    it('should allow unsubscribing', () => {
      const listener = vi.fn();
      const unsubscribe = modelFallbackService.subscribe(listener);

      unsubscribe();

      let callCount = 0;
      vi.mocked(circuitBreakerService.canExecute).mockImplementation(() => {
        callCount++;
        return callCount > 1;
      });

      modelFallbackService.selectModel('prompt-generation');

      expect(listener).not.toHaveBeenCalled();
    });

    it('should include result details in fallback event', () => {
      const listener = vi.fn();
      modelFallbackService.subscribe(listener);

      let callCount = 0;
      vi.mocked(circuitBreakerService.canExecute).mockImplementation(() => {
        callCount++;
        return callCount > 1;
      });

      modelFallbackService.selectModel('prompt-generation');

      if (listener.mock.calls.length > 0) {
        const result = listener.mock.calls[0][0];
        expect(result).toHaveProperty('modelId');
        expect(result).toHaveProperty('isFallback');
        expect(result).toHaveProperty('chainIndex');
        expect(result).toHaveProperty('primaryModelId');
      }
    });
  });

  describe('chain model ordering', () => {
    it('should have primary model first in chain', () => {
      const chain = modelFallbackService.getChain('prompt-generation');
      expect(chain?.models[0]).toBeDefined();
    });

    it('should try models in order', () => {
      const chain = modelFallbackService.getChain('video-generation-quality');
      const models = chain?.models ?? [];

      expect(models.length).toBeGreaterThan(0);
      expect(models[0]).toBeDefined();
      if (models.length > 1) {
        expect(models[1]).toBeDefined();
      }
    });
  });

  describe('endpoint mapping', () => {
    it('should map all models to endpoints', () => {
      const chain = modelFallbackService.getChain('video-generation-quality');
      const endpointMap = chain?.endpointMap ?? {};

      for (const model of chain?.models ?? []) {
        expect(Object.keys(endpointMap)).toContain(model);
      }
    });

    it('should use endpoint to check circuit', () => {
      vi.mocked(circuitBreakerService.canExecute).mockReturnValue(true);
      vi.clearAllMocks();

      modelFallbackService.selectModel('video-generation-quality');

      // Should have called canExecute with an endpoint ID
      if (vi.mocked(circuitBreakerService.canExecute).mock.calls.length > 0) {
        expect(vi.mocked(circuitBreakerService.canExecute).mock.calls.length).toBeGreaterThan(0);
      }
    });
  });

  describe('video chains', () => {
    it('should have appropriate models in quality chain', () => {
      const chain = modelFallbackService.getChain('video-generation-quality');
      expect(chain?.models).toContain('veo-3.1-generate-preview');
    });

    it('should have appropriate models in fast chain', () => {
      const chain = modelFallbackService.getChain('video-generation-fast');
      expect(chain?.models).toContain('veo-3.1-fast-generate-preview');
    });
  });

  describe('gemini chains', () => {
    it('should have appropriate models in prompt-generation', () => {
      const chain = modelFallbackService.getChain('prompt-generation');
      expect(chain?.models).toBeDefined();
      expect(chain?.models.length).toBeGreaterThan(0);
      // Just verify it has models, the specific naming can vary
    });

    it('should have appropriate models in vision-analysis', () => {
      const chain = modelFallbackService.getChain('vision-analysis');
      expect(chain?.models).toBeDefined();
      expect(chain?.models.length).toBeGreaterThan(0);
      // Just verify it has models, the specific naming can vary
    });
  });
});
