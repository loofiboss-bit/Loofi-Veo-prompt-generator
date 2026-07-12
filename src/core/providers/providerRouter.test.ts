import { describe, expect, it, vi } from 'vitest';
import type { GenerativeProviderAdapter } from './types';
import { ProviderRouter } from './providerRouter';
import { ProviderExecutionError } from './types';

const makeAdapter = (execute: GenerativeProviderAdapter['execute']): GenerativeProviderAdapter => ({
  provider: 'gemini-api',
  supports: () => true,
  execute,
  testConnection: vi.fn(),
});

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

  it('falls back after a classified model availability failure and records provenance', async () => {
    const execute = vi
      .fn()
      .mockRejectedValueOnce(new ProviderExecutionError('model unavailable', 'model-unavailable'))
      .mockResolvedValueOnce({ rawModelId: 'veo-3.1-generate-preview' });
    const router = new ProviderRouter([makeAdapter(execute)]);

    await expect(
      router.execute(
        { operation: 'video', mode: 'fast' },
        {
          operation: 'video',
          prompt: 'Generate a shot.',
          costContext: {
            approvedCeilingUsd: 4,
            videoDurationSeconds: 8,
            videoResolution: '720p',
          },
        },
      ),
    ).resolves.toMatchObject({
      selectedModelId: 'veo-3.1-quality',
      fallbackReason: 'model-unavailable',
      estimatedMaximumCostUsd: 3.2,
    });
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it('does not exceed the approved cost ceiling during fallback', async () => {
    const failure = new ProviderExecutionError('rate limited', 'rate-limit');
    const execute = vi.fn().mockRejectedValue(failure);
    const router = new ProviderRouter([makeAdapter(execute)]);

    await expect(
      router.execute(
        { operation: 'video', mode: 'fast' },
        {
          operation: 'video',
          prompt: 'Generate a shot.',
          costContext: {
            approvedCeilingUsd: 1,
            videoDurationSeconds: 8,
            videoResolution: '720p',
          },
        },
      ),
    ).rejects.toBe(failure);
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('requires an approved ceiling before paid media execution', async () => {
    const execute = vi.fn();
    const router = new ProviderRouter([makeAdapter(execute)]);
    await expect(
      router.execute(
        { operation: 'image', mode: 'smart' },
        { operation: 'image', prompt: 'Generate key art.' },
      ),
    ).rejects.toThrow('Approved cost ceiling is required');
    expect(execute).not.toHaveBeenCalled();
  });

  it('retries transient network errors on the same model without changing controls', async () => {
    const execute = vi
      .fn()
      .mockRejectedValueOnce(new ProviderExecutionError('timeout', 'network'))
      .mockResolvedValueOnce({ rawModelId: 'gemini-3.5-flash', text: 'ok' });
    const router = new ProviderRouter([makeAdapter(execute)]);
    const request = { operation: 'plan' as const, prompt: 'Plan.' };

    await expect(
      router.execute({ operation: 'plan', mode: 'smart' }, request),
    ).resolves.toMatchObject({ selectedModelId: 'gemini-3.5-flash' });
    expect(execute).toHaveBeenNthCalledWith(1, expect.objectContaining(request));
    expect(execute).toHaveBeenNthCalledWith(2, expect.objectContaining(request));
  });

  it('never falls back for authentication, quota, safety, or invalid requests', async () => {
    for (const kind of ['authentication', 'quota', 'safety', 'invalid-capability'] as const) {
      const execute = vi.fn().mockRejectedValue(new ProviderExecutionError(kind, kind));
      const router = new ProviderRouter([makeAdapter(execute)]);
      await expect(
        router.execute(
          { operation: 'plan', mode: 'quality' },
          { operation: 'plan', prompt: 'Plan.' },
        ),
      ).rejects.toMatchObject({ kind });
      expect(execute).toHaveBeenCalledTimes(1);
    }
  });
});
