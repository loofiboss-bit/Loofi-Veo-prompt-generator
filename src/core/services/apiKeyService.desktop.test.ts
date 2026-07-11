import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@core/services/loggerService', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

describe('desktop API key boundary', () => {
  afterEach(() => {
    delete window.electron;
    localStorage.clear();
    vi.resetModules();
  });

  it('checks keychain presence without exposing the stored secret', async () => {
    window.electron = {
      hasSecureItem: vi.fn().mockResolvedValue(true),
      setSecureItem: vi.fn(),
      deleteSecureItem: vi.fn(),
    } as unknown as ElectronAPI;
    const service = await import('./apiKeyService');

    await expect(service.hasApiKeyAsync()).resolves.toBe(true);
    await expect(service.getStoredApiKeyAsync()).resolves.toBeNull();
    expect(window.electron).not.toHaveProperty('getSecureItem');
  });

  it('migrates a legacy plaintext key into the vault and clears renderer storage', async () => {
    localStorage.setItem('veo-gemini-api-key', 'legacy-secret');
    let vaultConfigured = false;
    const setSecureItem = vi.fn().mockImplementation(async () => {
      vaultConfigured = true;
      return true;
    });
    const hasSecureItem = vi.fn().mockImplementation(async () => vaultConfigured);
    window.electron = {
      hasSecureItem,
      setSecureItem,
      deleteSecureItem: vi.fn(),
    } as unknown as ElectronAPI;
    const service = await import('./apiKeyService');

    await expect(service.hasApiKeyAsync()).resolves.toBe(true);
    expect(setSecureItem).toHaveBeenCalledWith('gemini-api-key', 'legacy-secret');
    expect(localStorage.getItem('veo-gemini-api-key')).toBeNull();
    await expect(service.getStoredApiKeyAsync()).resolves.toBeNull();
  });
});
