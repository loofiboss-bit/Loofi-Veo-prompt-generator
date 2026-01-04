
export enum ApiErrorType {
  InvalidApiKey = 'INVALID_API_KEY',
  QuotaExceeded = 'QUOTA_EXCEEDED',
  RateLimitExceeded = 'RATE_LIMIT_EXCEEDED',
  ContentBlocked = 'CONTENT_BLOCKED',
  LocationNotSupported = 'LOCATION_NOT_SUPPORTED',
  BadRequest = 'BAD_REQUEST',
  ResourceNotFound = 'RESOURCE_NOT_FOUND',
  ServerError = 'SERVER_ERROR',
  ServiceUnavailable = 'SERVICE_UNAVAILABLE',
  NetworkError = 'NETWORK_ERROR',
  JsonResponseError = 'JSON_RESPONSE_ERROR',
  Unknown = 'UNKNOWN',
}

export class ApiError extends Error {
  public readonly type: ApiErrorType;
  public cause?: unknown;

  constructor(message: string, type: ApiErrorType, originalError?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.type = type;
    if (originalError) {
      this.cause = originalError;
    }
  }
}

// Data-driven matchers for classifying errors from string messages.
const errorMessageMatchers: { type: ApiErrorType, tests: (string | RegExp)[] }[] = [
    { type: ApiErrorType.LocationNotSupported, tests: ['location', 'region', 'not supported', 'country'] },
    { type: ApiErrorType.ResourceNotFound, tests: ['404', 'not found', 'model not found', 'resource not found'] },
    { type: ApiErrorType.InvalidApiKey, tests: ['api key', 'api_key', 'unauthenticated', '401', '403', 'permission', 'credential'] },
    { type: ApiErrorType.QuotaExceeded, tests: ['quota', 'insufficient_quota', 'billing', 'plan'] },
    { type: ApiErrorType.RateLimitExceeded, tests: ['rate limit', '429', 'resource_exhausted', 'too many requests', 'overloaded'] },
    { type: ApiErrorType.ContentBlocked, tests: ['safety', 'blocked', 'harmful', 'policy', 'prohibited', 'recitation', 'finishreason'] },
    { type: ApiErrorType.ServiceUnavailable, tests: ['503', 'capacity', 'unavailable', 'maintenance'] },
    { type: ApiErrorType.BadRequest, tests: ['400', 'bad request', 'invalid argument', 'precondition', 'malformed', 'empty prompt'] },
    { type: ApiErrorType.ServerError, tests: ['500', '502', '504', 'internal error', 'server error', 'upstream'] },
    { type: ApiErrorType.NetworkError, tests: ['network', 'fetch', 'connection', 'offline', 'internet', 'failed to load', 'aborted'] },
];

/**
 * Categorizes an error message into an ApiErrorType using the defined matchers.
 * @param message The error message string to test.
 * @returns The categorized ApiErrorType, or Unknown if no match is found.
 */
function getErrorTypeFromMessage(message: string): ApiErrorType {
    const lowerMessage = message.toLowerCase();
    for (const matcher of errorMessageMatchers) {
        for (const test of matcher.tests) {
            if (test instanceof RegExp) {
                if (test.test(message)) return matcher.type;
            } else if (lowerMessage.includes(test)) {
                return matcher.type;
            }
        }
    }
    return ApiErrorType.Unknown;
}

/**
 * Parses an unknown error into a structured ApiError and throws it.
 * This function centralizes error classification to ensure consistent handling.
 * @param error The unknown error caught from a try/catch block.
 * @throws {ApiError} Always throws a structured ApiError.
 */
export const parseAndThrowApiError = (error: unknown): never => {
  // If the error is already a categorized ApiError, just pass it up the chain.
  if (error instanceof ApiError) {
    throw error;
  }
  
  // Check for offline status immediately
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new ApiError('You appear to be offline. Please check your internet connection.', ApiErrorType.NetworkError, error);
  }
  
  console.error('API Error:', error);

  let type = ApiErrorType.Unknown;
  let message = 'An unknown API error occurred.';

  // Attempt to extract numeric status code from common error shapes
  const status = (error as any)?.status || (error as any)?.statusCode || (error as any)?.response?.status;

  if (status) {
      if (status === 400) type = ApiErrorType.BadRequest;
      else if (status === 401 || status === 403) type = ApiErrorType.InvalidApiKey;
      else if (status === 404) type = ApiErrorType.ResourceNotFound;
      else if (status === 429) type = ApiErrorType.RateLimitExceeded;
      else if (status === 503) type = ApiErrorType.ServiceUnavailable;
      else if (status >= 500) type = ApiErrorType.ServerError;
  }

  if (error instanceof Response) {
      message = `HTTP error! status: ${error.status} ${error.statusText}`;
      // status logic above covers classification
  } else if (error instanceof Error) {
    message = error.message;
    if (type === ApiErrorType.Unknown) {
        type = getErrorTypeFromMessage(message);
    }
  } else if (typeof error === 'string') {
    message = error;
    if (type === ApiErrorType.Unknown) {
        type = getErrorTypeFromMessage(message);
    }
  } else if (typeof error === 'object' && error !== null) {
      // Try to extract message from generic objects (e.g. GoogleGenAIError structure)
      if ('message' in error) {
          message = String((error as any).message);
      } else if ('statusText' in error) {
          message = String((error as any).statusText);
      } else if ('error' in error && typeof (error as any).error === 'object' && 'message' in (error as any).error) {
          // Google API error response body structure
          message = String((error as any).error.message);
      }
      
      if (type === ApiErrorType.Unknown) {
          type = getErrorTypeFromMessage(message);
      }
  }
  
  // Provide clearer default messages for certain types if the extracted message is generic
  if (message === 'An unknown API error occurred.' || message === 'Failed to fetch') {
      if (type === ApiErrorType.RateLimitExceeded) message = 'The service is currently receiving too many requests. Please try again later.';
      if (type === ApiErrorType.ServiceUnavailable) message = 'The AI service is temporarily unavailable. Please try again shortly.';
      if (type === ApiErrorType.NetworkError) message = 'Network connection failed.';
  }
  
  throw new ApiError(message, type, error);
};
