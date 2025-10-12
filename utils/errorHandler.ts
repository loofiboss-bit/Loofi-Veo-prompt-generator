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
  // Handle our custom ApiError class, which is the expected error type from the service layer.
  if (error instanceof ApiError) {
    const baseMessage = t[ERROR_MESSAGE_KEYS[error.type]] || t.errorGeneric;

    // For certain errors, a more specific message from the original cause can be helpful to the user.
    if ((error.type === ApiErrorType.BadRequest || error.type === ApiErrorType.Unknown) && error.cause instanceof Error) {
        const causeMessage = error.cause.message;
        
        // Avoid appending generic network messages or messages that are just status codes.
        const isGeneric = /http error|failed to fetch|\[\d{3}\]/i.test(causeMessage);

        if (causeMessage && !isGeneric) {
            // Truncate long messages to keep the toast clean.
            const detail = causeMessage.length > 100 ? `${causeMessage.substring(0, 97)}...` : causeMessage;
            return `${baseMessage} (${detail})`;
        }
    }
    
    return baseMessage;
  }
  
  // Fallback for unexpected errors that were not wrapped in ApiError.
  // We log the technical details but show a generic message to the user for better UX.
  if (error instanceof Error) {
      console.error("An unexpected, non-API error occurred:", error);
      return t.errorGeneric;
  }

  console.error("An unexpected, non-Error object was thrown:", error);
  return t.errorGeneric;
};