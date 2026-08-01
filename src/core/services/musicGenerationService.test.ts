import { beforeEach, describe, expect, it, vi } from 'vitest';

import { musicGenerationService } from './musicGenerationService';

describe('musicGenerationService', () => {
  beforeEach(() => {
    delete window.electron;
  });

  it('uses exact flat catalog pricing and creates an auditable request', () => {
    expect(musicGenerationService.estimateMaximumCharge('lyria-3-clip-preview')).toBe(0.04);
    expect(musicGenerationService.estimateMaximumCharge('lyria-3-pro-preview')).toBe(0.08);
    const task = musicGenerationService.createTask({
      modelId: 'lyria-3-pro-preview',
      prompt: '  A two-minute orchestral song.  ',
      responseFormat: 'wav',
    });
    expect(task).toMatchObject({
      jobKind: 'music',
      status: 'Queued',
      prompt: 'A two-minute orchestral song.',
      request: { modelId: 'lyria-3-pro-preview', responseFormat: 'wav', images: [] },
      costApproval: {
        modelId: 'lyria-3-pro-preview',
        maximumChargeUsd: 0.08,
        sourceUrl: 'https://ai.google.dev/gemini-api/docs/pricing',
        verifiedDate: '2026-08-01',
      },
    });
  });

  it('blocks unsupported formats and more than ten images before IPC', () => {
    expect(() =>
      musicGenerationService.createTask({
        modelId: 'lyria-3-clip-preview',
        prompt: 'Clip',
        responseFormat: 'wav',
      }),
    ).toThrow(/does not support WAV/);
    expect(() =>
      musicGenerationService.createTask({
        modelId: 'lyria-3-pro-preview',
        prompt: 'Song',
        responseFormat: 'mp3',
        images: Array.from({ length: 11 }, () => ({
          mimeType: 'image/png' as const,
          data: 'eA==',
        })),
      }),
    ).toThrow(/at most ten/);
  });

  it('submits only through the desktop paid-job bridge', async () => {
    await expect(
      musicGenerationService.submit({
        modelId: 'lyria-3-clip-preview',
        prompt: 'Clip',
        responseFormat: 'mp3',
      }),
    ).rejects.toThrow(/desktop paid-job bridge/);

    const submitPaidJob = vi.fn(async (task) => task);
    window.electron = { submitPaidJob } as unknown as NonNullable<typeof window.electron>;
    await musicGenerationService.submit({
      modelId: 'lyria-3-clip-preview',
      prompt: 'Clip',
      responseFormat: 'mp3',
    });
    expect(submitPaidJob).toHaveBeenCalledOnce();
    expect(submitPaidJob.mock.calls[0]?.[0]).toMatchObject({
      jobKind: 'music',
      costApproval: { maximumChargeUsd: 0.04 },
    });
  });
});
