import { describe, expect, it } from 'vitest';

import type { VeoGenerationRequest } from '@core/types';
import { veoGenerationService } from './veoGenerationService';

const makeRequest = (overrides: Partial<VeoGenerationRequest> = {}): VeoGenerationRequest => ({
  mode: 'text-to-video',
  modelId: 'veo-3.1-fast-generate-preview',
  prompt: 'A cinematic camera move through a rain-soaked alley.',
  aspectRatio: '16:9',
  resolution: '720p',
  durationSeconds: 8,
  referenceAssetIds: [],
  ...overrides,
});

describe('veoGenerationService', () => {
  it('exposes Veo 3.1 through the provider capability contract', () => {
    expect(veoGenerationService.capabilities).toMatchObject({
      providerId: 'veo-3.1',
      maximumReferenceImages: 3,
      supportsExtension: true,
      pricingEffectiveDate: '2026-07-10',
    });
  });

  it('accepts a valid text-to-video request and estimates resolution pricing', () => {
    expect(veoGenerationService.validateRequest(makeRequest())).toEqual([]);
    expect(veoGenerationService.estimateCost(makeRequest())).toBeCloseTo(0.8);
    expect(
      veoGenerationService.estimateCost(
        makeRequest({ modelId: 'veo-3.1-generate-preview', resolution: '4k' }),
      ),
    ).toBeCloseTo(4.8);
  });

  it('enforces reference count and eight-second requirements', () => {
    const issues = veoGenerationService.validateRequest(
      makeRequest({
        mode: 'reference-images',
        durationSeconds: 6,
        referenceAssetIds: ['1', '2', '3', '4'],
      }),
    );

    expect(issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['reference-count', 'references-require-eight-seconds']),
    );
  });

  it('requires both interpolation frames', () => {
    const issues = veoGenerationService.validateRequest(
      makeRequest({ mode: 'interpolation', firstFrameAssetId: 'first' }),
    );
    expect(issues.some((issue) => issue.code === 'first-frame-required')).toBe(true);
  });

  it('blocks expired or high-resolution extension requests', () => {
    const now = 10_000;
    const issues = veoGenerationService.validateRequest(
      makeRequest({
        mode: 'extension',
        resolution: '1080p',
        extensionSourceTakeId: 'take-1',
        extensionArtifact: {
          operationName: 'operations/1',
          mediaUri: 'https://example.com/video.mp4',
          createdAt: 1,
          expiresAt: now - 1,
        },
      }),
      now,
    );

    expect(issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['extension-artifact-expired', 'extension-requires-720p']),
    );
  });
});
