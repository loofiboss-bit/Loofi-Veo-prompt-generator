import { describe, it, expect, vi, beforeEach } from 'vitest';
import { costEstimationService } from './costEstimationService';

// Mock loggerService
vi.mock('@core/services/loggerService', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('costEstimationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('estimateForPrompt', () => {
    it('returns valid structure with all required fields', () => {
      const result = costEstimationService.estimateForPrompt(
        'A cinematic shot of a sunset',
        'prompt-123',
        'veo',
      );

      expect(result).toMatchObject({
        promptId: 'prompt-123',
        modelId: 'veo',
        estimatedUsd: expect.any(Number),
        qualityScore: expect.any(Number),
        breakdown: expect.any(Array),
      });
      expect(result.breakdown.length).toBeGreaterThan(0);
    });

    it('uses default veo model when modelId is not provided', () => {
      const result = costEstimationService.estimateForPrompt(
        'A cinematic shot of a sunset',
        'prompt-123',
      );

      expect(result.modelId).toBe('veo');
    });

    it('qualityScore is between 1 and 10', () => {
      const testCases = [
        'short',
        'A medium length prompt with some detail',
        'A very detailed and comprehensive prompt describing a cinematic scene with golden hour lighting, tracking shot camera movement, and photorealistic style featuring a character wearing a blue jacket in the foreground with mountains in the background.',
      ];

      testCases.forEach((prompt) => {
        const result = costEstimationService.estimateForPrompt(prompt, 'test-id');
        expect(result.qualityScore).toBeGreaterThanOrEqual(1);
        expect(result.qualityScore).toBeLessThanOrEqual(10);
      });
    });

    it('breakdown has 6 dimensions', () => {
      const result = costEstimationService.estimateForPrompt(
        'A cinematic shot of a sunset',
        'prompt-123',
      );

      expect(result.breakdown).toHaveLength(6);
      const dimensionNames = result.breakdown.map((d) => d.name);
      expect(dimensionNames).toContain('specificity');
      expect(dimensionNames).toContain('style');
      expect(dimensionNames).toContain('camera');
      expect(dimensionNames).toContain('lighting');
      expect(dimensionNames).toContain('length');
      expect(dimensionNames).toContain('syntax');
    });

    it('breakdown weights sum to approximately 1', () => {
      const result = costEstimationService.estimateForPrompt(
        'A cinematic shot of a sunset',
        'prompt-123',
      );

      const weightSum = result.breakdown.reduce((sum, dim) => sum + dim.weight, 0);
      expect(weightSum).toBeCloseTo(1, 2);
    });

    it('short prompt gets low length score', () => {
      const result = costEstimationService.estimateForPrompt('short', 'prompt-123');

      const lengthDim = result.breakdown.find((d) => d.name === 'length');
      expect(lengthDim).toBeDefined();
      expect(lengthDim!.score).toBeLessThan(5);
    });

    it('optimal length prompt gets high length score', () => {
      // Create a prompt in optimal range (150-500 chars)
      const optimalPrompt = 'A'.repeat(200);
      const result = costEstimationService.estimateForPrompt(optimalPrompt, 'prompt-123');

      const lengthDim = result.breakdown.find((d) => d.name === 'length');
      expect(lengthDim).toBeDefined();
      expect(lengthDim!.score).toBeGreaterThanOrEqual(9);
    });

    it('prompt with style keywords gets high style score', () => {
      const result = costEstimationService.estimateForPrompt(
        'A cinematic and photorealistic scene with a vintage aesthetic',
        'prompt-123',
      );

      const styleDim = result.breakdown.find((d) => d.name === 'style');
      expect(styleDim).toBeDefined();
      expect(styleDim!.score).toBeGreaterThan(5);
    });

    it('prompt with camera keywords gets high camera score', () => {
      const result = costEstimationService.estimateForPrompt(
        'A tracking shot with dolly in and close-up framing',
        'prompt-123',
      );

      const cameraDim = result.breakdown.find((d) => d.name === 'camera');
      expect(cameraDim).toBeDefined();
      expect(cameraDim!.score).toBeGreaterThan(5);
    });

    it('prompt with lighting keywords gets high lighting score', () => {
      const result = costEstimationService.estimateForPrompt(
        'A scene with golden hour and dramatic lighting',
        'prompt-123',
      );

      const lightingDim = result.breakdown.find((d) => d.name === 'lighting');
      expect(lightingDim).toBeDefined();
      expect(lightingDim!.score).toBeGreaterThan(5);
    });

    it('cost estimate is positive', () => {
      const result = costEstimationService.estimateForPrompt('A cinematic shot', 'prompt-123');

      expect(result.estimatedUsd).toBeGreaterThan(0);
    });

    it('different models have different costs', () => {
      const veoResult = costEstimationService.estimateForPrompt(
        'A cinematic shot',
        'prompt-123',
        'veo',
      );
      const soraResult = costEstimationService.estimateForPrompt(
        'A cinematic shot',
        'prompt-123',
        'sora',
      );

      expect(veoResult.estimatedUsd).not.toBe(soraResult.estimatedUsd);
    });
  });

  describe('calculateOverallScore', () => {
    it('clamps score to 1-10 range', () => {
      // Create extreme breakdown scenarios
      const lowBreakdown = [
        { name: 'test1', score: 0, weight: 0.5, feedback: 'test' },
        { name: 'test2', score: 0, weight: 0.5, feedback: 'test' },
      ];

      const highBreakdown = [
        { name: 'test1', score: 10, weight: 0.5, feedback: 'test' },
        { name: 'test2', score: 10, weight: 0.5, feedback: 'test' },
      ];

      const lowScore = costEstimationService.calculateOverallScore(lowBreakdown);
      const highScore = costEstimationService.calculateOverallScore(highBreakdown);

      expect(lowScore).toBeGreaterThanOrEqual(1);
      expect(lowScore).toBeLessThanOrEqual(10);
      expect(highScore).toBeGreaterThanOrEqual(1);
      expect(highScore).toBeLessThanOrEqual(10);
    });
  });

  describe('calculateQualityBreakdown', () => {
    it('returns array of QualityDimension objects', () => {
      const breakdown = costEstimationService.calculateQualityBreakdown(
        'A cinematic shot with golden hour lighting',
      );

      expect(Array.isArray(breakdown)).toBe(true);
      breakdown.forEach((dim) => {
        expect(dim).toHaveProperty('name');
        expect(dim).toHaveProperty('score');
        expect(dim).toHaveProperty('weight');
        expect(dim).toHaveProperty('feedback');
        expect(typeof dim.name).toBe('string');
        expect(typeof dim.score).toBe('number');
        expect(typeof dim.weight).toBe('number');
        expect(typeof dim.feedback).toBe('string');
      });
    });

    it('specificity score increases with word count and details', () => {
      const shortPrompt = 'A scene';
      const detailedPrompt =
        'A detailed scene with 5 characters wearing blue jackets in the foreground against a mountain background with specific lighting at golden hour';

      const shortBreakdown = costEstimationService.calculateQualityBreakdown(shortPrompt);
      const detailedBreakdown = costEstimationService.calculateQualityBreakdown(detailedPrompt);

      const shortSpecificity = shortBreakdown.find((d) => d.name === 'specificity')!;
      const detailedSpecificity = detailedBreakdown.find((d) => d.name === 'specificity')!;

      expect(detailedSpecificity.score).toBeGreaterThan(shortSpecificity.score);
    });

    it('syntax score penalizes all-caps text', () => {
      const normalPrompt = 'A cinematic shot with proper capitalization';
      const capsPrompt = 'A CINEMATIC SHOT WITH ALL CAPS TEXT';

      const normalBreakdown = costEstimationService.calculateQualityBreakdown(normalPrompt);
      const capsBreakdown = costEstimationService.calculateQualityBreakdown(capsPrompt);

      const normalSyntax = normalBreakdown.find((d) => d.name === 'syntax')!;
      const capsSyntax = capsBreakdown.find((d) => d.name === 'syntax')!;

      expect(normalSyntax.score).toBeGreaterThan(capsSyntax.score);
    });
  });
});
