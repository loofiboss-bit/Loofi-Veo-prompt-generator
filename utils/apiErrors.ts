
export enum ApiErrorType {
  InvalidApiKey = 'INVALID_API_KEY',
  RateLimitExceeded = 'RATE_LIMIT_EXCEEDED',
  ContentBlocked = 'CONTENT_BLOCKED',
  BadRequest = 'BAD_REQUEST',
  ServerError = 'SERVER_ERROR',
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
    { type: ApiErrorType.InvalidApiKey, tests: ['api key not valid', 'requested entity was not found'] },
    { type: ApiErrorType.RateLimitExceeded, tests: ['rate limit'] },
    { type: ApiErrorType.ContentBlocked, tests: ['safety', 'blocked'] },
    { type: ApiErrorType.BadRequest, tests: [/\[400\]/, /bad request/i] },
    { type: ApiErrorType.ServerError, tests: [/\[5\d{2}\]/, /server error/i] },
    { type: ApiErrorType.NetworkError, tests: ['network'] },
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
  
  console.error('API Error:', error);

  let type = ApiErrorType.Unknown;
  let message = 'An unknown API error occurred.';

  if (error instanceof Response) {
      message = `HTTP error! status: ${error.status}`;
      if (error.status === 400) type = ApiErrorType.BadRequest;
      else if (error.status === 401 || error.status === 403) type = ApiErrorType.InvalidApiKey;
      else if (error.status === 429) type = ApiErrorType.RateLimitExceeded;
      else if (error.status >= 500) type = ApiErrorType.ServerError;
  } else if (error instanceof Error) {
    message = error.message;
    // Handle common network errors first, as their messages can be generic.
    if (error.name === 'TypeError' && message.toLowerCase().includes('failed to fetch')) {
        type = ApiErrorType.NetworkError;
    } else {
        // Use the data-driven matcher for more specific classification.
        type = getErrorTypeFromMessage(message);
    }
  } else if (typeof error === 'string') {
    // Handle cases where a plain string is thrown.
    message = error;
    type = getErrorTypeFromMessage(message);
  }
  
  throw new ApiError(message, type, error);
};
