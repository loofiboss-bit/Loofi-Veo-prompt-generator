// API Key Management Service
// Stores and retrieves the API key from localStorage

import { logger } from '@core/services/loggerService';

const API_KEY_STORAGE_KEY = 'veo-gemini-api-key';

// Default fallback API key for standalone app
const DEFAULT_API_KEY = 'AIzaSyCxEeshfl5JBDvMLElixaOHvjWonMPhZjQ';

export const getStoredApiKey = (): string | null => {
  if (typeof window === 'undefined') return DEFAULT_API_KEY;
  try {
    const stored = localStorage.getItem(API_KEY_STORAGE_KEY);
    return stored || DEFAULT_API_KEY;
  } catch {
    return DEFAULT_API_KEY;
  }
};

export const setStoredApiKey = (apiKey: string): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
  } catch (e) {
    logger.error('Failed to store API key:', e);
  }
};

export const clearStoredApiKey = (): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
  } catch (e) {
    logger.error('Failed to clear API key:', e);
  }
};

export const hasApiKey = (): boolean => {
  const key = getStoredApiKey();
  return !!key && key.length > 0;
};
