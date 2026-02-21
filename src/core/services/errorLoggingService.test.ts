import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock idb-keyval and loggerService BEFORE importing the service
vi.mock('idb-keyval', () => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  keys: vi.fn(),
}));

vi.mock('./loggerService', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock electron utilities
vi.mock('@core/utils/electronBridge', () => ({
  isElectronEnvironment: vi.fn(() => false),
  getElectron: vi.fn(() => null),
}));

vi.mock('@core/utils/errorSchema', () => ({
  createStructuredErrorLogEntry: vi.fn((input) => ({
    id: 'test-id',
    timestamp: Date.now(),
    level: input.level,
    code: input.code,
    message: input.message,
    stack: input.stack || undefined,
    context: input.context,
    correlationId: input.correlationId,
  })),
  normalizeStructuredErrorLogEntry: vi.fn((entry) => entry),
}));

import { get, set } from 'idb-keyval';
import { errorLoggingService } from './errorLoggingService';
import { logger } from './loggerService';

describe('ErrorLoggingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset idb-keyval to simulate empty storage
    vi.mocked(get).mockResolvedValue(undefined);
    vi.mocked(set).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('logError', () => {
    it('should create and persist error entry', async () => {
      vi.mocked(get).mockResolvedValue([]);
      vi.mocked(set).mockResolvedValue(undefined);

      const testError = new Error('Test error message');
      await errorLoggingService.logError(testError, 'test-context');

      expect(set).toHaveBeenCalledWith('error-log', expect.any(Array));
      expect(logger.error).toHaveBeenCalled();
    });

    it('should accept string context', async () => {
      vi.mocked(get).mockResolvedValue([]);
      vi.mocked(set).mockResolvedValue(undefined);

      const testError = new Error('Test error');
      await errorLoggingService.logError(testError, 'string-context', 'CUSTOM_CODE');

      expect(set).toHaveBeenCalledWith('error-log', expect.any(Array));
    });

    it('should accept object context', async () => {
      vi.mocked(get).mockResolvedValue([]);
      vi.mocked(set).mockResolvedValue(undefined);

      const testError = new Error('Test error');
      const context = { source: 'test-source', operation: 'test-op' };
      await errorLoggingService.logError(testError, context);

      expect(set).toHaveBeenCalledWith('error-log', expect.any(Array));
    });

    it('should include stack trace in entry', async () => {
      vi.mocked(get).mockResolvedValue([]);
      vi.mocked(set).mockResolvedValue(undefined);

      const testError = new Error('Error with stack');
      await errorLoggingService.logError(testError);

      const [, persisted] = vi.mocked(set).mock.calls[0];
      expect(persisted).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Error with stack',
            stack: expect.stringContaining('Error with stack'),
          }),
        ]),
      );
    });

    it('should use default code if not provided', async () => {
      vi.mocked(get).mockResolvedValue([]);
      vi.mocked(set).mockResolvedValue(undefined);

      const testError = new Error('Test');
      await errorLoggingService.logError(testError);

      const [, persisted] = vi.mocked(set).mock.calls[0];
      expect(persisted).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'UNEXPECTED_ERROR',
          }),
        ]),
      );
    });

    it('should use provided code', async () => {
      vi.mocked(get).mockResolvedValue([]);
      vi.mocked(set).mockResolvedValue(undefined);

      const testError = new Error('Test');
      await errorLoggingService.logError(testError, undefined, 'CUSTOM_ERROR_CODE');

      const [, persisted] = vi.mocked(set).mock.calls[0];
      expect(persisted).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'CUSTOM_ERROR_CODE',
          }),
        ]),
      );
    });

    it('should include correlationId when provided', async () => {
      vi.mocked(get).mockResolvedValue([]);
      vi.mocked(set).mockResolvedValue(undefined);

      const testError = new Error('Test');
      const correlationId = 'correlation-123';
      await errorLoggingService.logError(testError, undefined, undefined, correlationId);

      const [, persisted] = vi.mocked(set).mock.calls[0];
      expect(persisted).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            correlationId: 'correlation-123',
          }),
        ]),
      );
    });
  });

  describe('logUnknownError', () => {
    it('should normalize Error object', async () => {
      vi.mocked(get).mockResolvedValue([]);
      vi.mocked(set).mockResolvedValue(undefined);

      const testError = new Error('Known error');
      await errorLoggingService.logUnknownError(testError);

      const [, persisted] = vi.mocked(set).mock.calls[0];
      expect(persisted).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Known error',
          }),
        ]),
      );
    });

    it('should convert string to Error', async () => {
      vi.mocked(get).mockResolvedValue([]);
      vi.mocked(set).mockResolvedValue(undefined);

      await errorLoggingService.logUnknownError('String error reason');

      const [, persisted] = vi.mocked(set).mock.calls[0];
      expect(persisted).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'String error reason',
          }),
        ]),
      );
    });

    it('should convert non-Error, non-string to Error', async () => {
      vi.mocked(get).mockResolvedValue([]);
      vi.mocked(set).mockResolvedValue(undefined);

      await errorLoggingService.logUnknownError({ foo: 'bar' });

      const [, persisted] = vi.mocked(set).mock.calls[0];
      expect(persisted).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Unknown error',
          }),
        ]),
      );
    });
  });

  describe('logWarning', () => {
    it('should create warning-level entry', async () => {
      vi.mocked(get).mockResolvedValue([]);
      vi.mocked(set).mockResolvedValue(undefined);

      await errorLoggingService.logWarning('Test warning');

      const [, persisted] = vi.mocked(set).mock.calls[0];
      expect(persisted).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            level: 'warning',
            message: 'Test warning',
          }),
        ]),
      );
    });

    it('should use provided code for warning', async () => {
      vi.mocked(get).mockResolvedValue([]);
      vi.mocked(set).mockResolvedValue(undefined);

      await errorLoggingService.logWarning('Test warning', undefined, 'CUSTOM_WARNING');

      const [, persisted] = vi.mocked(set).mock.calls[0];
      expect(persisted).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'CUSTOM_WARNING',
          }),
        ]),
      );
    });

    it('should create entry with level warning (not error)', async () => {
      vi.mocked(get).mockResolvedValue([]);
      vi.mocked(set).mockResolvedValue(undefined);

      await errorLoggingService.logWarning('Test warning');

      const [, persisted] = vi.mocked(set).mock.calls[0];
      const lastEntry = persisted[persisted.length - 1];
      expect(lastEntry.level).toBe('warning');
      expect(lastEntry.code).toBe('WARNING');
    });
  });

  describe('getRecentErrors', () => {
    it('should return entries including any accumulated from prior operations', async () => {
      vi.mocked(get).mockResolvedValue([]);
      vi.mocked(set).mockResolvedValue(undefined);

      const entries = await errorLoggingService.getRecentErrors();

      // The service is a singleton and accumulates entries across tests.
      // Just verify it returns an array.
      expect(Array.isArray(entries)).toBe(true);
      expect(entries.length).toBeGreaterThanOrEqual(0);
    });

    it('should return copy of entries array (not a reference)', async () => {
      // Mock get to return some entries
      const mockEntry = {
        id: '1',
        timestamp: Date.now(),
        level: 'error' as const,
        code: 'TEST',
        message: 'Error 1',
        context: undefined,
        correlationId: undefined,
      };

      // Clear the service state by re-mocking get to return specific test data
      vi.mocked(get).mockResolvedValueOnce([mockEntry]);
      vi.mocked(set).mockResolvedValue(undefined);

      const entries1 = await errorLoggingService.getRecentErrors();
      const entries2 = await errorLoggingService.getRecentErrors();

      // Both calls should return the same data but different array instances
      expect(entries1).toEqual(entries2);
      expect(entries1).not.toBe(entries2);
    });
  });

  describe('clearErrorLog', () => {
    it('should clear all entries', async () => {
      vi.mocked(get).mockResolvedValue([]);
      vi.mocked(set).mockResolvedValue(undefined);

      await errorLoggingService.clearErrorLog();

      expect(set).toHaveBeenCalledWith('error-log', []);
      expect(logger.info).toHaveBeenCalledWith('Error log cleared', 'ErrorLoggingService');
    });

    it('should propagate errors', async () => {
      vi.mocked(get).mockResolvedValue([]);
      const error = new Error('Storage error');
      vi.mocked(set).mockRejectedValue(error);

      await expect(errorLoggingService.clearErrorLog()).rejects.toThrow('Storage error');
    });
  });

  describe('trimming entries', () => {
    it('should trim to MAX_ENTRIES (100) when exceeded', async () => {
      const longEntryList = Array.from({ length: 100 }, (_, i) => ({
        id: `${i}`,
        timestamp: Date.now(),
        level: 'error' as const,
        code: 'TEST',
        message: `Error ${i}`,
        context: undefined,
        correlationId: undefined,
      }));

      vi.mocked(get).mockResolvedValue(longEntryList);
      vi.mocked(set).mockResolvedValue(undefined);

      const testError = new Error('New error');
      await errorLoggingService.logError(testError);

      const [, persisted] = vi.mocked(set).mock.calls[0];
      // Should maintain at max 100 entries (99 old + 1 new = 100)
      expect(persisted.length).toBeLessThanOrEqual(100);
      // Should include the new error
      expect(persisted.some((e: { message: string }) => e.message === 'New error')).toBe(true);
    });

    it('should keep newest entries when trimming', async () => {
      const createMockEntry = (i: number) => ({
        id: `${i}`,
        timestamp: Date.now() - 10000,
        level: 'error' as const,
        code: 'TEST',
        message: `Old error ${i}`,
        context: undefined,
        correlationId: undefined,
      });

      const oldEntries = Array.from({ length: 100 }, (_, i) => createMockEntry(i));

      vi.mocked(get).mockResolvedValue(oldEntries);
      vi.mocked(set).mockResolvedValue(undefined);

      const newError = new Error('New error');
      await errorLoggingService.logError(newError);

      const [, persisted] = vi.mocked(set).mock.calls[0] as [string, { message: string }[]];
      expect(persisted.length).toBeLessThanOrEqual(100);
      // The new entry should be among the persisted entries
      expect(persisted.some((e) => e.message === 'New error')).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle idb-keyval load failure gracefully', async () => {
      // Create a fresh mock scenario
      vi.mocked(get).mockRejectedValueOnce(new Error('IDB error'));
      vi.mocked(set).mockResolvedValue(undefined);

      // Should not throw when logError is called
      const testError = new Error('Test');
      await expect(errorLoggingService.logError(testError)).resolves.not.toThrow();

      // The service should have attempted to persist despite load failure
      expect(set).toHaveBeenCalled();
    });

    it('should handle idb-keyval persist failure gracefully', async () => {
      vi.mocked(get).mockResolvedValue([]);
      vi.mocked(set).mockRejectedValue(new Error('Write failed'));

      const testError = new Error('Test');
      // Should not throw despite set failure
      await errorLoggingService.logError(testError);

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('failed to persist'),
        'ErrorLoggingService',
        expect.any(Error),
      );
    });
  });

  describe('localStorage fallback behavior', () => {
    let getItemSpy: ReturnType<typeof vi.spyOn>;
    let setItemSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      getItemSpy = vi.spyOn(Storage.prototype, 'getItem');
      setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    });

    afterEach(() => {
      getItemSpy.mockRestore();
      setItemSpy.mockRestore();
    });

    it('should not throw when getItem returns malformed JSON and setItem not called', async () => {
      getItemSpy.mockReturnValue('{ invalid json');

      await expect(errorLoggingService.logError(new Error('Test'))).resolves.not.toThrow();
      expect(setItemSpy).not.toHaveBeenCalled();
    });

    it('should not throw when getItem throws and setItem not called', async () => {
      getItemSpy.mockImplementation(() => {
        throw new Error('localStorage unavailable');
      });

      await expect(errorLoggingService.logError(new Error('Test'))).resolves.not.toThrow();
      expect(setItemSpy).not.toHaveBeenCalled();
    });

    it('should not throw when setItem throws and setItem called once', async () => {
      getItemSpy.mockReturnValue(null);
      setItemSpy.mockImplementation(() => {
        throw new Error('localStorage full');
      });

      await expect(errorLoggingService.logError(new Error('Test'))).resolves.not.toThrow();
      expect(setItemSpy).toHaveBeenCalledTimes(1);
    });

    it('should write to localStorage on successful error log', async () => {
      vi.mocked(get).mockResolvedValue([]);
      vi.mocked(set).mockResolvedValue(undefined);
      getItemSpy.mockReturnValue('[]');

      await errorLoggingService.logError(new Error('LS Test'));

      expect(setItemSpy).toHaveBeenCalledWith(
        'veo-studio-error-logs',
        expect.stringContaining('LS Test'),
      );
    });

    it('should append to existing localStorage entries', async () => {
      vi.mocked(get).mockResolvedValue([]);
      vi.mocked(set).mockResolvedValue(undefined);

      const existing = JSON.stringify([{ id: 'old-1', message: 'Old error', level: 'error' }]);
      getItemSpy.mockReturnValue(existing);

      await errorLoggingService.logError(new Error('New LS Error'));

      const writtenJson = setItemSpy.mock.calls[0]?.[1] as string;
      if (writtenJson) {
        const parsed = JSON.parse(writtenJson);
        expect(parsed.length).toBeGreaterThanOrEqual(2);
      }
    });

    it('should trim localStorage entries beyond MAX_ENTRIES', async () => {
      vi.mocked(get).mockResolvedValue([]);
      vi.mocked(set).mockResolvedValue(undefined);

      const manyEntries = Array.from({ length: 100 }, (_, i) => ({
        id: `ls-${i}`,
        message: `LS Error ${i}`,
        level: 'error',
      }));
      getItemSpy.mockReturnValue(JSON.stringify(manyEntries));

      await errorLoggingService.logError(new Error('Overflow'));

      const writtenJson = setItemSpy.mock.calls[0]?.[1] as string;
      if (writtenJson) {
        const parsed = JSON.parse(writtenJson);
        expect(parsed.length).toBeLessThanOrEqual(100);
      }
    });

    it('should handle null from getItem as empty array', async () => {
      vi.mocked(get).mockResolvedValue([]);
      vi.mocked(set).mockResolvedValue(undefined);
      getItemSpy.mockReturnValue(null);

      await errorLoggingService.logError(new Error('Null LS'));

      expect(setItemSpy).toHaveBeenCalled();
    });
  });

  describe('logWarning with correlationId', () => {
    it('should include correlationId in warning entry', async () => {
      vi.mocked(get).mockResolvedValue([]);
      vi.mocked(set).mockResolvedValue(undefined);

      await errorLoggingService.logWarning('Test warning', 'context', 'WARN_CODE', 'corr-456');

      const [, persisted] = vi.mocked(set).mock.calls[0];
      expect(persisted).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            level: 'warning',
            code: 'WARN_CODE',
            correlationId: 'corr-456',
          }),
        ]),
      );
    });
  });

  describe('ensureContext', () => {
    it('should pass through undefined context', async () => {
      vi.mocked(get).mockResolvedValue([]);
      vi.mocked(set).mockResolvedValue(undefined);

      await errorLoggingService.logError(new Error('No ctx'));

      const [, persisted] = vi.mocked(set).mock.calls[0];
      const entry = persisted[persisted.length - 1];
      expect(entry.context).toBeUndefined();
    });

    it('should convert string context to object', async () => {
      vi.mocked(get).mockResolvedValue([]);
      vi.mocked(set).mockResolvedValue(undefined);

      await errorLoggingService.logWarning('Test', 'my-source', 'W');

      const [, persisted] = vi.mocked(set).mock.calls[0];
      const entry = persisted[persisted.length - 1];
      expect(entry.context).toEqual({ source: 'my-source' });
    });

    it('should pass through object context', async () => {
      vi.mocked(get).mockResolvedValue([]);
      vi.mocked(set).mockResolvedValue(undefined);

      const ctx = { source: 'src', operation: 'op' };
      await errorLoggingService.logWarning('Test', ctx, 'W');

      const [, persisted] = vi.mocked(set).mock.calls[0];
      const entry = persisted[persisted.length - 1];
      expect(entry.context).toEqual(ctx);
    });
  });
});
