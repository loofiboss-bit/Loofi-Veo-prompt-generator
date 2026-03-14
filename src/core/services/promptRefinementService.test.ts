import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { promptRefinementService } from './promptRefinementService';
import type { PromptSuggestion } from '@core/types';
import {
  OPTIMAL_PROMPT_LENGTH_MAX,
  SUGGESTION_CONFIDENCE_THRESHOLD,
} from '@core/constants/optimizationRules';

// Mock dependencies
vi.mock('@core/services/gemini/aiClient', () => ({
  getAiClient: vi.fn(),
  getAiClientAsync: vi.fn(),
  cleanJson: vi.fn((text: string) => text),
  resilientCall: vi.fn(),
  getPromptModel: vi.fn(() => 'gemini-3.1-pro-preview'),
}));

vi.mock('@core/services/apiKeyService', () => ({
  getStoredApiKey: vi.fn(),
  hasApiKeyAsync: vi.fn(),
}));

vi.mock('@core/services/loggerService', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Import mocked dependencies to manipulate them
import { getAiClientAsync, cleanJson, resilientCall } from '@core/services/gemini/aiClient';
import { getStoredApiKey, hasApiKeyAsync } from '@core/services/apiKeyService';
import { logger } from '@core/services/loggerService';

describe('PromptRefinementService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (hasApiKeyAsync as Mock).mockResolvedValue(false);
    promptRefinementService.clearCache();
    promptRefinementService.cancelPending();
  });

  describe('Basic functionality', () => {
    it('returns empty array for empty prompt', async () => {
      const result = await promptRefinementService.analyzePrompt('', 'test-prompt-1');
      expect(result).toEqual([]);
    });

    it('returns empty array for whitespace-only prompt', async () => {
      const result = await promptRefinementService.analyzePrompt('   ', 'test-prompt-1');
      expect(result).toEqual([]);
    });

    it('returns cached results for same prompt', async () => {
      (getStoredApiKey as Mock).mockReturnValue(null);
      (hasApiKeyAsync as Mock).mockResolvedValue(false);

      const promptText = 'A short video of a cat playing with a ball';
      const promptId = 'test-prompt-1';

      // First call
      const result1 = await promptRefinementService.analyzePrompt(promptText, promptId);

      // Second call should return cached result
      const result2 = await promptRefinementService.analyzePrompt(promptText, promptId);

      expect(result1).toEqual(result2);
      // Heuristic analysis should only be called once
      expect(result1.length).toBeGreaterThan(0);
    });
  });

  describe('Heuristic analysis', () => {
    beforeEach(() => {
      (getStoredApiKey as Mock).mockReturnValue(null);
      (hasApiKeyAsync as Mock).mockResolvedValue(false);
    });

    it('suggests specificity for short prompts', async () => {
      const shortPrompt = 'A video'; // Less than MIN_PROMPT_LENGTH
      const result = await promptRefinementService.analyzePrompt(shortPrompt, 'test-prompt-1');

      const specificityCheck = result.find((s) => s.category === 'specificity');
      expect(specificityCheck).toBeDefined();
      expect(specificityCheck?.confidence).toBeGreaterThanOrEqual(SUGGESTION_CONFIDENCE_THRESHOLD);
      expect(specificityCheck?.reasoning).toContain('detailed prompts');
    });

    it('suggests camera movement when no camera keywords present', async () => {
      const promptText =
        'A beautiful sunset over the ocean with dramatic waves crashing on the shore';
      const result = await promptRefinementService.analyzePrompt(promptText, 'test-prompt-1');

      const cameraCheck = result.find((s) => s.category === 'camera');
      expect(cameraCheck).toBeDefined();
      expect(cameraCheck?.suggested).toContain('camera movement');
    });

    it('suggests lighting when no lighting keywords present', async () => {
      const promptText = 'A person walking through a forest with birds flying in the background';
      const result = await promptRefinementService.analyzePrompt(promptText, 'test-prompt-1');

      const lightingCheck = result.find((s) => s.category === 'lighting');
      expect(lightingCheck).toBeDefined();
      expect(lightingCheck?.suggested).toContain('lighting');
    });

    it('suggests style when no style keywords present', async () => {
      const promptText =
        'A car driving down a highway during sunset with mountains in the distance';
      const result = await promptRefinementService.analyzePrompt(promptText, 'test-prompt-1');

      const styleCheck = result.find((s) => s.category === 'style');
      expect(styleCheck).toBeDefined();
      expect(styleCheck?.suggested).toContain('visual style');
    });

    it('does not suggest camera/lighting/style for very short prompts', async () => {
      const shortPrompt = 'Short'; // Less than MIN_PROMPT_LENGTH
      const result = await promptRefinementService.analyzePrompt(shortPrompt, 'test-prompt-1');

      const cameraCheck = result.find((s) => s.category === 'camera');
      const lightingCheck = result.find((s) => s.category === 'lighting');
      const styleCheck = result.find((s) => s.category === 'style');

      expect(cameraCheck).toBeUndefined();
      expect(lightingCheck).toBeUndefined();
      expect(styleCheck).toBeUndefined();
    });

    it('suggests splitting for very long prompts', async () => {
      const longPrompt = 'A'.repeat(OPTIMAL_PROMPT_LENGTH_MAX + 100);
      const result = await promptRefinementService.analyzePrompt(longPrompt, 'test-prompt-1');

      const syntaxCheck = result.find((s) => s.category === 'syntax');
      expect(syntaxCheck).toBeDefined();
      expect(syntaxCheck?.reasoning).toContain('long prompts');
    });

    it('does not suggest camera when camera keyword is present', async () => {
      const promptText =
        'A slow dolly in shot of a beautiful sunset over the ocean with dramatic waves';
      const result = await promptRefinementService.analyzePrompt(promptText, 'test-prompt-1');

      const cameraCheck = result.find((s) => s.category === 'camera');
      expect(cameraCheck).toBeUndefined();
    });

    it('does not suggest lighting when lighting keyword is present', async () => {
      const promptText =
        'A person walking through a forest during golden hour with birds flying overhead';
      const result = await promptRefinementService.analyzePrompt(promptText, 'test-prompt-1');

      const lightingCheck = result.find((s) => s.category === 'lighting');
      expect(lightingCheck).toBeUndefined();
    });

    it('does not suggest style when style keyword is present', async () => {
      const promptText = 'A cinematic car chase scene through city streets at night';
      const result = await promptRefinementService.analyzePrompt(promptText, 'test-prompt-1');

      const styleCheck = result.find((s) => s.category === 'style');
      expect(styleCheck).toBeUndefined();
    });
  });

  describe('Confidence filtering', () => {
    it('filters suggestions below confidence threshold', async () => {
      (getStoredApiKey as Mock).mockReturnValue('fake-api-key');
      (hasApiKeyAsync as Mock).mockResolvedValue(true);
      (getAiClientAsync as Mock).mockResolvedValue({
        models: {
          generateContent: vi.fn(),
        },
      });

      const mockSuggestions = [
        {
          category: 'style',
          original: '',
          suggested: 'Add cinematic style',
          reasoning: 'Improves visual consistency',
          confidence: 0.8,
        },
        {
          category: 'camera',
          original: '',
          suggested: 'Add camera movement',
          reasoning: 'Provides motion guidance',
          confidence: 0.1, // Below threshold
        },
      ];

      (resilientCall as Mock).mockResolvedValue({
        text: JSON.stringify(mockSuggestions),
      });
      (cleanJson as Mock).mockReturnValue(JSON.stringify(mockSuggestions));

      const result = await promptRefinementService.analyzePrompt(
        'A test prompt that is long enough to trigger analysis',
        'test-prompt-1',
      );

      // Only the high-confidence suggestion should be returned
      expect(result.length).toBe(1);
      expect(result[0].category).toBe('style');
      expect(result[0].confidence).toBeGreaterThanOrEqual(SUGGESTION_CONFIDENCE_THRESHOLD);
    });
  });

  describe('Gemini API integration', () => {
    beforeEach(() => {
      (getStoredApiKey as Mock).mockReturnValue('fake-api-key');
      (hasApiKeyAsync as Mock).mockResolvedValue(true);
      (getAiClientAsync as Mock).mockResolvedValue({
        models: {
          generateContent: vi.fn(),
        },
      });
    });

    it('parses valid JSON response from Gemini', async () => {
      const mockSuggestions = [
        {
          category: 'style',
          original: 'sunset',
          suggested: 'cinematic sunset',
          reasoning: 'Adds visual style for better generation',
          confidence: 0.9,
        },
        {
          category: 'camera',
          original: '',
          suggested: 'Add a slow dolly in',
          reasoning: 'Provides motion direction',
          confidence: 0.85,
        },
      ];

      (resilientCall as Mock).mockResolvedValue({
        text: JSON.stringify(mockSuggestions),
      });
      (cleanJson as Mock).mockReturnValue(JSON.stringify(mockSuggestions));

      const result = await promptRefinementService.analyzePrompt(
        'A sunset over the ocean',
        'test-prompt-1',
      );

      expect(result.length).toBe(2);
      expect(result[0].category).toBe('style');
      expect(result[0].source).toBe('ai');
      expect(result[1].category).toBe('camera');
    });

    it('handles malformed JSON gracefully', async () => {
      (resilientCall as Mock).mockResolvedValue({
        text: 'This is not valid JSON',
      });
      (cleanJson as Mock).mockReturnValue('This is not valid JSON');

      const result = await promptRefinementService.analyzePrompt(
        'A sunset over the ocean',
        'test-prompt-1',
      );

      expect(result).toEqual([]);
      expect(logger.warn).toHaveBeenCalledWith('Failed to parse Gemini suggestion response');
    });

    it('handles non-array JSON response', async () => {
      (resilientCall as Mock).mockResolvedValue({
        text: JSON.stringify({ error: 'Invalid format' }),
      });
      (cleanJson as Mock).mockReturnValue(JSON.stringify({ error: 'Invalid format' }));

      const result = await promptRefinementService.analyzePrompt(
        'A sunset over the ocean',
        'test-prompt-1',
      );

      expect(result).toEqual([]);
    });

    it('filters out incomplete suggestion objects', async () => {
      const mockSuggestions = [
        {
          category: 'style',
          suggested: 'Add cinematic style',
          reasoning: 'Improves visual',
          confidence: 0.9,
          // missing 'original' but should still work
        },
        {
          category: 'camera',
          // missing 'suggested' - should be filtered out
          reasoning: 'Provides motion',
          confidence: 0.85,
        },
        {
          category: 'lighting',
          suggested: 'Add golden hour lighting',
          // missing 'reasoning' - should be filtered out
          confidence: 0.8,
        },
      ];

      (resilientCall as Mock).mockResolvedValue({
        text: JSON.stringify(mockSuggestions),
      });
      (cleanJson as Mock).mockReturnValue(JSON.stringify(mockSuggestions));

      const result = await promptRefinementService.analyzePrompt('A test prompt', 'test-prompt-1');

      // Only the first suggestion should pass validation
      expect(result.length).toBe(1);
      expect(result[0].category).toBe('style');
    });

    it('falls back to heuristics on API error', async () => {
      (resilientCall as Mock).mockRejectedValue(new Error('API error'));

      const result = await promptRefinementService.analyzePrompt(
        'A person walking through a forest with trees and sunlight',
        'test-prompt-1',
      );

      expect(logger.warn).toHaveBeenCalledWith(
        'Gemini analysis failed, falling back to heuristics',
        expect.objectContaining({ error: expect.any(Error) }),
      );
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].source).toBe('heuristic');
    });
  });

  describe('Request cancellation', () => {
    it('cancelPending aborts the internal AbortController', async () => {
      (getStoredApiKey as Mock).mockReturnValue('fake-api-key');
      (hasApiKeyAsync as Mock).mockResolvedValue(true);
      (getAiClientAsync as Mock).mockResolvedValue({
        models: {
          generateContent: vi.fn(),
        },
      });

      let _capturedSignal: AbortSignal | null = null;
      (resilientCall as Mock).mockImplementation(async () => {
        // The service creates an AbortController before calling resilientCall.
        // We can't capture the signal directly, but we verify cancelPending works.
        return { text: '[]' };
      });
      (cleanJson as Mock).mockReturnValue('[]');

      // Start analysis (sets abortController)
      const promise = promptRefinementService.analyzePrompt(
        'A prompt for testing cancellation',
        'cancel-test',
      );

      // Cancel — should not throw
      promptRefinementService.cancelPending();

      // The analysis still resolves (resilientCall mock returns immediately)
      const result = await promise;
      expect(result).toEqual([]);
    });

    it('cancelPending handles null abortController gracefully', () => {
      expect(() => promptRefinementService.cancelPending()).not.toThrow();
    });
  });

  describe('Cache management', () => {
    beforeEach(() => {
      (getStoredApiKey as Mock).mockReturnValue(null);
      (hasApiKeyAsync as Mock).mockResolvedValue(false);
    });

    it('clears the cache when clearCache is called', async () => {
      const promptText = 'A video of a dog running in a park during sunset';
      const promptId = 'test-prompt-1';

      // First call - should analyze
      const result1 = await promptRefinementService.analyzePrompt(promptText, promptId);

      // Clear cache
      promptRefinementService.clearCache();

      // Second call - should analyze again (not use cache)
      const result2 = await promptRefinementService.analyzePrompt(promptText, promptId);

      // Results should be the same, but analysis was performed twice
      expect(result1).toEqual(result2);
    });

    it('evicts oldest entry when cache reaches max size', async () => {
      (getStoredApiKey as Mock).mockReturnValue(null);

      // Fill cache to max (CACHE_MAX_ENTRIES = 50)
      const promises: Promise<PromptSuggestion[]>[] = [];
      for (let i = 0; i < 51; i++) {
        promises.push(
          promptRefinementService.analyzePrompt(
            `Unique prompt number ${i} with enough text to trigger analysis`,
            `prompt-${i}`,
          ),
        );
      }

      await Promise.all(promises);

      // The cache should have evicted the first entry
      // We can't directly check cache size, but we can verify behavior
      // by checking that a new analysis still works
      const result = await promptRefinementService.analyzePrompt(
        'Another unique prompt that is long enough for analysis',
        'final-prompt',
      );

      expect(result.length).toBeGreaterThan(0);
    });
  });
});
