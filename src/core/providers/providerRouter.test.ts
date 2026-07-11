import { describe, expect, it, vi } from 'vitest';
import type { GenerativeProviderAdapter } from './types';
import { ProviderRouter } from './providerRouter';

describe('ProviderRouter', () => {
  it('selects the adapter from the centralized model decision', async () => {
    const execute = vi.fn().mockResolvedValue({ rawModelId: 'gemini-3.5-flash', text: 'ok' });
    const adapter: GenerativeProviderAdapter = {
      provider: 'gemini-api',
      supports: () => true,
      execute,
      testConnection: vi.fn(),
    };
    const router = new ProviderRouter([adapter]);

    await expect(
      router.execute(
        { operation: 'plan', mode: 'smart' },
        { operation: 'plan', prompt: 'Plan a shot.' },
      ),
    ).resolves.toMatchObject({ text: 'ok' });
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({ model: expect.objectContaining({ id: 'gemini-3.5-flash' }) }),
    );
  });
});
