// API Key Management Service
// Keeps browser-session credentials in memory and delegates desktop persistence to the OS vault.

import { logger } from '@core/services/loggerService';

const API_KEY_STORAGE_KEY = 'veo-gemini-api-key';
const KEYCHAIN_KEY = 'gemini-api-key';

let cachedApiKey: string | null | undefined;
let hydrationPromise: Promise<string | null> | null = null;

type ElectronBridge = {
  setSecureItem?: (key: string, value: string) => Promise<boolean>;
  deleteSecureItem?: (key: string) => Promise<void>;
  hasSecureItem?: (key: string) => Promise<boolean>;
};

function getElectron(): ElectronBridge | null {
  return typeof window !== 'undefined' && (window as { electron?: ElectronBridge }).electron
    ? ((window as { electron?: ElectronBridge }).electron as ElectronBridge)
    : null;
}

function normalizeApiKey(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readPlaintextApiKey(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return normalizeApiKey(localStorage.getItem(API_KEY_STORAGE_KEY));
  } catch {
    return null;
  }
}

function removePlaintextApiKey(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
  } catch (error) {
    logger.error('Failed to clear legacy plaintext API key:', error);
  }
}

async function resolveStoredApiKey(): Promise<string | null> {
  const electron = getElectron();

  if (electron?.hasSecureItem) {
    try {
      if (await electron.hasSecureItem(KEYCHAIN_KEY)) {
        cachedApiKey = null;
        return null;
      }
    } catch (error) {
      logger.error('Failed to check secure API key:', error);
    }
  }

  const fallbackKey = readPlaintextApiKey();
  if (fallbackKey && electron?.setSecureItem) {
    try {
      if (await electron.setSecureItem(KEYCHAIN_KEY, fallbackKey)) {
        removePlaintextApiKey();
        cachedApiKey = null;
        return null;
      }
    } catch (error) {
      logger.error('Failed to migrate legacy API key to secure storage:', error);
    }
  }
  // Legacy browser storage is read once for compatibility, then scrubbed. If no
  // desktop vault exists, the credential remains available for this session only.
  removePlaintextApiKey();
  cachedApiKey = fallbackKey;
  return fallbackKey;
}

export const hydrateStoredApiKey = async (): Promise<string | null> => {
  if (cachedApiKey !== undefined) {
    return cachedApiKey;
  }

  if (!hydrationPromise) {
    hydrationPromise = resolveStoredApiKey().finally(() => {
      hydrationPromise = null;
    });
  }

  return hydrationPromise;
};

export const getStoredApiKey = (): string | null => {
  if (cachedApiKey !== undefined) {
    return cachedApiKey;
  }

  const fallbackKey = readPlaintextApiKey();
  removePlaintextApiKey();
  cachedApiKey = fallbackKey;

  if (typeof window !== 'undefined') {
    void hydrateStoredApiKey();
  }

  return fallbackKey;
};

export const setStoredApiKey = (apiKey: string): void => {
  const normalizedApiKey = normalizeApiKey(apiKey);
  cachedApiKey = normalizedApiKey;

  if (typeof window === 'undefined') return;
  removePlaintextApiKey();
};

export const clearStoredApiKey = (): void => {
  cachedApiKey = null;

  if (typeof window === 'undefined') return;
  removePlaintextApiKey();
};

export const hasApiKey = (): boolean => {
  const key = getStoredApiKey();
  return !!key && key.length > 0;
};

export const hasApiKeyAsync = async (): Promise<boolean> => {
  const electron = getElectron();
  if (electron?.hasSecureItem) {
    try {
      return await electron.hasSecureItem(KEYCHAIN_KEY);
    } catch (error) {
      logger.error('Failed to check secure API key:', error);
    }
  }
  const key = await hydrateStoredApiKey();
  if (!key && electron?.hasSecureItem) {
    try {
      return await electron.hasSecureItem(KEYCHAIN_KEY);
    } catch (error) {
      logger.error('Failed to confirm migrated secure API key:', error);
    }
  }
  return !!key && key.length > 0;
};

export const getStoredApiKeyAsync = async (): Promise<string | null> => {
  return hydrateStoredApiKey();
};

export const setStoredApiKeyAsync = async (apiKey: string): Promise<void> => {
  const normalizedApiKey = normalizeApiKey(apiKey);
  cachedApiKey = normalizedApiKey;

  const electron = getElectron();
  if (electron?.setSecureItem && normalizedApiKey) {
    try {
      const success = await electron.setSecureItem(KEYCHAIN_KEY, normalizedApiKey);
      if (success) {
        cachedApiKey = null;
        // Remove from plaintext localStorage now that it's securely stored
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem(API_KEY_STORAGE_KEY);
          } catch (error) {
            logger.error('Failed to clear plaintext API key after secure storage:', error);
          }
        }
        return;
      }
    } catch (error) {
      logger.error('Failed to store secure API key:', error);
    }
  }

  setStoredApiKey(normalizedApiKey ?? '');
};

export const clearStoredApiKeyAsync = async (): Promise<void> => {
  const electron = getElectron();
  if (electron?.deleteSecureItem) {
    try {
      await electron.deleteSecureItem(KEYCHAIN_KEY);
    } catch (error) {
      logger.error('Failed to clear secure API key:', error);
    }
  }
  clearStoredApiKey();
};

if (typeof window !== 'undefined') {
  void hydrateStoredApiKey();
}
