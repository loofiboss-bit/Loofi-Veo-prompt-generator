import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RetryConfig } from '@core/utils/retry';

// ---------------------------------------------------------------------------
// Shared mocks
// ---------------------------------------------------------------------------

const {
  mockGetStoredApiKey,
  mockGetStoredApiKeyAsync,
  mockRetryOperation,
  mockGoogleGenAI,
  mockStartRequest,
  mockCompleteRequest,
} = vi.hoisted(() => ({
  mockGetStoredApiKey: vi.fn(),
  mockGetStoredApiKeyAsync: vi.fn(),
  mockRetryOperation: vi.fn(),
  mockGoogleGenAI: vi.fn(),
  mockStartRequest: vi.fn(),
  mockCompleteRequest: vi.fn(),
}));

vi.mock('../apiKeyService', () => ({
  getStoredApiKey: mockGetStoredApiKey,
  getStoredApiKeyAsync: mockGetStoredApiKeyAsync,
}));

vi.mock('@core/utils/retry', () => ({
  retryOperation: mockRetryOperation,
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: class MockGoogleGenAI {
    constructor(config: unknown) {
      return mockGoogleGenAI(config);
    }
  },
}));

vi.mock('../apiHealthMonitorService', () => ({
  apiHealthMonitorService: {
    startRequest: mockStartRequest,
  },
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

import { getAiClient, getAiClientAsync, resilientCall, cleanJson } from './aiClient';

describe('aiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStartRequest.mockReturnValue(mockCompleteRequest);
  });

  // =========================================================================
  // cleanJson tests
  // =========================================================================

  describe('cleanJson', () => {
    it('should return empty string for undefined input', () => {
      const result = cleanJson(undefined);
      expect(result).toBe('');
    });

    it('should return empty string for empty string input', () => {
      const result = cleanJson('');
      expect(result).toBe('');
    });

    it('should return plain JSON object unchanged', () => {
      const input = '{"name":"test","value":123}';
      const result = cleanJson(input);
      expect(result).toBe('{"name":"test","value":123}');
    });

    it('should return plain JSON array unchanged', () => {
      const input = '[1,2,3,4,5]';
      const result = cleanJson(input);
      expect(result).toBe('[1,2,3,4,5]');
    });

    it('should strip ```json markdown fences from object', () => {
      const input = '```json\n{"name":"test"}\n```';
      const result = cleanJson(input);
      expect(result).toBe('{"name":"test"}');
    });

    it('should strip ```json markdown fences from array', () => {
      const input = '```json\n[1,2,3]\n```';
      const result = cleanJson(input);
      expect(result).toBe('[1,2,3]');
    });

    it('should strip triple backticks without json keyword', () => {
      const input = '```\n{"key":"value"}\n```';
      const result = cleanJson(input);
      expect(result).toBe('{"key":"value"}');
    });

    it('should extract JSON object from text with leading content', () => {
      const input = 'Here is some text before\n{"name":"test"}';
      const result = cleanJson(input);
      expect(result).toBe('{"name":"test"}');
    });

    it('should extract JSON object from text with trailing content', () => {
      const input = '{"name":"test"}\nAnd some text after';
      const result = cleanJson(input);
      expect(result).toBe('{"name":"test"}');
    });

    it('should extract JSON object from text with both leading and trailing content', () => {
      const input = 'Before text\n{"name":"test"}\nAfter text';
      const result = cleanJson(input);
      expect(result).toBe('{"name":"test"}');
    });

    it('should handle nested objects correctly', () => {
      const input = '```json\n{"outer":{"inner":{"deep":"value"}}}\n```';
      const result = cleanJson(input);
      expect(result).toBe('{"outer":{"inner":{"deep":"value"}}}');
    });

    it('should handle nested arrays correctly', () => {
      const input = '```json\n[[1,2],[3,4],[5,6]]\n```';
      const result = cleanJson(input);
      expect(result).toBe('[[1,2],[3,4],[5,6]]');
    });

    it('should handle array of objects', () => {
      const input = '[{"id":1},{"id":2}]';
      const result = cleanJson(input);
      expect(result).toBe('[{"id":1},{"id":2}]');
    });

    it('should handle object with array properties', () => {
      const input = '{"items":[1,2,3],"name":"test"}';
      const result = cleanJson(input);
      expect(result).toBe('{"items":[1,2,3],"name":"test"}');
    });

    it('should pick first JSON structure when both { and [ exist', () => {
      const input = 'Text {"obj":"first"} more text [1,2,3]';
      const result = cleanJson(input);
      expect(result).toBe('{"obj":"first"}');
    });

    it('should pick array when it appears before object', () => {
      const input = 'Text [1,2,3] more text {"obj":"second"}';
      const result = cleanJson(input);
      expect(result).toBe('[1,2,3]');
    });

    it('should handle JSON with whitespace and newlines', () => {
      const input = '```json\n{\n  "name": "test",\n  "value": 123\n}\n```';
      const result = cleanJson(input);
      expect(result).toBe('{\n  "name": "test",\n  "value": 123\n}');
    });

    it('should handle multiple markdown fence blocks and extract first valid JSON', () => {
      const input = '```json\n{"first":"value"}\n```\n```json\n{"second":"value"}\n```';
      const result = cleanJson(input);
      expect(result).toBe('{"first":"value"}');
    });

    it('should return trimmed text if no valid JSON structure found', () => {
      const input = 'Just plain text without any JSON';
      const result = cleanJson(input);
      expect(result).toBe('Just plain text without any JSON');
    });

    it('should handle JSON with special characters', () => {
      const input = '{"text":"Hello\\"World","newline":"Line1\\nLine2"}';
      const result = cleanJson(input);
      expect(result).toBe('{"text":"Hello\\"World","newline":"Line1\\nLine2"}');
    });

    it('should handle empty object', () => {
      const input = '```json\n{}\n```';
      const result = cleanJson(input);
      expect(result).toBe('{}');
    });

    it('should handle empty array', () => {
      const input = '```json\n[]\n```';
      const result = cleanJson(input);
      expect(result).toBe('[]');
    });
  });

  // =========================================================================
  // getAiClient tests
  // =========================================================================

  describe('getAiClient', () => {
    it('should throw error when no API key is configured', () => {
      mockGetStoredApiKey.mockReturnValue(null);

      expect(() => getAiClient()).toThrow(
        'No API key configured. Please set your Gemini API key in Settings.',
      );
      expect(mockGetStoredApiKey).toHaveBeenCalledTimes(1);
      expect(mockGoogleGenAI).not.toHaveBeenCalled();
    });

    it('should throw error when API key is undefined', () => {
      mockGetStoredApiKey.mockReturnValue(undefined);

      expect(() => getAiClient()).toThrow(
        'No API key configured. Please set your Gemini API key in Settings.',
      );
      expect(mockGetStoredApiKey).toHaveBeenCalledTimes(1);
    });

    it('should throw error when API key is empty string', () => {
      mockGetStoredApiKey.mockReturnValue('');

      expect(() => getAiClient()).toThrow(
        'No API key configured. Please set your Gemini API key in Settings.',
      );
      expect(mockGetStoredApiKey).toHaveBeenCalledTimes(1);
    });

    it('should return GoogleGenAI instance when API key is available', () => {
      const mockClient = { models: { generateContent: vi.fn() } };
      mockGetStoredApiKey.mockReturnValue('test-api-key-12345');
      mockGoogleGenAI.mockReturnValue(mockClient);

      const result = getAiClient();

      expect(mockGetStoredApiKey).toHaveBeenCalledTimes(1);
      expect(mockGoogleGenAI).toHaveBeenCalledWith({ apiKey: 'test-api-key-12345' });
      expect(result).toBe(mockClient);
    });
  });

  describe('getAiClientAsync', () => {
    it('should throw error when no API key is configured', async () => {
      mockGetStoredApiKeyAsync.mockResolvedValue(null);

      await expect(getAiClientAsync()).rejects.toThrow(
        'No API key configured. Please set your Gemini API key in Settings.',
      );
      expect(mockGoogleGenAI).not.toHaveBeenCalled();
    });

    it('should return GoogleGenAI instance when API key is available', async () => {
      const mockClient = { models: { generateContent: vi.fn() } };
      mockGetStoredApiKeyAsync.mockResolvedValue('test-api-key-12345');
      mockGoogleGenAI.mockReturnValue(mockClient);

      const result = await getAiClientAsync();

      expect(mockGoogleGenAI).toHaveBeenCalledWith({ apiKey: 'test-api-key-12345' });
      expect(result).toBe(mockClient);
    });
  });

  // =========================================================================
  // resilientCall tests
  // =========================================================================

  describe('resilientCall', () => {
    it('should call retryOperation with correct default parameters', async () => {
      const mockFn = vi.fn().mockResolvedValue({ response: 'success' });
      const mockResponse = { response: 'success' };
      mockRetryOperation.mockResolvedValue(mockResponse);

      const result = await resilientCall(mockFn, {
        endpoint: 'test-endpoint',
      });

      expect(mockRetryOperation).toHaveBeenCalledWith(mockFn, 3, 1000, {
        circuitBreakerEndpoint: 'test-endpoint',
      });
      expect(result).toBe(mockResponse);
    });

    it('should pass custom retryConfig to retryOperation', async () => {
      const mockFn = vi.fn().mockResolvedValue({ response: 'success' });
      const mockResponse = { response: 'success' };
      mockRetryOperation.mockResolvedValue(mockResponse);

      const customRetryConfig = {
        maxRetries: 5,
        baseDelay: 2000,
      };

      await resilientCall(mockFn, {
        endpoint: 'custom-endpoint',
        retryConfig: customRetryConfig as unknown as Partial<RetryConfig>,
      });

      expect(mockRetryOperation).toHaveBeenCalledWith(mockFn, 3, 1000, {
        circuitBreakerEndpoint: 'custom-endpoint',
        maxRetries: 5,
        baseDelay: 2000,
      });
    });

    it('should record successful request on health monitor', async () => {
      const mockFn = vi.fn().mockResolvedValue({ response: 'success' });
      const mockResponse = { response: 'success' };
      mockRetryOperation.mockResolvedValue(mockResponse);

      await resilientCall(mockFn, {
        endpoint: 'success-endpoint',
      });

      expect(mockStartRequest).toHaveBeenCalledWith('success-endpoint');
      expect(mockCompleteRequest).toHaveBeenCalledWith(true);
    });

    it('should record failed request on health monitor and rethrow error', async () => {
      const mockFn = vi.fn();
      const testError = new Error('API request failed');
      mockRetryOperation.mockRejectedValue(testError);

      await expect(
        resilientCall(mockFn, {
          endpoint: 'fail-endpoint',
        }),
      ).rejects.toThrow('API request failed');

      expect(mockStartRequest).toHaveBeenCalledWith('fail-endpoint');
      expect(mockCompleteRequest).toHaveBeenCalledWith(false);
    });

    it('should handle endpoint parameter correctly in health monitoring', async () => {
      const mockFn = vi.fn().mockResolvedValue({ response: 'success' });
      mockRetryOperation.mockResolvedValue({ response: 'success' });

      await resilientCall(mockFn, {
        endpoint: '/api/generate-content',
        model: 'gemini-pro',
      });

      expect(mockStartRequest).toHaveBeenCalledWith('/api/generate-content');
      expect(mockRetryOperation).toHaveBeenCalledWith(mockFn, 3, 1000, {
        circuitBreakerEndpoint: '/api/generate-content',
      });
    });

    it('should return the response from retryOperation', async () => {
      const mockFn = vi.fn();
      const expectedResponse = {
        candidates: [{ content: { text: 'Generated content' } }],
        usage: { inputTokens: 10, outputTokens: 20 },
      };
      mockRetryOperation.mockResolvedValue(expectedResponse);

      const result = await resilientCall(mockFn, {
        endpoint: 'test-endpoint',
      });

      expect(result).toEqual(expectedResponse);
    });

    it('should call completeRequest even when error is thrown', async () => {
      const mockFn = vi.fn();
      const testError = new Error('Network timeout');
      mockRetryOperation.mockRejectedValue(testError);

      try {
        await resilientCall(mockFn, {
          endpoint: 'timeout-endpoint',
        });
      } catch (_error) {
        // Expected to throw
      }

      expect(mockCompleteRequest).toHaveBeenCalledTimes(1);
      expect(mockCompleteRequest).toHaveBeenCalledWith(false);
    });

    it('should merge retryConfig with circuit breaker endpoint', async () => {
      const mockFn = vi.fn().mockResolvedValue({ response: 'success' });
      mockRetryOperation.mockResolvedValue({ response: 'success' });

      await resilientCall(mockFn, {
        endpoint: 'merge-endpoint',
        retryConfig: {
          shouldRetry: (_error: unknown) => true,
        } as unknown as Partial<RetryConfig>,
      });

      expect(mockRetryOperation).toHaveBeenCalledWith(mockFn, 3, 1000, {
        circuitBreakerEndpoint: 'merge-endpoint',
        shouldRetry: expect.any(Function),
      });
    });

    it('should handle model option being passed through', async () => {
      const mockFn = vi.fn().mockResolvedValue({ response: 'success' });
      mockRetryOperation.mockResolvedValue({ response: 'success' });

      await resilientCall(mockFn, {
        endpoint: 'model-endpoint',
        model: 'gemini-1.5-pro',
      });

      // Model is in options but not used in the current implementation
      // Just verify the call completes successfully
      expect(mockStartRequest).toHaveBeenCalledWith('model-endpoint');
      expect(mockCompleteRequest).toHaveBeenCalledWith(true);
    });
  });
});
