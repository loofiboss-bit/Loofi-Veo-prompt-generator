import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock errorLoggingService BEFORE importing the module under test
vi.mock('./errorLoggingService', () => ({
  errorLoggingService: {
    logError: vi.fn(),
  },
}));

import { installGlobalUnhandledRejectionHandler } from './globalUnhandledRejectionService';
import { errorLoggingService } from './errorLoggingService';

const INSTALL_FLAG = '__veoGlobalUnhandledRejectionInstalled__';

describe('globalUnhandledRejectionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clean up the global installation flag
    delete (window as unknown as Record<string, unknown>)[INSTALL_FLAG];
  });

  afterEach(() => {
    delete (window as unknown as Record<string, unknown>)[INSTALL_FLAG];
  });

  it('should install handlers on first call', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

    installGlobalUnhandledRejectionHandler();

    expect(addEventListenerSpy).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
    expect(addEventListenerSpy).toHaveBeenCalledWith('error', expect.any(Function));
    expect((window as unknown as Record<string, unknown>)[INSTALL_FLAG]).toBe(true);

    addEventListenerSpy.mockRestore();
  });

  it('should not install duplicate handlers on second call', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

    installGlobalUnhandledRejectionHandler();
    vi.clearAllMocks();

    installGlobalUnhandledRejectionHandler();

    expect(addEventListenerSpy).not.toHaveBeenCalled();

    addEventListenerSpy.mockRestore();
  });

  it('should handle unhandled promise rejection with Error object', async () => {
    installGlobalUnhandledRejectionHandler();

    const testError = new Error('Test rejection');
    const testPromise = Promise.reject(testError);
    const event = new PromiseRejectionEvent('unhandledrejection', {
      reason: testError,
      promise: testPromise,
    });

    // Prevent actual unhandled rejection
    testPromise.catch(() => {});

    window.dispatchEvent(event);
    // Allow microtask queue to flush
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(errorLoggingService.logError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Test rejection',
      }),
      { source: 'global:unhandledrejection' },
      'ASYNC_UNHANDLED_REJECTION',
    );
  });

  it('should handle unhandled promise rejection with string reason', async () => {
    installGlobalUnhandledRejectionHandler();

    const testPromise = Promise.reject('String rejection reason');
    const event = new PromiseRejectionEvent('unhandledrejection', {
      reason: 'String rejection reason',
      promise: testPromise,
    });

    // Prevent actual unhandled rejection
    testPromise.catch(() => {});

    window.dispatchEvent(event);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(errorLoggingService.logError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'String rejection reason',
      }),
      { source: 'global:unhandledrejection' },
      'ASYNC_UNHANDLED_REJECTION',
    );
  });

  it('should handle unhandled promise rejection with non-serializable object', async () => {
    installGlobalUnhandledRejectionHandler();

    const circularObj: Record<string, unknown> = { foo: 'bar' };
    circularObj.self = circularObj; // Create circular reference

    const testPromise = Promise.reject(circularObj);
    const event = new PromiseRejectionEvent('unhandledrejection', {
      reason: circularObj,
      promise: testPromise,
    });

    // Prevent actual unhandled rejection
    testPromise.catch(() => {});

    window.dispatchEvent(event);
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Should handle gracefully with fallback message
    expect(errorLoggingService.logError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringMatching(
          /Unhandled rejection: \[unserializable reason\]|Unhandled rejection:/,
        ),
      }),
      { source: 'global:unhandledrejection' },
      'ASYNC_UNHANDLED_REJECTION',
    );
  });

  it('should handle window error events', async () => {
    installGlobalUnhandledRejectionHandler();

    const event = new ErrorEvent('error', {
      message: 'Runtime error',
      filename: 'app.js',
      lineno: 42,
      colno: 15,
      error: new Error('Runtime error'),
    });

    window.dispatchEvent(event);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(errorLoggingService.logError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Runtime error',
      }),
      expect.objectContaining({
        source: 'global:error',
        operation: 'app.js:42:15',
      }),
      'RENDERER_UNHANDLED_ERROR',
    );
  });

  it('should handle window error event with missing error object', async () => {
    installGlobalUnhandledRejectionHandler();

    const event = new ErrorEvent('error', {
      message: 'Error without object',
      filename: 'test.js',
      lineno: 10,
      colno: 5,
    });

    window.dispatchEvent(event);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(errorLoggingService.logError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Error without object',
      }),
      expect.objectContaining({
        source: 'global:error',
        operation: 'test.js:10:5',
      }),
      'RENDERER_UNHANDLED_ERROR',
    );
  });

  it('should use default values for missing event properties', async () => {
    installGlobalUnhandledRejectionHandler();

    const event = new ErrorEvent('error', {
      message: 'Minimal error',
    });

    window.dispatchEvent(event);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(errorLoggingService.logError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Minimal error',
      }),
      expect.objectContaining({
        source: 'global:error',
        operation: expect.stringMatching(/unknown:/),
      }),
      'RENDERER_UNHANDLED_ERROR',
    );
  });

  it('should not install on server-side (window undefined)', () => {
    // Save original window
    const originalWindow = global.window;

    try {
      // @ts-ignore
      delete (global as unknown as Record<string, unknown>).window;

      const addEventListenerSpy = vi.spyOn(
        originalWindow ??
          (global as unknown as { addEventListener: typeof window.addEventListener }),
        'addEventListener',
      );

      installGlobalUnhandledRejectionHandler();

      // Should not throw and not try to add listeners
      expect(addEventListenerSpy).not.toHaveBeenCalled();

      addEventListenerSpy.mockRestore();
    } finally {
      // Restore window
      (global as unknown as Record<string, unknown>).window = originalWindow;
    }
  });
});
