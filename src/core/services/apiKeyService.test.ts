/**
 * API Key Service Unit Tests
 * Tests for memory-only browser API key management and legacy-storage scrubbing
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getStoredApiKey,
  getStoredApiKeyAsync,
  setStoredApiKey,
  setStoredApiKeyAsync,
  clearStoredApiKey,
  hasApiKey,
  hasApiKeyAsync,
} from './apiKeyService';

// Mock logger
vi.mock('@core/services/loggerService', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('apiKeyService', () => {
  const TEST_API_KEY = 'test-api-key-123456';
  const STORAGE_KEY = 'veo-gemini-api-key';

  beforeEach(() => {
    clearStoredApiKey();
    localStorage.clear();
  });

  afterEach(() => {
    clearStoredApiKey();
    localStorage.clear();
  });

  describe('getStoredApiKey', () => {
    it('should return null when no key is stored', () => {
      const key = getStoredApiKey();
      expect(key).toBeNull();
    });

    it('should return stored API key when available', () => {
      setStoredApiKey(TEST_API_KEY);
      const key = getStoredApiKey();
      expect(key).toBe(TEST_API_KEY);
    });

    it('should return null when window is undefined', () => {
      const originalWindow = global.window;
      // @ts-expect-error - Testing SSR scenario
      delete global.window;

      const key = getStoredApiKey();
      expect(key).toBeNull();

      global.window = originalWindow;
    });

    it('should return null when localStorage throws error', () => {
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');
      getItemSpy.mockImplementation(() => {
        throw new Error('localStorage error');
      });

      const key = getStoredApiKey();
      expect(key).toBeNull();

      getItemSpy.mockRestore();
    });

    it('should import a legacy plaintext key into session memory and scrub storage', async () => {
      const legacyFixture = 'legacy-migration-fixture';
      localStorage.setItem(STORAGE_KEY, legacyFixture);
      vi.resetModules();
      const freshService = await import('./apiKeyService');

      await expect(freshService.getStoredApiKeyAsync()).resolves.toBe(legacyFixture);
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
      expect(freshService.getStoredApiKey()).toBe(legacyFixture);
    });
  });

  describe('setStoredApiKey', () => {
    it('should never store an API key in localStorage', () => {
      setStoredApiKey(TEST_API_KEY);
      const stored = localStorage.getItem(STORAGE_KEY);
      expect(stored).toBeNull();
    });

    it('should scrub an existing plaintext API key', () => {
      localStorage.setItem(STORAGE_KEY, 'old-key');
      setStoredApiKey(TEST_API_KEY);
      const stored = localStorage.getItem(STORAGE_KEY);
      expect(stored).toBeNull();
      expect(getStoredApiKey()).toBe(TEST_API_KEY);
    });

    it('should do nothing when window is undefined', () => {
      const originalWindow = global.window;
      // @ts-expect-error - Testing SSR scenario
      delete global.window;

      setStoredApiKey(TEST_API_KEY);
      // No error should be thrown

      global.window = originalWindow;
    });

    it('should log error when legacy storage cannot be scrubbed', async () => {
      const { logger } = await import('@core/services/loggerService');
      const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem');
      removeItemSpy.mockImplementation(() => {
        throw new Error('localStorage error');
      });

      setStoredApiKey(TEST_API_KEY);

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to clear legacy plaintext API key:',
        expect.any(Error),
      );

      removeItemSpy.mockRestore();
    });
  });

  describe('clearStoredApiKey', () => {
    it('should remove API key from localStorage', () => {
      localStorage.setItem(STORAGE_KEY, TEST_API_KEY);
      clearStoredApiKey();
      const stored = localStorage.getItem(STORAGE_KEY);
      expect(stored).toBeNull();
    });

    it('should do nothing when no key is stored', () => {
      clearStoredApiKey();
      // No error should be thrown
      const stored = localStorage.getItem(STORAGE_KEY);
      expect(stored).toBeNull();
    });

    it('should do nothing when window is undefined', () => {
      const originalWindow = global.window;
      // @ts-expect-error - Testing SSR scenario
      delete global.window;

      clearStoredApiKey();
      // No error should be thrown

      global.window = originalWindow;
    });

    it('should log error when localStorage throws error', async () => {
      const { logger } = await import('@core/services/loggerService');
      const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem');
      removeItemSpy.mockImplementation(() => {
        throw new Error('localStorage error');
      });

      clearStoredApiKey();

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to clear legacy plaintext API key:',
        expect.any(Error),
      );

      removeItemSpy.mockRestore();
    });
  });

  describe('hasApiKey', () => {
    it('should return true when API key exists', () => {
      setStoredApiKey(TEST_API_KEY);
      expect(hasApiKey()).toBe(true);
    });

    it('should return false when no key is stored', () => {
      expect(hasApiKey()).toBe(false);
    });

    it('should return false when stored key is empty string', () => {
      localStorage.setItem(STORAGE_KEY, '');
      expect(hasApiKey()).toBe(false);
    });

    it('should return true when key has valid length', () => {
      setStoredApiKey('a');
      expect(hasApiKey()).toBe(true);
    });
  });

  describe('async helpers', () => {
    it('should resolve stored API key asynchronously from localStorage fallback', async () => {
      setStoredApiKey(TEST_API_KEY);

      await expect(getStoredApiKeyAsync()).resolves.toBe(TEST_API_KEY);
    });

    it('should report async API key presence after async storage writes', async () => {
      await setStoredApiKeyAsync(TEST_API_KEY);

      await expect(hasApiKeyAsync()).resolves.toBe(true);
    });
  });

  describe('integration scenarios', () => {
    it('should allow setting and retrieving the same key', () => {
      setStoredApiKey(TEST_API_KEY);
      const retrieved = getStoredApiKey();
      expect(retrieved).toBe(TEST_API_KEY);
    });

    it('should allow clearing and return null', () => {
      setStoredApiKey(TEST_API_KEY);
      clearStoredApiKey();
      const retrieved = getStoredApiKey();
      expect(retrieved).toBeNull();
    });

    it('should persist across multiple get calls', () => {
      setStoredApiKey(TEST_API_KEY);
      const first = getStoredApiKey();
      const second = getStoredApiKey();
      expect(first).toBe(TEST_API_KEY);
      expect(second).toBe(TEST_API_KEY);
    });
  });
});
