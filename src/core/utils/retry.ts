import { ApiError, ApiErrorType } from './apiErrors';
import { logger } from '@core/services/loggerService';

// ---------------------------------------------------------------------------
// Enhanced Retry Configuration (v2.5.0)
// ---------------------------------------------------------------------------

/** Optional configuration for enhanced retry behavior */
export interface RetryConfig {
  /** Maximum delay cap in ms (prevents unbounded backoff). Default: 30_000 */
  maxDelayMs?: number;
  /** AbortSignal to cancel retries early */
  signal?: AbortSignal;
  /** Callback invoked before each retry attempt */
  onRetry?: (attempt: number, error: unknown, delayMs: number) => void;
  /**
   * Circuit breaker endpoint ID. When provided, the retry will:
   * - Check if the circuit is open before each attempt (throws immediately)
   * - Record success/failure to the circuit breaker after each attempt
   */
  circuitBreakerEndpoint?: string;
}

/**
 * Determines if an error is transient and should trigger a retry.
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return [
      ApiErrorType.RateLimitExceeded,
      ApiErrorType.ServerError,
      ApiErrorType.ServiceUnavailable,
      ApiErrorType.NetworkError,
      ApiErrorType.Unknown, // Sometimes network hiccups show as unknown
    ].includes(error.type);
  }

  // Handle raw fetch Response objects
  if (error instanceof Response) {
    return [429, 500, 502, 503, 504].includes(error.status);
  }

  // Handle standard Error objects (often network related)
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes('network') ||
      msg.includes('failed to fetch') ||
      msg.includes('timeout') ||
      msg.includes('rate limit') ||
      msg.includes('503') ||
      msg.includes('500')
    );
  }

  return false;
}

/**
 * Retries a promise-returning function with exponential backoff.
 *
 * Backward-compatible: the first 3 positional args are unchanged.
 * Pass an optional 4th `RetryConfig` for enhanced features (v2.5.0).
 *
 * @param operation The async function to execute.
 * @param maxRetries Maximum number of retries (default 3).
 * @param baseDelayMs Initial delay in milliseconds (default 1000).
 * @param config Optional enhanced retry configuration.
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000,
  config?: RetryConfig,
): Promise<T> {
  const maxDelayMs = config?.maxDelayMs ?? 30_000;
  const signal = config?.signal;
  const onRetry = config?.onRetry;
  const cbEndpoint = config?.circuitBreakerEndpoint;

  // Lazy-import circuit breaker to avoid circular deps
  let circuitBreaker:
    | {
        canExecute: (id: string) => boolean;
        recordSuccess: (id: string) => void;
        recordFailure: (id: string, error: string, errorType?: string) => void;
      }
    | undefined;
  if (cbEndpoint) {
    try {
      const mod = await import('@core/services/circuitBreakerService');
      circuitBreaker = mod.circuitBreakerService;
    } catch {
      // Circuit breaker not available — proceed without it
    }
  }

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Check abort signal
    if (signal?.aborted) {
      throw new DOMException('Retry aborted', 'AbortError');
    }

    // Check circuit breaker
    if (cbEndpoint && circuitBreaker && !circuitBreaker.canExecute(cbEndpoint)) {
      const cbError = new ApiError(
        `Circuit breaker is open for endpoint: ${cbEndpoint}`,
        ApiErrorType.ServiceUnavailable,
      );
      throw cbError;
    }

    try {
      const result = await operation();

      // Record success to circuit breaker
      if (cbEndpoint && circuitBreaker) {
        circuitBreaker.recordSuccess(cbEndpoint);
      }

      return result;
    } catch (error) {
      lastError = error;

      // Record failure to circuit breaker
      if (cbEndpoint && circuitBreaker) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        const errorType = error instanceof ApiError ? error.type : undefined;
        circuitBreaker.recordFailure(cbEndpoint, errorMsg, errorType);
      }

      // If the error isn't retryable (e.g., Invalid API Key), fail immediately.
      if (!isRetryableError(error)) {
        throw error;
      }

      // If we've reached max retries, throw the last error.
      if (attempt === maxRetries) {
        throw error;
      }

      // Calculate delay with exponential backoff, jitter, and max cap
      const rawDelay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 500;
      const delay = Math.min(rawDelay, maxDelayMs);

      // Invoke onRetry callback
      if (onRetry) {
        try {
          onRetry(attempt + 1, error, delay);
        } catch {
          // Swallow callback errors
        }
      }

      logger.warn(`Attempt ${attempt + 1} failed. Retrying in ${Math.round(delay)}ms...`, error);

      // Wait with abort support
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, delay);
        if (signal) {
          const onAbort = () => {
            clearTimeout(timer);
            reject(new DOMException('Retry aborted', 'AbortError'));
          };
          if (signal.aborted) {
            clearTimeout(timer);
            reject(new DOMException('Retry aborted', 'AbortError'));
            return;
          }
          signal.addEventListener('abort', onAbort, { once: true });
          // Clean up listener when timer fires
          const origResolve = resolve;
          resolve = () => {
            signal.removeEventListener('abort', onAbort);
            origResolve();
          };
        }
      });
    }
  }

  throw lastError;
}
