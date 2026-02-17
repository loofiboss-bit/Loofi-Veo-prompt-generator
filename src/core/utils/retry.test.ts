import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@core/services/loggerService', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

// Mock circuit breaker to avoid lazy import side effects
vi.mock('@core/services/circuitBreakerService', () => ({
  circuitBreakerService: {
    canExecute: vi.fn(() => true),
    recordSuccess: vi.fn(),
    recordFailure: vi.fn(),
  },
}));

import { retryOperation } from './retry';
import { ApiError, ApiErrorType } from './apiErrors';

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

describe('retryOperation', () => {
  it('should return result on first successful attempt', async () => {
    const operation = vi.fn().mockResolvedValueOnce('success');
    const result = await retryOperation(operation, 3, 10);
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry on retryable error and succeed', async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new ApiError('temporary', ApiErrorType.ServerError))
      .mockResolvedValueOnce('recovered');

    const result = await retryOperation(operation, 3, 10);
    expect(result).toBe('recovered');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('should throw immediately for non-retryable error (InvalidApiKey)', async () => {
    const operation = vi
      .fn()
      .mockRejectedValue(new ApiError('bad key', ApiErrorType.InvalidApiKey));

    await expect(retryOperation(operation, 3, 10)).rejects.toThrow('bad key');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should throw immediately for non-retryable error (ContentBlocked)', async () => {
    const operation = vi
      .fn()
      .mockRejectedValue(new ApiError('blocked', ApiErrorType.ContentBlocked));

    await expect(retryOperation(operation, 3, 10)).rejects.toThrow('blocked');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should exhaust all retries and throw last error', async () => {
    const error = new ApiError('still failing', ApiErrorType.ServerError);
    const operation = vi.fn().mockRejectedValue(error);

    await expect(retryOperation(operation, 2, 10)).rejects.toThrow('still failing');
    // 1 initial + 2 retries = 3
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('should retry on RateLimitExceeded', async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new ApiError('rate limited', ApiErrorType.RateLimitExceeded))
      .mockResolvedValueOnce('done');

    const result = await retryOperation(operation, 3, 10);
    expect(result).toBe('done');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('should retry on NetworkError', async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new ApiError('network fail', ApiErrorType.NetworkError))
      .mockResolvedValueOnce('connected');

    const result = await retryOperation(operation, 3, 10);
    expect(result).toBe('connected');
  });

  it('should retry on ServiceUnavailable', async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new ApiError('503', ApiErrorType.ServiceUnavailable))
      .mockResolvedValueOnce('back');

    const result = await retryOperation(operation, 3, 10);
    expect(result).toBe('back');
  });

  it('should call onRetry callback before each retry', async () => {
    const onRetry = vi.fn();
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new ApiError('fail', ApiErrorType.ServerError))
      .mockResolvedValueOnce('ok');

    await retryOperation(operation, 3, 10, { onRetry });
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(ApiError), expect.any(Number));
  });

  it('should swallow errors in onRetry callback', async () => {
    const onRetry = vi.fn().mockImplementation(() => {
      throw new Error('callback error');
    });
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new ApiError('fail', ApiErrorType.ServerError))
      .mockResolvedValueOnce('ok');

    const result = await retryOperation(operation, 3, 10, { onRetry });
    expect(result).toBe('ok');
  });

  it('should abort on signal', async () => {
    const controller = new AbortController();
    controller.abort();

    const operation = vi.fn().mockResolvedValue('should not reach');

    await expect(retryOperation(operation, 3, 10, { signal: controller.signal })).rejects.toThrow(
      'Retry aborted',
    );
    expect(operation).not.toHaveBeenCalled();
  });

  it('should retry standard Error with network-related message', async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error('failed to fetch'))
      .mockResolvedValueOnce('ok');

    const result = await retryOperation(operation, 3, 10);
    expect(result).toBe('ok');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('should not retry standard Error with non-retryable message', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('validation failed'));

    await expect(retryOperation(operation, 3, 10)).rejects.toThrow('validation failed');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should cap delay at maxDelayMs', async () => {
    const onRetry = vi.fn();
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new ApiError('fail', ApiErrorType.ServerError))
      .mockResolvedValueOnce('ok');

    await retryOperation(operation, 3, 100000, { maxDelayMs: 50, onRetry });
    const delay = onRetry.mock.calls[0][2];
    expect(delay).toBeLessThanOrEqual(50);
  });

  it('should handle zero retries', async () => {
    const error = new ApiError('fail', ApiErrorType.ServerError);
    const operation = vi.fn().mockRejectedValue(error);

    await expect(retryOperation(operation, 0, 10)).rejects.toThrow('fail');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry on retryable Response status codes', async () => {
    const mockResponse = new Response(null, { status: 503 });
    const operation = vi.fn().mockRejectedValueOnce(mockResponse).mockResolvedValueOnce('ok');

    const result = await retryOperation(operation, 3, 10);
    expect(result).toBe('ok');
  });
});
