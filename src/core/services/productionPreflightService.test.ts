import { describe, expect, it } from 'vitest';
import type { ProductionRun } from '@core/types';
import { productionPreflightService } from './productionPreflightService';

const run = (overrides: Partial<ProductionRun> = {}): ProductionRun =>
  ({
    id: 'run-1',
    status: 'awaiting-approval',
    brief: 'A rain-soaked pursuit.',
    assetIds: [],
    shots: [
      {
        id: 1,
        camera: 'Dolly forward',
        generationRequest: {
          mode: 'text-to-video',
          modelId: 'veo-3.1-quality',
          prompt: 'A detective walks through rain with distant sirens and tense ambience.',
          negativePrompt: 'No text, no logos.',
          aspectRatio: '16:9',
          resolution: '720p',
          durationSeconds: 8,
          referenceAssetIds: [],
        },
        takes: [],
      },
    ],
    cost: { estimatedUsd: 3.2, approvedUsd: 0, recordedUsd: 0, pricingEffectiveDate: '2026-07-11' },
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  }) as ProductionRun;

describe('productionPreflightService', () => {
  it('returns all nine reproducible actionable categories', () => {
    const first = productionPreflightService.analyze({ run: run(), assets: [] });
    const second = productionPreflightService.analyze({ run: run(), assets: [] });
    expect(first.categories.map((result) => result.category)).toEqual([
      'prompt-clarity',
      'continuity',
      'camera',
      'motion',
      'audio',
      'safety',
      'capability',
      'cost',
      'asset-readiness',
    ]);
    expect(first.reproducibilityKey).toBe(second.reproducibilityKey);
    expect(first.recommendations[0].patch).toMatchObject({
      field: 'modelId',
      value: 'veo-3.1-fast',
    });
  });

  it('blocks missing assets and cost overruns before approval', () => {
    const broken = run({
      cost: {
        estimatedUsd: 3.2,
        approvedUsd: 0.5,
        recordedUsd: 0,
        pricingEffectiveDate: '2026-07-11',
      },
    });
    broken.shots[0].generationRequest.mode = 'image-to-video';
    broken.shots[0].generationRequest.firstFrameAssetId = 'missing';
    const result = productionPreflightService.analyze({ run: broken, assets: [] });
    expect(result.canApprove).toBe(false);
    expect(
      result.categories.filter((item) => item.status === 'blocked').map((item) => item.category),
    ).toEqual(expect.arrayContaining(['cost', 'asset-readiness']));
  });

  it('applies and undoes typed local patches without submitting work', () => {
    const source = run();
    const patch = productionPreflightService.analyze({ run: source, assets: [] }).recommendations[0]
      .patch!;
    const applied = productionPreflightService.applyPatch(source, patch);
    expect(applied.shots[0].generationRequest.modelId).toBe('veo-3.1-fast');
    expect(
      productionPreflightService.undoPatch(applied, patch).shots[0].generationRequest.modelId,
    ).toBe('veo-3.1-quality');
  });
});
