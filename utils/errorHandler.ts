
import { ApiError, ApiErrorType } from './apiErrors';

// A generic type for the translation object
type TranslationStrings = { [key: string]: any };

const ERROR_MESSAGE_KEYS: Record<ApiErrorType, string> = {
  [ApiErrorType.InvalidApiKey]: 'errorApiKeyInvalid',
  [ApiErrorType.QuotaExceeded]: 'errorQuotaExceeded',
  [ApiErrorType.RateLimitExceeded]: 'errorRateLimit',
  [ApiErrorType.ContentBlocked]: 'errorSafety',
  [ApiErrorType.BadRequest]: 'errorBadRequest',
  [ApiErrorType.ServerError]: 'errorServerError',
  [ApiErrorType.ServiceUnavailable]: 'errorServiceUnavailable',
  [ApiErrorType.NetworkError]: 'errorNetwork',
  [ApiErrorType.LocationNotSupported]: 'errorLocationNotSupported',
  [ApiErrorType.Unknown]: 'errorGeneric',
  [ApiErrorType.JsonResponseError]: '', // This type has its own message
};

const ERROR_SOLUTION_KEYS: Record<ApiErrorType, string> = {
  [ApiErrorType.InvalidApiKey]: 'solutionApiKeyInvalid',
  [ApiErrorType.QuotaExceeded]: 'solutionQuotaExceeded',
  [ApiErrorType.RateLimitExceeded]: 'solutionRateLimit',
  [ApiErrorType.ContentBlocked]: 'solutionSafety',
  [ApiErrorType.BadRequest]: 'solutionBadRequest',
  [ApiErrorType.ServerError]: 'solutionServerError',
  [ApiErrorType.ServiceUnavailable]: 'solutionServiceUnavailable',
  [ApiErrorType.NetworkError]: 'solutionNetwork',
  [ApiErrorType.LocationNotSupported]: 'solutionLocationNotSupported',
  [ApiErrorType.Unknown]: 'solutionGeneric',
  [ApiErrorType.JsonResponseError]: '',
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

    // Use the translation map for categorized errors.
    const messageKey = ERROR_MESSAGE_KEYS[error.type];
    const solutionKey = ERROR_SOLUTION_KEYS[error.type];
    
    // Fallback: if translation is missing, use the internal message for specific types that are safe to show
    let mainMessage = t[messageKey];
    
    if (!mainMessage && [ApiErrorType.NetworkError, ApiErrorType.BadRequest].includes(error.type)) {
        mainMessage = error.message;
    }
    
    mainMessage = mainMessage || t.errorGeneric;
    
    // Append solution if available
    const solution = t[solutionKey];
    if (solution) {
        return `${mainMessage}\n\n${solution}`;
    }

    return mainMessage;
  }
  
  // Fallback for any unexpected errors that were not wrapped in our custom ApiError class.
  console.error("An unexpected, non-ApiError was handled by the UI:", error);
  return `${t.errorGeneric}\n\n${t.solutionGeneric}`;
};
