import { describe, it, expect, vi } from 'vitest';
import { getApiErrorMessage } from './errorHandler';
import { ApiError, ApiErrorType } from './apiErrors';

// Mock logger
vi.mock('@core/services/loggerService', () => ({
  log: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

const mockT: Record<string, string> = {
  errorApiKeyInvalid: 'Your API key is invalid.',
  solutionApiKeyInvalid: 'Please check your API key.',
  errorQuotaExceeded: 'API quota exceeded.',
  solutionQuotaExceeded: 'Wait or upgrade your plan.',
  errorRateLimit: 'Rate limit hit.',
  solutionRateLimit: 'Wait a moment and try again.',
  errorSafety: 'Content was blocked.',
  solutionSafety: 'Modify your prompt.',
  errorBadRequest: 'Bad request.',
  solutionBadRequest: 'Check your input.',
  errorServerError: 'Server error.',
  solutionServerError: 'Try again later.',
  errorServiceUnavailable: 'Service unavailable.',
  solutionServiceUnavailable: 'Try again later.',
  errorNetwork: 'Network error.',
  solutionNetwork: 'Check your connection.',
  errorLocationNotSupported: 'Location not supported.',
  solutionLocationNotSupported: 'Use a VPN.',
  errorResourceNotFound: 'Resource not found.',
  solutionResourceNotFound: 'Check the resource.',
  errorGeneric: 'An unknown error occurred.',
  solutionGeneric: 'Please try again.',
};

describe('getApiErrorMessage', () => {
  it('should return translated message for InvalidApiKey', () => {
    const error = new ApiError('key invalid', ApiErrorType.InvalidApiKey);
    const result = getApiErrorMessage(error, mockT);

    expect(result).toContain('Your API key is invalid');
    expect(result).toContain('Please check your API key');
  });

  it('should return translated message for QuotaExceeded', () => {
    const error = new ApiError('quota exceeded', ApiErrorType.QuotaExceeded);
    const result = getApiErrorMessage(error, mockT);

    expect(result).toContain('API quota exceeded');
  });

  it('should return translated message for RateLimitExceeded', () => {
    const error = new ApiError('rate limit', ApiErrorType.RateLimitExceeded);
    const result = getApiErrorMessage(error, mockT);

    expect(result).toContain('Rate limit hit');
  });

  it('should return the error message directly for JsonResponseError', () => {
    const error = new ApiError('Custom JSON error message', ApiErrorType.JsonResponseError);
    const result = getApiErrorMessage(error, mockT);

    expect(result).toBe('Custom JSON error message');
  });

  it('should append technical details for BadRequest', () => {
    const error = new ApiError('Field "model" is required', ApiErrorType.BadRequest);
    const result = getApiErrorMessage(error, mockT);

    expect(result).toContain('Bad request');
    expect(result).toContain('Technical Details');
    expect(result).toContain('Field "model" is required');
  });

  it('should handle non-ApiError gracefully', () => {
    const error = new Error('Something unexpected');
    const result = getApiErrorMessage(error, mockT);

    expect(result).toContain('An unknown error occurred');
    expect(result).toContain('Something unexpected');
  });

  it('should handle unknown error types', () => {
    const result = getApiErrorMessage('string error', mockT);

    expect(result).toContain('An unknown error occurred');
  });

  it('should handle NetworkError with warn log level', () => {
    const error = new ApiError('timeout', ApiErrorType.NetworkError);
    const result = getApiErrorMessage(error, mockT);

    expect(result).toContain('Network error');
  });
});
