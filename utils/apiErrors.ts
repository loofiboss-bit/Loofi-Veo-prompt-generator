
export enum ApiErrorType {
  InvalidApiKey = 'INVALID_API_KEY',
  RateLimitExceeded = 'RATE_LIMIT_EXCEEDED',
  ContentBlocked = 'CONTENT_BLOCKED',
  BadRequest = 'BAD_REQUEST',
  ServerError = 'SERVER_ERROR',
  NetworkError = 'NETWORK_ERROR',
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
    { type: ApiErrorType.InvalidApiKey, tests: ['api key not valid', 'requested entity was not found', /403/, /permission denied/i] },
    { type: ApiErrorType.RateLimitExceeded, tests: ['rate limit', 'quota', /429/, /resource exhausted/i] },
    { type: ApiErrorType.ContentBlocked, tests: ['safety', 'blocked', 'harmful', /finishReason.*SAFETY/i] },
    { type: ApiErrorType.BadRequest, tests: [/\[400\]/, /bad request/i, /invalid argument/i] },
    { type: ApiErrorType.ServerError, tests: [/\[5\d{2}\]/, /server error/i, /internal error/i, /503/, /500/, /failed to parse/i, /invalid json/i, /overloaded/i] },
    { type: ApiErrorType.NetworkError, tests: ['network', 'failed to fetch', 'connection'] },
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
  console.error('API Error:', error);

  let type = ApiErrorType.Unknown;
  let message = 'An unknown API error occurred.';

  // Check for response object with status (e.g. from fetch or some SDK errors)
  if (error && typeof error === 'object' && 'status' in error) {
      const status = (error as any).status;
      if (status === 400) type = ApiErrorType.BadRequest;
      else if (status === 401 || status === 403) type = ApiErrorType.InvalidApiKey;
      else if (status === 429) type = ApiErrorType.RateLimitExceeded;
      else if (status >= 500) type = ApiErrorType.ServerError;
  }

  if (error instanceof Response) {
      message = `HTTP error! status: ${error.status}`;
      if (type === ApiErrorType.Unknown) { // Fallback if status wasn't caught above
          if (error.status === 400) type = ApiErrorType.BadRequest;
          else if (error.status === 401 || error.status === 403) type = ApiErrorType.InvalidApiKey;
          else if (error.status === 429) type = ApiErrorType.RateLimitExceeded;
          else if (error.status >= 500) type = ApiErrorType.ServerError;
      }
  } else if (error instanceof Error) {
    message = error.message;
    
    // If type is still unknown, try matching the message string
    if (type === ApiErrorType.Unknown) {
        if (error.name === 'TypeError' && message.toLowerCase().includes('failed to fetch')) {
            type = ApiErrorType.NetworkError;
        } else {
            type = getErrorTypeFromMessage(message);
        }
    }
  } else if (typeof error === 'string') {
    // Handle cases where a plain string is thrown.
    message = error;
    if (type === ApiErrorType.Unknown) {
        type = getErrorTypeFromMessage(message);
    }
  }
  
  throw new ApiError(message, type, error);
};
