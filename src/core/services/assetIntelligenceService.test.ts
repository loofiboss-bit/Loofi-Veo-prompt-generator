import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { assetIntelligenceService } from './assetIntelligenceService';
import type { AssetTag } from '@core/types';
import { CACHE_TTL_MS } from '@core/constants/optimizationRules';

// Mock dependencies
vi.mock('@core/services/gemini/aiClient', () => ({
  getAiClient: vi.fn(),
  cleanJson: vi.fn((text: string) => text),
  resilientCall: vi.fn(),
}));

vi.mock('@core/services/apiKeyService', () => ({
  getStoredApiKey: vi.fn(),
}));

vi.mock('@core/services/loggerService', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Import mocked dependencies to manipulate them
import { getAiClient, cleanJson, resilientCall } from '@core/services/gemini/aiClient';
import { getStoredApiKey } from '@core/services/apiKeyService';
import { logger } from '@core/services/loggerService';

describe('AssetIntelligenceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assetIntelligenceService.clearCache();
  });

  describe('Basic functionality', () => {
    it('returns empty for empty dataUrl', async () => {
      const result = await assetIntelligenceService.analyzeAsset('asset-1', '');
      expect(result).toEqual([]);
    });

    it('returns empty when no API key', async () => {
      (getStoredApiKey as Mock).mockReturnValue(null);

      const dataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
      const result = await assetIntelligenceService.analyzeAsset('asset-1', dataUrl);

      expect(result).toEqual([]);
      expect(logger.info).toHaveBeenCalledWith('No API key — skipping asset intelligence analysis');
    });

    it('returns cached results on cache hit', async () => {
      (getStoredApiKey as Mock).mockReturnValue('test-api-key');
      (getAiClient as Mock).mockReturnValue({
        models: {
          generateContent: vi.fn(),
        },
      });

      const mockTags: AssetTag[] = [
        {
          id: 'asset-1-ai-0',
          assetId: 'asset-1',
          label: 'outdoor',
          category: 'scene',
          confidence: 0.9,
          source: 'ai',
        },
      ];

      const jsonString = JSON.stringify([{ label: 'outdoor', category: 'scene', confidence: 0.9 }]);
      (resilientCall as Mock).mockResolvedValue({
        text: jsonString,
      });
      (cleanJson as Mock).mockReturnValue(jsonString);

      const dataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';

      // First call - should trigger AI
      const result1 = await assetIntelligenceService.analyzeAsset('asset-1', dataUrl);
      expect(result1).toHaveLength(1);
      expect(resilientCall).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const result2 = await assetIntelligenceService.analyzeAsset('asset-1', dataUrl);
      expect(result2).toEqual(result1);
      expect(resilientCall).toHaveBeenCalledTimes(1); // No additional call
    });
  });

  describe('Gemini Vision analysis', () => {
    beforeEach(() => {
      (getStoredApiKey as Mock).mockReturnValue('test-api-key');
      (getAiClient as Mock).mockReturnValue({
        models: {
          generateContent: vi.fn(),
        },
      });
    });

    it('parses valid JSON vision response', async () => {
      const mockResponse = [
        { label: 'outdoor', category: 'scene', confidence: 0.9 },
        { label: 'dramatic', category: 'mood', confidence: 0.8 },
        { label: 'person', category: 'subject', confidence: 0.95 },
      ];

      const jsonString = JSON.stringify(mockResponse);
      (resilientCall as Mock).mockResolvedValue({
        text: jsonString,
      });
      (cleanJson as Mock).mockReturnValue(jsonString);

      const dataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
      const result = await assetIntelligenceService.analyzeAsset('asset-1', dataUrl);

      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({
        assetId: 'asset-1',
        label: 'outdoor',
        category: 'scene',
        confidence: 0.9,
        source: 'ai',
      });
      expect(result[0].id).toMatch(/^asset-1-ai-\d+$/);
    });

    it('handles parse errors gracefully', async () => {
      (resilientCall as Mock).mockResolvedValue({
        text: 'This is not valid JSON',
      });
      (cleanJson as Mock).mockReturnValue('This is not valid JSON');

      const dataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
      const result = await assetIntelligenceService.analyzeAsset('asset-1', dataUrl);

      expect(result).toEqual([]);
      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to parse Gemini Vision response for asset analysis',
      );
    });

    it('handles API errors gracefully', async () => {
      (resilientCall as Mock).mockRejectedValue(new Error('API connection failed'));

      const dataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
      const result = await assetIntelligenceService.analyzeAsset('asset-1', dataUrl);

      expect(result).toEqual([]);
      expect(logger.warn).toHaveBeenCalledWith('Asset intelligence analysis failed', {
        error: expect.any(Error),
        assetId: 'asset-1',
      });
    });

    it('filters out invalid tag entries', async () => {
      const mockResponse = [
        { label: 'outdoor', category: 'scene', confidence: 0.9 },
        { label: 'dramatic' }, // Missing category and confidence
        { category: 'mood', confidence: 0.8 }, // Missing label
        { label: 'happy', category: 'mood', confidence: 'invalid' }, // Invalid confidence type
      ];

      const jsonString = JSON.stringify(mockResponse);
      (resilientCall as Mock).mockResolvedValue({
        text: jsonString,
      });
      (cleanJson as Mock).mockReturnValue(jsonString);

      const dataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
      const result = await assetIntelligenceService.analyzeAsset('asset-1', dataUrl);

      expect(result).toHaveLength(1);
      expect(result[0].label).toBe('outdoor');
    });

    it('handles non-array response gracefully', async () => {
      const jsonString = JSON.stringify({ error: 'Invalid request' });
      (resilientCall as Mock).mockResolvedValue({
        text: jsonString,
      });
      (cleanJson as Mock).mockReturnValue(jsonString);

      const dataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
      const result = await assetIntelligenceService.analyzeAsset('asset-1', dataUrl);

      expect(result).toEqual([]);
    });

    it('extracts mime type from data URL correctly', async () => {
      const mockGenerateContent = vi.fn();
      (getAiClient as Mock).mockReturnValue({
        models: {
          generateContent: mockGenerateContent,
        },
      });

      (resilientCall as Mock).mockImplementation((fn) => fn());
      mockGenerateContent.mockResolvedValue({ text: '[]' });

      const dataUrl = 'data:image/png;base64,iVBORw0KGgo=';
      await assetIntelligenceService.analyzeAsset('asset-1', dataUrl);

      expect(resilientCall).toHaveBeenCalled();
      const callFn = (resilientCall as Mock).mock.calls[0][0];
      mockGenerateContent.mockClear();
      await callFn();

      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          contents: expect.arrayContaining([
            expect.objectContaining({
              parts: expect.arrayContaining([
                expect.objectContaining({
                  inlineData: expect.objectContaining({
                    mimeType: 'image/png',
                    data: 'iVBORw0KGgo=',
                  }),
                }),
              ]),
            }),
          ]),
        }),
      );
    });
  });

  describe('generateTagsFromDescription', () => {
    it('returns empty for empty text', () => {
      const result = assetIntelligenceService.generateTagsFromDescription('asset-1', '');
      expect(result).toEqual([]);
    });

    it('returns empty for whitespace-only text', () => {
      const result = assetIntelligenceService.generateTagsFromDescription('asset-1', '   ');
      expect(result).toEqual([]);
    });

    it('detects scene keywords', () => {
      const description = 'A beautiful outdoor scene in the forest with urban elements';
      const result = assetIntelligenceService.generateTagsFromDescription('asset-1', description);

      const sceneLabels = result.filter((t) => t.category === 'scene').map((t) => t.label);
      expect(sceneLabels).toContain('outdoor');
      expect(sceneLabels).toContain('forest');
      expect(sceneLabels).toContain('urban');
    });

    it('detects mood keywords', () => {
      const description = 'A dramatic and mysterious scene with peaceful undertones';
      const result = assetIntelligenceService.generateTagsFromDescription('asset-1', description);

      const moodLabels = result.filter((t) => t.category === 'mood').map((t) => t.label);
      expect(moodLabels).toContain('dramatic');
      expect(moodLabels).toContain('mysterious');
      expect(moodLabels).toContain('peaceful');
    });

    it('assigns manual source to all tags', () => {
      const description = 'An outdoor dramatic scene';
      const result = assetIntelligenceService.generateTagsFromDescription('asset-1', description);

      expect(result.every((t) => t.source === 'manual')).toBe(true);
    });

    it('assigns correct confidence scores', () => {
      const description = 'An outdoor dramatic scene';
      const result = assetIntelligenceService.generateTagsFromDescription('asset-1', description);

      const sceneTag = result.find((t) => t.category === 'scene');
      const moodTag = result.find((t) => t.category === 'mood');

      expect(sceneTag?.confidence).toBe(0.7);
      expect(moodTag?.confidence).toBe(0.6);
    });

    it('generates unique IDs for each tag', () => {
      const description = 'outdoor forest dramatic peaceful';
      const result = assetIntelligenceService.generateTagsFromDescription('asset-1', description);

      const ids = result.map((t) => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('includes assetId in all tags', () => {
      const description = 'outdoor dramatic';
      const result = assetIntelligenceService.generateTagsFromDescription('asset-123', description);

      expect(result.every((t) => t.assetId === 'asset-123')).toBe(true);
    });

    it('is case-insensitive in keyword detection', () => {
      const description = 'An OUTDOOR scene with DRAMATIC lighting';
      const result = assetIntelligenceService.generateTagsFromDescription('asset-1', description);

      const labels = result.map((t) => t.label);
      expect(labels).toContain('outdoor');
      expect(labels).toContain('dramatic');
    });
  });

  describe('Cache management', () => {
    it('clearCache clears the cache', async () => {
      (getStoredApiKey as Mock).mockReturnValue('test-api-key');
      (getAiClient as Mock).mockReturnValue({
        models: { generateContent: vi.fn() },
      });
      const jsonString = JSON.stringify([{ label: 'outdoor', category: 'scene', confidence: 0.9 }]);
      (resilientCall as Mock).mockResolvedValue({
        text: jsonString,
      });
      (cleanJson as Mock).mockReturnValue(jsonString);

      const dataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';

      // Populate cache
      await assetIntelligenceService.analyzeAsset('asset-1', dataUrl);
      expect(resilientCall).toHaveBeenCalledTimes(1);

      // Clear cache
      assetIntelligenceService.clearCache();

      // Should trigger AI again
      await assetIntelligenceService.analyzeAsset('asset-1', dataUrl);
      expect(resilientCall).toHaveBeenCalledTimes(2);
    });

    it('cache expiration works', async () => {
      vi.useFakeTimers();

      (getStoredApiKey as Mock).mockReturnValue('test-api-key');
      (getAiClient as Mock).mockReturnValue({
        models: { generateContent: vi.fn() },
      });
      const jsonString = JSON.stringify([{ label: 'outdoor', category: 'scene', confidence: 0.9 }]);
      (resilientCall as Mock).mockResolvedValue({
        text: jsonString,
      });
      (cleanJson as Mock).mockReturnValue(jsonString);

      const dataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';

      // First call
      await assetIntelligenceService.analyzeAsset('asset-1', dataUrl);
      expect(resilientCall).toHaveBeenCalledTimes(1);

      // Advance time beyond TTL
      vi.advanceTimersByTime(CACHE_TTL_MS + 1000);

      // Should trigger AI again due to expired cache
      await assetIntelligenceService.analyzeAsset('asset-1', dataUrl);
      expect(resilientCall).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });
  });
});
