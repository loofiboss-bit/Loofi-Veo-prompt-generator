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
  // FIX: Added the 'cause' property to the class to store the original error.
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

export const parseAndThrowApiError = (error: unknown): never => {
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
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('api key not valid')) {
      type = ApiErrorType.InvalidApiKey;
    } else if (lowerMessage.includes('rate limit')) {
      type = ApiErrorType.RateLimitExceeded;
    } else if (lowerMessage.includes('safety') || lowerMessage.includes('blocked')) {
      type = ApiErrorType.ContentBlocked;
    } else if (lowerMessage.includes('400') || lowerMessage.includes('bad request')) {
      type = ApiErrorType.BadRequest;
    } else if (lowerMessage.includes('500') || lowerMessage.includes('internal server error')) {
      type = ApiErrorType.ServerError;
    } else if (error.name === 'TypeError' || lowerMessage.includes('failed to fetch') || lowerMessage.includes('network')) {
        type = ApiErrorType.NetworkError;
    }
  }
  
  throw new ApiError(message, type, error);
};
