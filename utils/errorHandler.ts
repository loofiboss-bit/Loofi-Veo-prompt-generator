import { ApiError, ApiErrorType } from './apiErrors';

// A generic type for the translation object
type TranslationStrings = { [key: string]: any };

const ERROR_MESSAGE_KEYS: Record<ApiErrorType, string> = {
  [ApiErrorType.InvalidApiKey]: 'errorApiKeyInvalid',
  [ApiErrorType.RateLimitExceeded]: 'errorRateLimit',
  [ApiErrorType.ContentBlocked]: 'errorSafety',
  [ApiErrorType.BadRequest]: 'errorBadRequest',
  [ApiErrorType.ServerError]: 'errorServerError',
  [ApiErrorType.NetworkError]: 'errorNetwork',
  [ApiErrorType.Unknown]: 'errorGeneric',
};

/**
 * Gets a user-friendly error message from an API error.
 * @param error The error object, which can be of any type.
 * @param t The translation object for the current language.
 * @returns A translated, user-friendly error message string.
 */
export const getApiErrorMessage = (error: unknown, t: TranslationStrings): string => {
  // Handle our custom ApiError class
  if (error instanceof ApiError) {
    const baseMessage = t[ERROR_MESSAGE_KEYS[error.type]] || t.errorGeneric;

    // For bad requests or unknown errors, provide more context from the original error if possible.
    if ((error.type === ApiErrorType.BadRequest || error.type === ApiErrorType.Unknown) && error.cause instanceof Error) {
        // Sometimes the cause message is just a generic HTTP status, which isn't helpful.
        // We only append if it seems like a specific message from the API.
        const causeMessage = error.cause.message;
        if (causeMessage && !causeMessage.toLowerCase().includes('http error')) {
            return `${baseMessage}: ${causeMessage}`;
        }
    }
    
    return baseMessage;
  }
  
  // Handle standard JavaScript Error objects that weren't wrapped in ApiError
  if (error instanceof Error) {
      console.error("An unexpected, non-API error occurred:", error);
      return `${t.errorGeneric}: ${error.message}`;
  }

  // Fallback for non-Error types
  console.error("An unexpected, non-Error object was thrown:", error);
  return t.errorGeneric;
};
