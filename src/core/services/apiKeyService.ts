// API Key Management Service
// Stores and retrieves the API key from localStorage

import { logger } from '@core/services/loggerService';

const API_KEY_STORAGE_KEY = 'veo-gemini-api-key';

export const getStoredApiKey = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(API_KEY_STORAGE_KEY) || null;
  } catch {
    return null;
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

// ── Secure Keychain (Electron keytar) ───────────────────────────────────
// When running inside Electron, API keys are stored in the OS credential
// vault via keytar (Windows Credential Manager / macOS Keychain / Linux
// secret service). Falls back to localStorage in plain browser / dev-server
// contexts where the IPC bridge is unavailable.

const KEYCHAIN_KEY = 'gemini-api-key';

type ElectronBridge = {
  getSecureItem?: (key: string) => Promise<string | null>;
  setSecureItem?: (key: string, value: string) => Promise<boolean>;
  deleteSecureItem?: (key: string) => Promise<void>;
};

function getElectron(): ElectronBridge | null {
  return typeof window !== 'undefined' && (window as { electron?: ElectronBridge }).electron
    ? ((window as { electron?: ElectronBridge }).electron as ElectronBridge)
    : null;
}

export const getStoredApiKeyAsync = async (): Promise<string | null> => {
  const electron = getElectron();
  if (electron?.getSecureItem) {
    const key = await electron.getSecureItem(KEYCHAIN_KEY);
    if (key) return key;
  }
  return getStoredApiKey();
};

export const setStoredApiKeyAsync = async (apiKey: string): Promise<void> => {
  const electron = getElectron();
  if (electron?.setSecureItem) {
    const success = await electron.setSecureItem(KEYCHAIN_KEY, apiKey);
    if (success) {
      // Remove from plaintext localStorage now that it's securely stored
      clearStoredApiKey();
      return;
    }
  }
  setStoredApiKey(apiKey);
};

export const clearStoredApiKeyAsync = async (): Promise<void> => {
  const electron = getElectron();
  if (electron?.deleteSecureItem) {
    await electron.deleteSecureItem(KEYCHAIN_KEY);
  }
  clearStoredApiKey();
};
