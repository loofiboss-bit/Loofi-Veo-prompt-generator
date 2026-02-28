import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock idb-keyval
const mockStore = new Map<string, unknown>();
vi.mock('idb-keyval', () => ({
  createStore: vi.fn(() => 'mock-store'),
  get: vi.fn((key: string, _store?: unknown) => Promise.resolve(mockStore.get(key))),
  set: vi.fn((key: string, value: unknown, _store?: unknown) => {
    mockStore.set(key, value);
    return Promise.resolve();
  }),
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

import { costTrackingService } from './costTrackingService';

describe('costTrackingService', () => {
  beforeEach(() => {
    mockStore.clear();
    costTrackingService.resetSession();
  });

  describe('estimatePromptCost', () => {
    it('should estimate cost for a prompt', () => {
      const estimate = costTrackingService.estimatePromptCost(
        'gemini-3.1-pro-preview',
        'This is a test prompt',
      );

      expect(estimate).toBeDefined();
      expect(estimate.modelId).toBe('gemini-3.1-pro-preview');
      expect(estimate.estimatedInputTokens).toBeGreaterThan(0);
      expect(estimate.estimatedOutputTokens).toBeGreaterThan(0);
      expect(estimate.estimatedCostUsd).toBeGreaterThanOrEqual(0);
    });

    it('should use provided use case for output tokens', () => {
      const estimate1 = costTrackingService.estimatePromptCost(
        'gemini-3.1-pro-preview',
        'Test prompt',
        'prompt-generation',
      );

      const estimate2 = costTrackingService.estimatePromptCost(
        'gemini-3.1-pro-preview',
        'Test prompt',
        'vision-analysis',
      );

      expect(estimate1.estimatedOutputTokens).toBeGreaterThan(0);
      expect(estimate2.estimatedOutputTokens).toBeGreaterThan(0);
    });

    it('should return object with required fields', () => {
      const estimate = costTrackingService.estimatePromptCost(
        'gemini-2.5-flash-preview-05-20',
        'Test',
      );

      expect(estimate).toHaveProperty('modelId');
      expect(estimate).toHaveProperty('estimatedInputTokens');
      expect(estimate).toHaveProperty('estimatedOutputTokens');
      expect(estimate).toHaveProperty('estimatedCostUsd');
    });
  });

  describe('estimateVideoGenerationCost', () => {
    it('should estimate cost for video generation', () => {
      const estimate = costTrackingService.estimateVideoGenerationCost('veo-3.1-generate-preview');

      expect(estimate).toBeDefined();
      expect(estimate.modelId).toBe('veo-3.1-generate-preview');
      expect(estimate.estimatedCostUsd).toBeGreaterThanOrEqual(0);
      expect(estimate.estimatedVideoDurationSeconds).toBeGreaterThan(0);
    });

    it('should use provided duration', () => {
      const estimate = costTrackingService.estimateVideoGenerationCost(
        'veo-3.1-generate-preview',
        60,
      );

      expect(estimate.estimatedVideoDurationSeconds).toBe(60);
    });

    it('should use default duration if not provided', () => {
      const estimate = costTrackingService.estimateVideoGenerationCost('veo-3.1-generate-preview');

      expect(estimate.estimatedVideoDurationSeconds).toBeGreaterThan(0);
    });
  });

  describe('estimateImageGenerationCost', () => {
    it('should estimate cost for image generation', () => {
      const estimate = costTrackingService.estimateImageGenerationCost('gemini-3.1-pro-preview');

      expect(estimate).toBeDefined();
      expect(estimate.modelId).toBe('gemini-3.1-pro-preview');
      expect(estimate.estimatedCostUsd).toBeGreaterThanOrEqual(0);
    });
  });

  describe('recordCost', () => {
    it('should record a cost and return full record', () => {
      const record = costTrackingService.recordCost({
        modelId: 'gemini-3.1-pro-preview',
        endpointId: 'gemini-prompt',
        inputTokens: 100,
        outputTokens: 50,
        costUsd: 0.001,
        isEstimated: false,

        description: 'Test prompt',
      });

      expect(record).toBeDefined();
      expect(record.id).toBeDefined();
      expect(record.timestamp).toBeGreaterThan(0);
      expect(record.modelId).toBe('gemini-3.1-pro-preview');
      expect(record.costUsd).toBe(0.001);
    });

    it('should accumulate session total', () => {
      const stateBefore = costTrackingService.getState();
      const sessionBefore = stateBefore.sessionTotalUsd;

      costTrackingService.recordCost({
        modelId: 'gemini-3.1-pro-preview',
        endpointId: 'gemini-prompt',
        inputTokens: 50,
        outputTokens: 25,
        costUsd: 0.0005,
        isEstimated: false,

        description: 'First call',
      });

      costTrackingService.recordCost({
        modelId: 'gemini-3.1-pro-preview',
        endpointId: 'gemini-prompt',
        inputTokens: 50,
        outputTokens: 25,
        costUsd: 0.0005,
        isEstimated: false,

        description: 'Second call',
      });

      const state = costTrackingService.getState();
      expect(state.sessionTotalUsd).toBeCloseTo(sessionBefore + 0.001, 6);
    });

    it('should accumulate lifetime total', () => {
      const stateBefore = costTrackingService.getState();
      const lifetimeBefore = stateBefore.lifetimeTotalUsd;

      costTrackingService.recordCost({
        modelId: 'gemini-3.1-pro-preview',
        endpointId: 'gemini-prompt',
        inputTokens: 50,
        outputTokens: 25,
        costUsd: 0.001,
        isEstimated: false,

        description: 'Test',
      });

      const state = costTrackingService.getState();
      expect(state.lifetimeTotalUsd).toBeCloseTo(lifetimeBefore + 0.001, 6);
    });

    it('should accumulate monthly spent', () => {
      const stateBefore = costTrackingService.getState();
      const monthlyBefore = stateBefore.monthlySpentUsd;

      costTrackingService.recordCost({
        modelId: 'gemini-3.1-pro-preview',
        endpointId: 'gemini-prompt',
        inputTokens: 50,
        outputTokens: 25,
        costUsd: 0.001,
        isEstimated: false,

        description: 'Test',
      });

      const state = costTrackingService.getState();
      expect(state.monthlySpentUsd).toBeCloseTo(monthlyBefore + 0.001, 6);
    });
  });

  describe('recordEstimatedCost', () => {
    it('should record estimated cost from a CostEstimate', () => {
      const estimate = costTrackingService.estimatePromptCost(
        'gemini-3.1-pro-preview',
        'Test prompt',
      );

      const record = costTrackingService.recordEstimatedCost(
        estimate,
        'gemini-prompt',
        'Test generation',
      );

      expect(record).toBeDefined();
      expect(record.isEstimated).toBe(true);
      expect(record.costUsd).toBeCloseTo(estimate.estimatedCostUsd, 6);
    });
  });

  describe('budget management', () => {
    it('should set a monthly budget', async () => {
      await costTrackingService.setMonthlyBudget(10);

      const state = costTrackingService.getState();
      expect(state.monthlyBudgetUsd).toBe(10);
    });

    it('should remove budget when setting null', async () => {
      await costTrackingService.setMonthlyBudget(10);
      await costTrackingService.setMonthlyBudget(null);

      const state = costTrackingService.getState();
      expect(state.monthlyBudgetUsd).toBeNull();
    });

    it('should indicate when within budget', async () => {
      await costTrackingService.setMonthlyBudget(100);

      costTrackingService.recordCost({
        modelId: 'gemini-3.1-pro-preview',
        endpointId: 'gemini-prompt',
        inputTokens: 50,
        outputTokens: 25,
        costUsd: 5,
        isEstimated: false,

        description: 'Test',
      });

      expect(costTrackingService.isWithinBudget()).toBe(true);
    });

    it('should indicate when budget is exceeded', async () => {
      await costTrackingService.setMonthlyBudget(1);

      costTrackingService.recordCost({
        modelId: 'gemini-3.1-pro-preview',
        endpointId: 'gemini-prompt',
        inputTokens: 50,
        outputTokens: 25,
        costUsd: 15,
        isEstimated: false,

        description: 'Test',
      });

      expect(costTrackingService.isWithinBudget()).toBe(false);
    });

    it('should return true when no budget is set', async () => {
      // Reset to no budget
      await costTrackingService.setMonthlyBudget(null);

      costTrackingService.recordCost({
        modelId: 'gemini-3.1-pro-preview',
        endpointId: 'gemini-prompt',
        inputTokens: 50,
        outputTokens: 25,
        costUsd: 100,
        isEstimated: false,

        description: 'Test',
      });

      expect(costTrackingService.isWithinBudget()).toBe(true);
    });

    it('should calculate remaining budget', async () => {
      await costTrackingService.setMonthlyBudget(10);

      costTrackingService.recordCost({
        modelId: 'gemini-3.1-pro-preview',
        endpointId: 'gemini-prompt',
        inputTokens: 50,
        outputTokens: 25,
        costUsd: 3,
        isEstimated: false,

        description: 'Test',
      });

      const remaining = costTrackingService.getRemainingBudget();
      expect(remaining).toBeLessThanOrEqual(10);
      expect(remaining).toBeGreaterThanOrEqual(0);
    });

    it('should return null for remaining budget when no budget set', async () => {
      await costTrackingService.setMonthlyBudget(null);
      const remaining = costTrackingService.getRemainingBudget();
      expect(remaining).toBeNull();
    });
  });

  describe('getRecordsByModel', () => {
    it('should filter records by model', () => {
      costTrackingService.recordCost({
        modelId: 'gemini-3.1-pro-preview',
        endpointId: 'gemini-prompt',
        inputTokens: 50,
        outputTokens: 25,
        costUsd: 0.001,
        isEstimated: false,

        description: 'Gemini call',
      });

      costTrackingService.recordCost({
        modelId: 'veo-3.1-generate-preview',
        endpointId: 'veo-video',
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0.1,
        videoDurationSeconds: 10,
        isEstimated: false,

        description: 'Video generation',
      });

      const geminiRecords = costTrackingService.getRecordsByModel('gemini-3.1-pro-preview');
      expect(geminiRecords).toHaveLength(1);
      expect(geminiRecords[0].modelId).toBe('gemini-3.1-pro-preview');
    });

    it('should return empty array for model with no records', () => {
      const records = costTrackingService.getRecordsByModel('non-existent-model');
      expect(records).toEqual([]);
    });
  });

  describe('event system', () => {
    it('should notify listeners on cost recorded', () => {
      const listener = vi.fn();
      costTrackingService.subscribe(listener);

      costTrackingService.recordCost({
        modelId: 'gemini-3.1-pro-preview',
        endpointId: 'gemini-prompt',
        inputTokens: 50,
        outputTokens: 25,
        costUsd: 0.001,
        isEstimated: false,

        description: 'Test',
      });

      expect(listener).toHaveBeenCalled();
      const state = listener.mock.calls[0][0];
      expect(state.sessionTotalUsd).toBeGreaterThan(0);
    });
  });

  describe('resetSession', () => {
    it('should clear session records and totals', () => {
      costTrackingService.recordCost({
        modelId: 'gemini-3.1-pro-preview',
        endpointId: 'gemini-prompt',
        inputTokens: 50,
        outputTokens: 25,
        costUsd: 0.001,
        isEstimated: false,

        description: 'Test',
      });

      const stateBefore = costTrackingService.getState();
      expect(stateBefore.sessionTotalUsd).toBeGreaterThan(0);

      costTrackingService.resetSession();

      const stateAfter = costTrackingService.getState();
      expect(stateAfter.sessionRecords).toHaveLength(0);
      expect(stateAfter.sessionTotalUsd).toBe(0);
    });
  });

  describe('getState', () => {
    it('should return full cost tracking state', () => {
      costTrackingService.recordCost({
        modelId: 'gemini-3.1-pro-preview',
        endpointId: 'gemini-prompt',
        inputTokens: 50,
        outputTokens: 25,
        costUsd: 0.001,
        isEstimated: false,

        description: 'Test',
      });

      const state = costTrackingService.getState();

      expect(state).toHaveProperty('sessionRecords');
      expect(state).toHaveProperty('sessionTotalUsd');
      expect(state).toHaveProperty('lifetimeTotalUsd');
      expect(state).toHaveProperty('monthlySpentUsd');
      expect(state).toHaveProperty('monthlyBudgetUsd');
    });
  });

  describe('hydration', () => {
    it('should hydrate persisted cost data', async () => {
      costTrackingService.recordCost({
        modelId: 'gemini-3.1-pro-preview',
        endpointId: 'gemini-prompt',
        inputTokens: 50,
        outputTokens: 25,
        costUsd: 0.001,
        isEstimated: false,

        description: 'Test',
      });

      await costTrackingService.hydrate();

      const state = costTrackingService.getState();
      expect(state.lifetimeTotalUsd).toBeGreaterThan(0);
    });
  });

  describe('hasPricing', () => {
    it('should return true for known models', () => {
      expect(costTrackingService.hasPricing('gemini-3.1-pro-preview')).toBe(true);
      expect(costTrackingService.hasPricing('veo-3.1-generate-preview')).toBe(true);
    });

    it('should return false for unknown models', () => {
      expect(costTrackingService.hasPricing('unknown-model-xyz')).toBe(false);
    });
  });
});
