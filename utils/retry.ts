
import { ApiError, ApiErrorType } from './apiErrors';

/**
 * Determines if an error is transient and should trigger a retry.
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return [
      ApiErrorType.RateLimitExceeded,
      ApiErrorType.ServerError,
      ApiErrorType.NetworkError,
      ApiErrorType.Unknown // Sometimes network hiccups show as unknown
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
 * @param operation The async function to execute.
 * @param maxRetries Maximum number of retries (default 3).
 * @param baseDelayMs Initial delay in milliseconds (default 1000).
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // If the error isn't retryable (e.g., Invalid API Key), fail immediately.
      if (!isRetryableError(error)) {
        throw error;
      }

      // If we've reached max retries, throw the last error.
      if (attempt === maxRetries) {
        throw error;
      }

      // Calculate delay with exponential backoff and jitter
      // Delay = base * 2^attempt + random_jitter
      const delay = baseDelayMs * Math.pow(2, attempt) + (Math.random() * 500);
      
      console.warn(`Attempt ${attempt + 1} failed. Retrying in ${Math.round(delay)}ms...`, error);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
