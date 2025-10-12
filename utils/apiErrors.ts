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

    // Prioritize specific error messages from the Gemini SDK or fetch responses
    if (lowerMessage.includes('api key not valid')) {
      type = ApiErrorType.InvalidApiKey;
    } else if (lowerMessage.includes('rate limit')) {
      type = ApiErrorType.RateLimitExceeded;
    } else if (lowerMessage.includes('safety') || lowerMessage.includes('blocked')) {
      type = ApiErrorType.ContentBlocked;
    } 
    // Check for explicit HTTP status codes in the message (e.g., "[400] Bad Request")
    else if (/\[400\]|bad request/i.test(message)) {
      type = ApiErrorType.BadRequest;
    } else if (/\[5\d{2}\]|server error/i.test(message)) {
      type = ApiErrorType.ServerError;
    } 
    // Check for network-related errors
    else if (error.name === 'TypeError' || lowerMessage.includes('failed to fetch') || lowerMessage.includes('network')) {
        type = ApiErrorType.NetworkError;
    }
  }
  
  throw new ApiError(message, type, error);
};