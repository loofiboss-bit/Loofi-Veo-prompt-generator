
export enum ApiErrorType {
  InvalidApiKey = 'INVALID_API_KEY',
  RateLimitExceeded = 'RATE_LIMIT_EXCEEDED',
  ModelOverloaded = 'MODEL_OVERLOADED',
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
// Using Regex allows for case-insensitive and partial matching.
const errorMessageMatchers: { type: ApiErrorType, tests: (RegExp)[] }[] = [
    { 
        type: ApiErrorType.InvalidApiKey, 
        tests: [
            /api key not valid/i, 
            /unauthenticated/i, 
            /key expired/i,
            /requested entity was not found/i, // Often implies project/billing issues with Veo
            /401/i, 
            /403/i
        ] 
    },
    { 
        type: ApiErrorType.RateLimitExceeded, 
        tests: [
            /rate limit/i, 
            /quota/i, 
            /resource exhausted/i, 
            /too many requests/i,
            /429/i
        ] 
    },
    { 
        type: ApiErrorType.ModelOverloaded, 
        tests: [
            /overloaded/i, 
            /capacity/i, 
            /busy/i,
            /503/i,
            /service unavailable/i
        ] 
    },
    { 
        type: ApiErrorType.ContentBlocked, 
        tests: [
            /safety/i, 
            /blocked/i, 
            /policy/i, 
            /finish.?reason/i,
            /violation/i
        ] 
    },
    { 
        type: ApiErrorType.BadRequest, 
        tests: [
            /bad request/i,
            /invalid argument/i,
            /400/i
        ] 
    },
    { 
        type: ApiErrorType.ServerError, 
        tests: [
            /server error/i,
            /internal error/i,
            /500/i, 
            /502/i, 
            /504/i
        ] 
    },
    { 
        type: ApiErrorType.NetworkError, 
        tests: [
            /network/i, 
            /fetch failed/i, 
            /connection/i, 
            /offline/i,
            /failed to fetch/i
        ] 
    },
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
            if (test.test(lowerMessage)) {
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
      message = `HTTP error! status: ${error.status} ${error.statusText}`;
      if (error.status === 400) type = ApiErrorType.BadRequest;
      else if (error.status === 401 || error.status === 403) type = ApiErrorType.InvalidApiKey;
      else if (error.status === 429) type = ApiErrorType.RateLimitExceeded;
      else if (error.status === 503) type = ApiErrorType.ModelOverloaded;
      else if (error.status >= 500) type = ApiErrorType.ServerError;
  } else if (error instanceof Error) {
    message = error.message;
    type = getErrorTypeFromMessage(message);
  } else if (typeof error === 'string') {
    // Handle cases where a plain string is thrown.
    message = error;
    type = getErrorTypeFromMessage(message);
  }
  
  throw new ApiError(message, type, error);
};
