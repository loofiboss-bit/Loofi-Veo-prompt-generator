import { describe, it, expect, vi, beforeEach } from 'vitest';
import { presetMatchingService } from './presetMatchingService';
import type { PresetRecommendation } from '@core/types';

// Mock logger
vi.mock('@core/services/loggerService', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock cost estimation service
vi.mock('@core/services/costEstimationService', () => ({
  costEstimationService: {
    estimateCost: vi.fn(),
  },
}));

describe('PresetMatchingService', () => {
  describe('recommendPreset', () => {
    it('returns valid structure', () => {
      const result = presetMatchingService.recommendPreset('A simple scene', 'prompt-1');

      expect(result).toHaveProperty('modelId');
      expect(result).toHaveProperty('profileId');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('reasoning');
      expect(result).toHaveProperty('complexityVector');
      expect(typeof result.modelId).toBe('string');
      expect(typeof result.profileId).toBe('string');
      expect(typeof result.confidence).toBe('number');
      expect(Array.isArray(result.reasoning)).toBe(true);
      expect(typeof result.complexityVector).toBe('object');
    });

    it('has confidence between 0 and 1', () => {
      const prompts = [
        'A simple scene',
        'A complex cinematic shot with dramatic lighting',
        'An abstract artistic experiment',
      ];

      for (const prompt of prompts) {
        const result = presetMatchingService.recommendPreset(prompt, 'prompt-test');
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
      }
    });

    it('reasoning is non-empty array', () => {
      const result = presetMatchingService.recommendPreset(
        'A photorealistic scene with complex details',
        'prompt-2',
      );

      expect(Array.isArray(result.reasoning)).toBe(true);
      expect(result.reasoning.length).toBeGreaterThan(0);
      for (const reason of result.reasoning) {
        expect(typeof reason).toBe('string');
        expect(reason.length).toBeGreaterThan(0);
      }
    });

    it('complexityVector has expected dimensions', () => {
      const result = presetMatchingService.recommendPreset('A cinematic scene', 'prompt-3');

      expect(result.complexityVector).toHaveProperty('length');
      expect(result.complexityVector).toHaveProperty('detail');
      expect(result.complexityVector).toHaveProperty('motion');
      expect(result.complexityVector).toHaveProperty('style');
      expect(result.complexityVector).toHaveProperty('composition');
    });

    it('reasoning uses "optimized for" framing (RAI compliance)', () => {
      const result = presetMatchingService.recommendPreset(
        'A detailed cinematic shot with dramatic lighting and complex camera movement',
        'prompt-rai',
      );

      // Check that at least one reasoning item contains "optimized" framing
      const hasOptimizedFraming = result.reasoning.some((r) =>
        r.toLowerCase().includes('optimized'),
      );
      expect(hasOptimizedFraming).toBe(true);
    });
  });

  describe('analyzeComplexity', () => {
    it('returns values between 0 and 1', () => {
      const prompts = [
        'Short',
        'A medium length prompt with some details',
        'A very long and detailed prompt with extensive descriptions of characters, settings, lighting, camera movements, and artistic style that goes on and on with many specific elements and requirements for the final video output including resolution, frame rate, and quality settings',
      ];

      for (const prompt of prompts) {
        const vector = presetMatchingService.analyzeComplexity(prompt);
        for (const [key, value] of Object.entries(vector)) {
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(1);
        }
      }
    });

    it('simple prompt gets low complexity', () => {
      const vector = presetMatchingService.analyzeComplexity('A cat sitting');

      // Calculate overall complexity
      const values = Object.values(vector);
      const overallComplexity = values.reduce((sum, v) => sum + v, 0) / values.length;

      expect(overallComplexity).toBeLessThan(0.4);
    });

    it('complex cinematic prompt gets high complexity', () => {
      const complexPrompt = `
        A cinematic photorealistic scene with dramatic lighting.
        The camera performs a slow dolly zoom while tracking the subject.
        Wide shot composition with depth of field and symmetrical framing.
        The subject is wearing a red jacket, holding a vintage camera,
        standing in the center with a futuristic background.
        Ethereal and surreal atmosphere with gritty noir aesthetics.
      `;

      const vector = presetMatchingService.analyzeComplexity(complexPrompt);

      // Calculate overall complexity
      const values = Object.values(vector);
      const overallComplexity = values.reduce((sum, v) => sum + v, 0) / values.length;

      expect(overallComplexity).toBeGreaterThan(0.5);
    });

    it('prompt with motion keywords gets high motion score', () => {
      const motionPrompt =
        'A dynamic scene with running, flying, spinning camera that pans, tilts, and tracks the subject with a dolly zoom';

      const vector = presetMatchingService.analyzeComplexity(motionPrompt);

      expect(vector.motion).toBeGreaterThan(0.5);
    });

    it('prompt with style keywords gets high style score', () => {
      const stylePrompt =
        'A cinematic, photorealistic, dramatic scene with noir lighting, vintage aesthetics, surreal and ethereal atmosphere';

      const vector = presetMatchingService.analyzeComplexity(stylePrompt);

      expect(vector.style).toBeGreaterThan(0.5);
    });
  });

  describe('preset selection', () => {
    it('high complexity gets cinema-4k preset', () => {
      const complexPrompt = `
        A cinematic photorealistic masterpiece with dramatic ethereal lighting.
        Complex dolly zoom tracking shot with slow motion and time lapse effects.
        Wide aerial shot with symmetrical composition and depth of field.
        Subject wearing gold jacket, holding vintage camera, running through futuristic noir city.
        Surreal abstract atmosphere with gritty minimalist aesthetics and dramatic framing.
      `;

      const result = presetMatchingService.recommendPreset(complexPrompt, 'prompt-cinema');

      expect(result.profileId).toBe('cinema-4k');
    });

    it('low complexity gets draft preset', () => {
      const simplePrompt = 'A person walks';

      const result = presetMatchingService.recommendPreset(simplePrompt, 'prompt-draft');

      expect(result.profileId).toBe('draft');
    });

    it('medium complexity gets appropriate preset', () => {
      const mediumPrompt = 'A cinematic scene with dramatic lighting and camera movement';

      const result = presetMatchingService.recommendPreset(mediumPrompt, 'prompt-medium');

      // Should get a valid preset (draft, web-standard, web-high, or cinema-4k)
      expect(['draft', 'web-standard', 'web-high', 'cinema-4k']).toContain(result.profileId);
    });
  });

  describe('model selection', () => {
    it('selects appropriate model for cinematic prompt', () => {
      const cinematicPrompt =
        'A photorealistic cinematic scene with high detail and complex composition';

      const result = presetMatchingService.recommendPreset(cinematicPrompt, 'prompt-model-1');

      // Should select a model, not empty
      expect(result.modelId).toBeTruthy();
      expect(typeof result.modelId).toBe('string');
    });

    it('different prompts can select different models', () => {
      const prompts = [
        { text: 'A quick simple scene', id: 'p1' },
        { text: 'A complex photorealistic cinematic masterpiece', id: 'p2' },
        { text: 'An abstract artistic surreal experiment', id: 'p3' },
      ];

      const results = prompts.map((p) => presetMatchingService.recommendPreset(p.text, p.id));

      // At least verify all have valid model IDs
      for (const result of results) {
        expect(result.modelId).toBeTruthy();
        expect(['veo-3.1-quality', 'veo-3.1-fast', 'sora-turbo']).toContain(result.modelId);
      }
    });
  });
});
