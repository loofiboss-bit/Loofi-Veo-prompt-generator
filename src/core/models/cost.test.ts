import { describe, expect, it } from 'vitest';
import { getModel } from './catalog';
import { estimateMaximumModelCost, requireUsableCostEstimate } from './cost';

const model = (id: string) => {
  const entry = getModel(id);
  if (!entry) throw new Error(`Missing test model ${id}`);
  return entry;
};

describe('estimateMaximumModelCost', () => {
  it('separates input, output, and cached token charges', () => {
    const estimate = estimateMaximumModelCost(model('gemini-3.5-flash'), {
      estimatedInputTokens: 1_000_000,
      cachedInputTokens: 200_000,
      estimatedOutputTokens: 100_000,
    });
    expect(estimate.confidence).toBe('upper-bound');
    expect(estimate.maximumChargeUsd).toBeCloseTo(2.13);
    expect(estimate.lineItems.map((item) => item.billingMode)).toEqual([
      'input-tokens',
      'cached-tokens',
      'output-tokens',
    ]);
  });

  it('uses the higher Gemini Pro tier above 200k input tokens', () => {
    const estimate = estimateMaximumModelCost(model('gemini-3.1-pro'), {
      estimatedInputTokens: 200_001,
      estimatedOutputTokens: 10_000,
    });
    expect(estimate.maximumChargeUsd).toBeCloseTo(0.980004);
  });

  it('prices image generation by requested resolution', () => {
    const oneK = estimateMaximumModelCost(model('nano-banana-pro'), {
      estimatedInputTokens: 100,
      imageCount: 2,
      imageResolution: '1k',
    });
    const fourK = estimateMaximumModelCost(model('nano-banana-pro'), {
      estimatedInputTokens: 100,
      imageCount: 2,
      imageResolution: '4k',
    });
    expect(requireUsableCostEstimate(oneK)).toBeCloseTo(0.2682);
    expect(requireUsableCostEstimate(fourK)).toBeCloseTo(0.4802);
  });

  it('prices Veo duration and resolution without zero fallback', () => {
    expect(
      requireUsableCostEstimate(
        estimateMaximumModelCost(model('veo-3.1-lite'), {
          videoDurationSeconds: 8,
          videoResolution: '720p',
        }),
      ),
    ).toBeCloseTo(0.4);
    const unsupported = estimateMaximumModelCost(model('veo-3.1-lite'), {
      videoDurationSeconds: 8,
      videoResolution: '4k',
    });
    expect(unsupported.confidence).toBe('unavailable');
    expect(unsupported.maximumChargeUsd).toBeNull();
  });

  it('calculates Omni video as a token-based upper bound', () => {
    const estimate = estimateMaximumModelCost(model('gemini-omni-flash'), {
      estimatedInputTokens: 1_000,
      videoDurationSeconds: 8,
      videoResolution: '720p',
    });
    expect(estimate.confidence).toBe('upper-bound');
    expect(requireUsableCostEstimate(estimate)).toBeCloseTo(0.81238);
    expect(estimate.explanation).toContain('upper-bound');
  });

  it('blocks missing, malformed, and zero-assumed pricing inputs', () => {
    for (const context of [
      undefined,
      { videoDurationSeconds: 8 },
      { videoDurationSeconds: Number.NaN, videoResolution: '720p' as const },
      { videoDurationSeconds: 0, videoResolution: '720p' as const },
    ]) {
      const estimate = estimateMaximumModelCost(model('veo-3.1-fast'), context);
      expect(estimate.confidence).toBe('unavailable');
      expect(estimate.maximumChargeUsd).toBeNull();
      expect(() => requireUsableCostEstimate(estimate)).toThrow('Paid execution is blocked');
    }
  });
});
