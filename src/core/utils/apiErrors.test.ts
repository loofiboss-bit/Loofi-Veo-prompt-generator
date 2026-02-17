import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@core/services/loggerService', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { ApiError, ApiErrorType, parseAndThrowApiError } from './apiErrors';

beforeEach(() => {
  vi.clearAllMocks();
  // Default to online
  Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
});

describe('ApiError', () => {
  it('should create an error with type and message', () => {
    const error = new ApiError('test message', ApiErrorType.InvalidApiKey);
    expect(error.message).toBe('test message');
    expect(error.type).toBe(ApiErrorType.InvalidApiKey);
    expect(error.name).toBe('ApiError');
  });

  it('should store original error as cause', () => {
    const original = new Error('original');
    const error = new ApiError('wrapped', ApiErrorType.Unknown, original);
    expect(error.cause).toBe(original);
  });

  it('should not set cause when not provided', () => {
    const error = new ApiError('no cause', ApiErrorType.Unknown);
    expect(error.cause).toBeUndefined();
  });

  it('should be instance of Error', () => {
    const error = new ApiError('test', ApiErrorType.Unknown);
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiError);
  });
});

describe('ApiErrorType enum', () => {
  it('should have all expected error types', () => {
    expect(ApiErrorType.InvalidApiKey).toBe('INVALID_API_KEY');
    expect(ApiErrorType.QuotaExceeded).toBe('QUOTA_EXCEEDED');
    expect(ApiErrorType.RateLimitExceeded).toBe('RATE_LIMIT_EXCEEDED');
    expect(ApiErrorType.ContentBlocked).toBe('CONTENT_BLOCKED');
    expect(ApiErrorType.LocationNotSupported).toBe('LOCATION_NOT_SUPPORTED');
    expect(ApiErrorType.BadRequest).toBe('BAD_REQUEST');
    expect(ApiErrorType.ResourceNotFound).toBe('RESOURCE_NOT_FOUND');
    expect(ApiErrorType.ServerError).toBe('SERVER_ERROR');
    expect(ApiErrorType.ServiceUnavailable).toBe('SERVICE_UNAVAILABLE');
    expect(ApiErrorType.NetworkError).toBe('NETWORK_ERROR');
    expect(ApiErrorType.JsonResponseError).toBe('JSON_RESPONSE_ERROR');
    expect(ApiErrorType.Unknown).toBe('UNKNOWN');
  });
});

describe('parseAndThrowApiError', () => {
  it('should re-throw existing ApiError unchanged', () => {
    const original = new ApiError('already typed', ApiErrorType.InvalidApiKey);
    expect(() => parseAndThrowApiError(original)).toThrow(original);
  });

  it('should throw NetworkError when offline', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    try {
      parseAndThrowApiError(new Error('some error'));
      expect.fail('Should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).type).toBe(ApiErrorType.NetworkError);
      expect((e as ApiError).message).toContain('offline');
    }
  });

  describe('Error instance classification', () => {
    it.each([
      ['api key invalid', ApiErrorType.InvalidApiKey],
      ['unauthenticated request', ApiErrorType.InvalidApiKey],
      ['quota exceeded', ApiErrorType.QuotaExceeded],
      ['billing issue', ApiErrorType.QuotaExceeded],
      ['rate limit exceeded', ApiErrorType.RateLimitExceeded],
      ['429 too many requests', ApiErrorType.RateLimitExceeded],
      ['resource_exhausted', ApiErrorType.RateLimitExceeded],
      ['safety blocked', ApiErrorType.ContentBlocked],
      ['harmful content', ApiErrorType.ContentBlocked],
      ['location not supported', ApiErrorType.LocationNotSupported],
      ['region restriction', ApiErrorType.LocationNotSupported],
      ['model not found', ApiErrorType.ResourceNotFound],
      ['404 page not found', ApiErrorType.ResourceNotFound],
      ['bad request 400', ApiErrorType.BadRequest],
      ['malformed input', ApiErrorType.BadRequest],
      ['503 service unavailable', ApiErrorType.ServiceUnavailable],
      ['capacity issue', ApiErrorType.ServiceUnavailable],
      ['500 internal error', ApiErrorType.ServerError],
      ['server error occurred', ApiErrorType.ServerError],
      ['network connection failed', ApiErrorType.NetworkError],
      ['typeerror: failed to fetch', ApiErrorType.NetworkError],
    ])('should classify "%s" as %s', (message, expectedType) => {
      try {
        parseAndThrowApiError(new Error(message));
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(ApiError);
        expect((e as ApiError).type).toBe(expectedType);
      }
    });

    it('should classify unknown errors as Unknown type', () => {
      try {
        parseAndThrowApiError(new Error('something completely unrecognized xyz'));
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(ApiError);
        expect((e as ApiError).type).toBe(ApiErrorType.Unknown);
      }
    });
  });

  describe('string error classification', () => {
    it('should classify string errors', () => {
      try {
        parseAndThrowApiError('quota exceeded');
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(ApiError);
        expect((e as ApiError).type).toBe(ApiErrorType.QuotaExceeded);
      }
    });

    it('should use the string as the message', () => {
      try {
        parseAndThrowApiError('custom error message');
        expect.fail('Should have thrown');
      } catch (e) {
        expect((e as ApiError).message).toBe('custom error message');
      }
    });
  });

  describe('status code classification', () => {
    it('should classify by status 400', () => {
      try {
        parseAndThrowApiError({ status: 400, message: 'bad req' });
        expect.fail('Should have thrown');
      } catch (e) {
        expect((e as ApiError).type).toBe(ApiErrorType.BadRequest);
      }
    });

    it('should classify by status 401', () => {
      try {
        parseAndThrowApiError({ status: 401, message: 'unauthorized' });
        expect.fail('Should have thrown');
      } catch (e) {
        expect((e as ApiError).type).toBe(ApiErrorType.InvalidApiKey);
      }
    });

    it('should classify by status 403', () => {
      try {
        parseAndThrowApiError({ status: 403, message: 'forbidden' });
        expect.fail('Should have thrown');
      } catch (e) {
        expect((e as ApiError).type).toBe(ApiErrorType.InvalidApiKey);
      }
    });

    it('should classify by status 404', () => {
      try {
        parseAndThrowApiError({ status: 404, message: 'missing' });
        expect.fail('Should have thrown');
      } catch (e) {
        expect((e as ApiError).type).toBe(ApiErrorType.ResourceNotFound);
      }
    });

    it('should classify by status 429', () => {
      try {
        parseAndThrowApiError({ status: 429, message: 'throttled' });
        expect.fail('Should have thrown');
      } catch (e) {
        expect((e as ApiError).type).toBe(ApiErrorType.RateLimitExceeded);
      }
    });

    it('should classify by status 503', () => {
      try {
        parseAndThrowApiError({ status: 503, message: 'down' });
        expect.fail('Should have thrown');
      } catch (e) {
        expect((e as ApiError).type).toBe(ApiErrorType.ServiceUnavailable);
      }
    });

    it('should classify 5xx as ServerError', () => {
      try {
        parseAndThrowApiError({ status: 502, message: 'gateway' });
        expect.fail('Should have thrown');
      } catch (e) {
        expect((e as ApiError).type).toBe(ApiErrorType.ServerError);
      }
    });

    it('should extract statusCode property', () => {
      try {
        parseAndThrowApiError({ statusCode: 429, message: 'rate' });
        expect.fail('Should have thrown');
      } catch (e) {
        expect((e as ApiError).type).toBe(ApiErrorType.RateLimitExceeded);
      }
    });
  });

  describe('object error classification', () => {
    it('should extract message from object', () => {
      try {
        parseAndThrowApiError({ message: 'quota exceeded' });
        expect.fail('Should have thrown');
      } catch (e) {
        expect((e as ApiError).message).toBe('quota exceeded');
        expect((e as ApiError).type).toBe(ApiErrorType.QuotaExceeded);
      }
    });

    it('should extract statusText from object', () => {
      try {
        parseAndThrowApiError({ statusText: 'Not Found' });
        expect.fail('Should have thrown');
      } catch (e) {
        expect((e as ApiError).message).toBe('Not Found');
      }
    });

    it('should extract nested error.message (Google API structure)', () => {
      try {
        parseAndThrowApiError({ error: { message: 'quota has been exceeded for project' } });
        expect.fail('Should have thrown');
      } catch (e) {
        expect((e as ApiError).message).toBe('quota has been exceeded for project');
        expect((e as ApiError).type).toBe(ApiErrorType.QuotaExceeded);
      }
    });
  });

  describe('clearer default messages', () => {
    it('should improve message for rate limit with generic error', () => {
      try {
        parseAndThrowApiError({ status: 429 });
        expect.fail('Should have thrown');
      } catch (e) {
        expect((e as ApiError).message).toContain('too many requests');
      }
    });

    it('should improve message for service unavailable with generic error', () => {
      try {
        parseAndThrowApiError({ status: 503 });
        expect.fail('Should have thrown');
      } catch (e) {
        expect((e as ApiError).message).toContain('temporarily unavailable');
      }
    });
  });

  it('should preserve original error as cause', () => {
    const original = new Error('original cause');
    try {
      parseAndThrowApiError(original);
      expect.fail('Should have thrown');
    } catch (e) {
      expect((e as ApiError).cause).toBe(original);
    }
  });

  it('should handle null error', () => {
    try {
      parseAndThrowApiError(null);
      expect.fail('Should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
    }
  });
});
