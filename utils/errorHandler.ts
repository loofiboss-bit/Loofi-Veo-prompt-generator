
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
  [ApiErrorType.JsonResponseError]: '', // This type has its own message
};

/**
 * Gets a user-friendly error message from an API error.
 * @param error The error object, which can be of any type.
 * @param t The translation object for the current language.
 * @returns A translated, user-friendly error message string.
 */
export const getApiErrorMessage = (error: unknown, t: TranslationStrings): string => {
  if (error instanceof ApiError) {
    // Handle errors that have their own pre-formatted, user-friendly messages directly.
    if (error.type === ApiErrorType.JsonResponseError) {
      return error.message;
    }

    // Use the translation map for all other categorized errors.
    const messageKey = ERROR_MESSAGE_KEYS[error.type];
    return t[messageKey] || t.errorGeneric;
  }
  
  // Fallback for any unexpected errors that were not wrapped in our custom ApiError class.
  console.error("An unexpected, non-ApiError was handled by the UI:", error);
  return t.errorGeneric;
};