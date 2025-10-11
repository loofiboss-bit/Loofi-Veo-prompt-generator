import { ApiError, ApiErrorType } from './apiErrors';

// A generic type for the translation object
type TranslationStrings = { [key: string]: string };

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
  if (error instanceof ApiError) {
    const messageKey = ERROR_MESSAGE_KEYS[error.type] || 'errorGeneric';
    // Fallback to the generic error message if the specific key doesn't exist.
    return t[messageKey] || t['errorGeneric'];
  }
  
  // Log the unexpected error for debugging purposes and return a generic message.
  console.error("An unexpected, non-API error occurred:", error);
  return t['errorGeneric'];
};
