import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock logger
vi.mock('./loggerService', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock apiKeyService
vi.mock('./apiKeyService', () => ({
  getStoredApiKey: vi.fn().mockReturnValue('test-api-key'),
  getStoredApiKeyAsync: vi.fn().mockResolvedValue('test-api-key'),
}));

// Mock @google/genai
const mockGenerateContent = vi.fn().mockResolvedValue({ text: '{}' });
vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent: mockGenerateContent };
  },
  Type: { OBJECT: 'OBJECT', STRING: 'STRING', ARRAY: 'ARRAY', BOOLEAN: 'BOOLEAN' },
  Modality: { IMAGE: 'IMAGE', AUDIO: 'AUDIO' },
}));

// Mock retry — just execute immediately
vi.mock('@core/utils/retry', () => ({
  retryOperation: vi.fn((fn: () => unknown) => fn()),
}));

// Mock promptBuilder
vi.mock('./promptBuilder', () => ({
  buildGeminiPrompt: vi.fn().mockReturnValue('built prompt'),
}));

// Mock apiErrors
vi.mock('@core/utils/apiErrors', () => ({
  parseAndThrowApiError: vi.fn((error: unknown) => {
    throw error;
  }),
}));

import { cleanJson } from './geminiService';

describe('geminiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── cleanJson ─────────────────────────────────────────────────
  describe('cleanJson', () => {
    it('should return empty string for undefined input', () => {
      expect(cleanJson(undefined)).toBe('');
    });

    it('should return empty string for empty string input', () => {
      expect(cleanJson('')).toBe('');
    });

    it('should strip markdown json code fences from object', () => {
      const input = '```json\n{"key": "value"}\n```';
      expect(cleanJson(input)).toBe('{"key": "value"}');
    });

    it('should strip markdown code fences without json label', () => {
      const input = '```\n{"key": "value"}\n```';
      expect(cleanJson(input)).toBe('{"key": "value"}');
    });

    it('should handle JSON array wrapped in code fences', () => {
      const input = '```json\n["a", "b", "c"]\n```';
      expect(cleanJson(input)).toBe('["a", "b", "c"]');
    });

    it('should extract JSON object from surrounding text', () => {
      const input = 'Here is the result:\n{"name": "test"}\nEnd of response.';
      expect(cleanJson(input)).toBe('{"name": "test"}');
    });

    it('should extract JSON array from surrounding text', () => {
      const input = 'The list is: ["item1", "item2"] hope this helps.';
      expect(cleanJson(input)).toBe('["item1", "item2"]');
    });

    it('should handle nested JSON objects', () => {
      const input = '{"outer": {"inner": "value"}}';
      expect(cleanJson(input)).toBe('{"outer": {"inner": "value"}}');
    });

    it('should handle nested JSON arrays', () => {
      const input = '[["a", "b"], ["c", "d"]]';
      expect(cleanJson(input)).toBe('[["a", "b"], ["c", "d"]]');
    });

    it('should prefer object when { comes before [', () => {
      const input = '{"items": ["a", "b"]}';
      expect(cleanJson(input)).toBe('{"items": ["a", "b"]}');
    });

    it('should prefer array when [ comes before {', () => {
      const input = '[{"key": "value"}]';
      expect(cleanJson(input)).toBe('[{"key": "value"}]');
    });

    it('should return trimmed text when no brackets are found', () => {
      const input = '  just plain text  ';
      expect(cleanJson(input)).toBe('just plain text');
    });

    it('should handle text with only opening bracket but no closing', () => {
      const input = 'broken { json';
      // startIndex found but no matching closing bracket — falls through
      // The { is found at index 7, but lastIndexOf('}') is -1
      // So it returns the trimmed/stripped text as-is
      expect(cleanJson(input)).toBe('broken { json');
    });

    it('should handle multiple code fence markers', () => {
      const input = '```json\n```json\n{"key": "value"}\n```\n```';
      expect(cleanJson(input)).toBe('{"key": "value"}');
    });

    it('should handle real-world AI response with preamble and postamble', () => {
      const input = `Sure! Here is the JSON you requested:

\`\`\`json
{
  "artStyle": "cinematic",
  "cameraMovement": "dolly zoom",
  "colorPalette": "warm tones"
}
\`\`\`

Let me know if you need anything else!`;
      const result = cleanJson(input);
      const parsed = JSON.parse(result);
      expect(parsed.artStyle).toBe('cinematic');
      expect(parsed.cameraMovement).toBe('dolly zoom');
      expect(parsed.colorPalette).toBe('warm tones');
    });

    it('should handle array response from AI with explanation text', () => {
      const input =
        'Here are some suggestions:\n["noir", "cyberpunk", "steampunk"]\nThese are popular styles.';
      const result = cleanJson(input);
      const parsed = JSON.parse(result);
      expect(parsed).toEqual(['noir', 'cyberpunk', 'steampunk']);
    });
  });

  // ─── generateSoundEffect ──────────────────────────────────────
  describe('generateSoundEffect', () => {
    it('should delegate to generateSpeech with sound effect prefix', async () => {
      // generateSpeech calls getAiClient().models.generateContent
      // We mock it at the API level — the response should come back via generateSpeech's internals
      mockGenerateContent.mockResolvedValueOnce({
        candidates: [
          {
            content: {
              parts: [
                {
                  inlineData: {
                    mimeType: 'audio/wav',
                    data: 'base64audiodata',
                  },
                },
              ],
            },
          },
        ],
      });

      const { generateSoundEffect } = await import('./geminiService');
      const result = await generateSoundEffect('explosion');

      // Verify the API was called with the sound effect prefix in the contents
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
      const callArg = mockGenerateContent.mock.calls[0][0];
      const text = JSON.stringify(callArg.contents);
      expect(text).toContain('(Sound Effect) explosion');
      // generateSpeech returns raw base64 data (not a data URI)
      expect(result).toBe('base64audiodata');
    });
  });

  // ─── generateStoryboard ───────────────────────────────────────
  describe('generateStoryboard', () => {
    it('should generate 4 concept art prompts with shot-type prefixes', async () => {
      // generateConceptArt calls generateContent; mock it to return image data
      mockGenerateContent.mockResolvedValue({
        candidates: [
          {
            content: {
              parts: [
                {
                  inlineData: {
                    mimeType: 'image/png',
                    data: 'base64imagedata',
                  },
                },
              ],
            },
          },
        ],
      });

      const { generateStoryboard } = await import('./geminiService');
      const results = await generateStoryboard('A hero saves the day', '16:9');

      expect(results).toHaveLength(4);
      // All 4 should be data URIs
      results.forEach((result) => {
        expect(result).toBe('data:image/png;base64,base64imagedata');
      });

      // Verify 4 API calls were made with correct prefixes
      expect(mockGenerateContent).toHaveBeenCalledTimes(4);
      const callTexts = mockGenerateContent.mock.calls.map((call: Array<Record<string, unknown>>) =>
        JSON.stringify(call[0]),
      );
      expect(callTexts.some((t: string) => t.includes('Opening shot:'))).toBe(true);
      expect(callTexts.some((t: string) => t.includes('Action shot:'))).toBe(true);
      expect(callTexts.some((t: string) => t.includes('Detail shot:'))).toBe(true);
      expect(callTexts.some((t: string) => t.includes('Closing shot:'))).toBe(true);
    });

    it('should propagate errors from generateConceptArt', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API quota exceeded'));

      const { generateStoryboard } = await import('./geminiService');
      await expect(generateStoryboard('prompt', '16:9')).rejects.toThrow('API quota exceeded');
    });
  });
});
