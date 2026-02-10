
import { ApiError, ApiErrorType } from './apiErrors';
import { log } from '@core/services/loggerService';

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
  [ApiErrorType.ResourceNotFound]: 'errorResourceNotFound',
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
  [ApiErrorType.ResourceNotFound]: 'solutionResourceNotFound',
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
    // Log the error with appropriate level
    const logLevel = error.type === ApiErrorType.NetworkError ||
      error.type === ApiErrorType.ServiceUnavailable
      ? 'warn' : 'error';

    log[logLevel](`API Error: ${ApiErrorType[error.type]}`, 'ErrorHandler', {
      type: error.type,
      message: error.message,
      cause: error.cause
    });

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

    let finalMessage = mainMessage;

    // Append solution if available
    const solution = t[solutionKey];
    if (solution) {
      finalMessage += `\n\n${solution}`;
    }

    // Append specific technical details for certain error types to aid debugging, 
    // unless the technical detail matches the generic message (to avoid duplication).
    if ([ApiErrorType.BadRequest, ApiErrorType.ResourceNotFound, ApiErrorType.Unknown, ApiErrorType.ServerError, ApiErrorType.ContentBlocked].includes(error.type)) {
      if (error.message && error.message !== mainMessage && !error.message.includes('An unknown API error occurred')) {
        const cleanMessage = error.message.replace(/^Error:\s*/i, '');
        finalMessage += `\n\n(Technical Details: ${cleanMessage})`;
      }
    }

    return finalMessage;
  }

  // Fallback for any unexpected errors that were not wrapped in our custom ApiError class.
  log.error('Unexpected non-ApiError handled by UI', 'ErrorHandler', error);

  let detail = '';
  if (error instanceof Error) detail = `\n\n(Details: ${error.message})`;

  return `${t.errorGeneric}\n\n${t.solutionGeneric}${detail}`;
};
