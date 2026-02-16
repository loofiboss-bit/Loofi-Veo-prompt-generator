import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Shared mocks
// ---------------------------------------------------------------------------

vi.mock('../loggerService', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock('../apiKeyService', () => ({
  getStoredApiKey: vi.fn().mockReturnValue('test-api-key'),
}));

const mockGenerateContent = vi.fn();
vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent: mockGenerateContent };
  },
  Type: { OBJECT: 'OBJECT', STRING: 'STRING', ARRAY: 'ARRAY', BOOLEAN: 'BOOLEAN' },
  Modality: { IMAGE: 'IMAGE', AUDIO: 'AUDIO' },
}));

vi.mock('@core/utils/retry', () => ({
  retryOperation: vi.fn((fn: () => unknown) => fn()),
}));

vi.mock('@core/utils/apiErrors', () => ({
  parseAndThrowApiError: vi.fn((error: unknown) => {
    throw error;
  }),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

import {
  generateConceptArt,
  generateStoryboard,
  generateStyleThumbnail,
  editImageWithGemini,
  generateOutpaint,
  describeImage,
  analyzeVideo,
  analyzeImageForSFX,
  analyzeVideoForSFX,
  generateAssetTags,
} from '../gemini/geminiVisionService';

// Helper to build a mock response with inline image data
function mockImageResponse(mimeType = 'image/png', data = 'base64imagedata') {
  return {
    candidates: [
      {
        content: {
          parts: [{ inlineData: { mimeType, data } }],
        },
      },
    ],
  };
}

describe('geminiVisionService — integration', () => {
  beforeEach(() => vi.clearAllMocks());

  // ── Image generation ──────────────────────────────────────────
  describe('generateConceptArt', () => {
    it('should return a data URI from the AI response', async () => {
      mockGenerateContent.mockResolvedValueOnce(mockImageResponse());

      const result = await generateConceptArt('A forest at dusk');
      expect(result).toBe('data:image/png;base64,base64imagedata');
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it('should pass aspect ratio to the config', async () => {
      mockGenerateContent.mockResolvedValueOnce(mockImageResponse());

      await generateConceptArt('test', { aspectRatio: '16:9' });
      const callArg = mockGenerateContent.mock.calls[0][0];
      expect(callArg.config.imageConfig.aspectRatio).toBe('16:9');
    });

    it('should throw when no image is generated', async () => {
      mockGenerateContent.mockResolvedValueOnce({ candidates: [{ content: { parts: [] } }] });

      await expect(generateConceptArt('test')).rejects.toThrow('No image generated');
    });
  });

  describe('generateStoryboard', () => {
    it('should return 4 images from 4 shot types', async () => {
      mockGenerateContent.mockResolvedValue(mockImageResponse());

      const results = await generateStoryboard('hero saves the day', '16:9');
      expect(results).toHaveLength(4);
      results.forEach((r) => expect(r).toBe('data:image/png;base64,base64imagedata'));
      expect(mockGenerateContent).toHaveBeenCalledTimes(4);
    });

    it('should propagate errors', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API quota'));
      await expect(generateStoryboard('test', '16:9')).rejects.toThrow('API quota');
    });
  });

  describe('generateStyleThumbnail', () => {
    it('should delegate to generateConceptArt with 1:1 ratio', async () => {
      mockGenerateContent.mockResolvedValueOnce(mockImageResponse());
      const result = await generateStyleThumbnail('neon cityscape');
      expect(result).toBe('data:image/png;base64,base64imagedata');
    });
  });

  // ── Image editing ─────────────────────────────────────────────
  describe('editImageWithGemini', () => {
    it('should return edited image bytes and mime type', async () => {
      mockGenerateContent.mockResolvedValueOnce(mockImageResponse('image/png', 'editeddata'));

      const result = await editImageWithGemini('origdata', 'image/png', 'make it darker');
      expect(result.newImageBytes).toBe('editeddata');
      expect(result.newMimeType).toBe('image/png');
    });

    it('should throw when no edited image returned', async () => {
      mockGenerateContent.mockResolvedValueOnce({ candidates: [{ content: { parts: [] } }] });
      await expect(editImageWithGemini('data', 'image/png', 'edit')).rejects.toThrow(
        'No edited image returned',
      );
    });
  });

  describe('generateOutpaint', () => {
    it('should return outpainted image data URI', async () => {
      mockGenerateContent.mockResolvedValueOnce(mockImageResponse());
      const result = await generateOutpaint('composite', 'mask', 'extend the background');
      expect(result).toBe('data:image/png;base64,base64imagedata');
    });
  });

  // ── Analysis ──────────────────────────────────────────────────
  describe('describeImage', () => {
    it('should return a text description', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: 'A lone figure on a cliff at sunset.',
      });

      const result = await describeImage('imgdata', 'image/jpeg');
      expect(result).toContain('lone figure');
    });

    it('should return default text when AI returns empty', async () => {
      mockGenerateContent.mockResolvedValueOnce({ text: '' });
      const result = await describeImage('imgdata', 'image/png');
      expect(result).toBe('A cinematic scene.');
    });
  });

  describe('analyzeVideo', () => {
    it('should return analysis text', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: 'The video shows a car chase through a neon city.',
      });

      const result = await analyzeVideo('videodata', 'video/mp4', 'Describe this video');
      expect(result).toContain('car chase');
    });
  });

  describe('analyzeImageForSFX', () => {
    it('should return an array of sound effect suggestions', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify(['footsteps', 'wind', 'birds', 'water', 'leaves']),
      });

      const result = await analyzeImageForSFX('imgdata');
      expect(result).toHaveLength(5);
      expect(result[0]).toBe('footsteps');
    });
  });

  describe('analyzeVideoForSFX', () => {
    it('should return timestamped SFX events', async () => {
      const events = [
        { timestamp: 2, description: 'door slam' },
        { timestamp: 5, description: 'glass breaking' },
      ];
      mockGenerateContent.mockResolvedValueOnce({ text: JSON.stringify(events) });

      const result = await analyzeVideoForSFX([
        'frame0',
        'frame1',
        'frame2',
        'frame3',
        'frame4',
        'frame5',
      ]);
      expect(result).toHaveLength(2);
      expect(result[0].timestamp).toBe(2);
    });
  });

  describe('generateAssetTags', () => {
    it('should return keyword tags for a visual asset', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify(['landscape', 'neon', 'night']),
      });

      const result = await generateAssetTags('assetdata', 'image/png');
      expect(result).toEqual(['landscape', 'neon', 'night']);
    });

    it('should return empty array on failure', async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error('fail'));
      const result = await generateAssetTags('data', 'image/png');
      expect(result).toEqual([]);
    });
  });
});
