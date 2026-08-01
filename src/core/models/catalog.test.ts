import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import {
  getModel,
  getProviderBinding,
  MODEL_CATALOG,
  resolveCanonicalModelId,
  resolveProviderModelId,
} from './catalog';

const require = createRequire(import.meta.url);
const electronPricing = require('../../../electron/paid-job-pricing.cjs') as {
  VIDEO_USD_PER_SECOND: Record<string, Record<string, number>>;
  MUSIC_USD_PER_REQUEST: Record<string, number>;
  TEXT_USD_PER_MILLION_TOKENS: Record<string, { input: number; output: number }>;
};

describe('MODEL_CATALOG', () => {
  it('keeps the Electron security-boundary mirror aligned with the canonical catalog', () => {
    for (const [modelId, resolutions] of Object.entries(electronPricing.VIDEO_USD_PER_SECOND)) {
      expect(getModel(modelId)?.pricing.videoPerSecondByResolutionUsd).toMatchObject(resolutions);
    }
    for (const [providerModelId, prices] of Object.entries(
      electronPricing.TEXT_USD_PER_MILLION_TOKENS,
    )) {
      const entry = MODEL_CATALOG.find(
        (model) =>
          model.providerModelId === providerModelId ||
          model.providerBindings.some((binding) => binding.modelId === providerModelId),
      );
      expect(entry?.pricing.tokenTiers?.[0]?.inputPerMillionUsd?.text).toBe(prices.input);
      expect(entry?.pricing.tokenTiers?.[0]?.outputPerMillionUsd?.text).toBe(prices.output);
    }
    for (const [modelId, price] of Object.entries(electronPricing.MUSIC_USD_PER_REQUEST)) {
      expect(getModel(modelId)?.pricing.flatRequestUsd).toBe(price);
    }
  });
  it('does not permit shut-down models in the executable catalog', () => {
    expect(MODEL_CATALOG.filter((model) => model.lifecycle === 'shut-down')).toEqual([]);
  });

  it('assigns every executable model a unique lifecycle entry', () => {
    const modelIds = MODEL_CATALOG.map((model) => model.id);
    expect(new Set(modelIds).size).toBe(modelIds.length);
  });

  it('contains the complete versioned registry metadata for every model', () => {
    for (const model of MODEL_CATALOG) {
      expect(model.apiSurface).toBeTruthy();
      expect(model.providerBindings.length).toBeGreaterThan(0);
      expect(model.minimumSdkVersion).toMatch(/^\d+\.\d+\.\d+$/);
      expect(Array.isArray(model.regionRestrictions)).toBe(true);
      expect(model.pricing.source.effectiveDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(model.pricing.source.verifiedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(model.pricing.source.sourceUrl).toBe('https://ai.google.dev/gemini-api/docs/pricing');
      expect(model.pricing.source.currency).toBe('USD');
      expect(model.pricing.billingModes.length).toBeGreaterThan(0);
      expect(model.pricing.assumptions.length).toBeGreaterThan(0);
      expect(model.capabilities.operations.length).toBeGreaterThan(0);
      expect(model.capabilities.inputModalities.length).toBeGreaterThan(0);
      expect(model.capabilities.outputModalities.length).toBeGreaterThan(0);
    }
  });

  it('keeps every executable paid model explicitly priced or explicitly unavailable', () => {
    for (const model of MODEL_CATALOG.filter((entry) => entry.provider !== 'ollama')) {
      expect(['priced', 'unavailable']).toContain(model.pricing.status);
      if (model.pricing.status === 'priced') {
        expect(
          model.pricing.tokenTiers?.length ||
            Object.keys(model.pricing.imagePerGenerationByResolutionUsd ?? {}).length ||
            Object.keys(model.pricing.videoPerSecondByResolutionUsd ?? {}).length ||
            Object.keys(model.pricing.videoOutputTokensPerSecondByResolution ?? {}).length ||
            model.pricing.flatRequestUsd,
        ).toBeTruthy();
      } else {
        expect(model.pricing.unavailableReason).toBeTruthy();
      }
    }
  });

  it('records current stable general and image models', () => {
    expect(MODEL_CATALOG.find((model) => model.id === 'gemini-3.6-flash')?.lifecycle).toBe(
      'stable',
    );
    expect(MODEL_CATALOG.find((model) => model.id === 'gemini-3.5-flash-lite')?.lifecycle).toBe(
      'stable',
    );
    expect(MODEL_CATALOG.find((model) => model.id === 'nano-banana-pro')?.lifecycle).toBe('stable');
  });

  it('defines all video constraints rather than relying on UI defaults', () => {
    for (const model of MODEL_CATALOG.filter((entry) =>
      entry.capabilities.operations.includes('video'),
    )) {
      expect(model.capabilities.supportedAspectRatios?.length).toBeGreaterThan(0);
      if (model.id.startsWith('veo-')) {
        expect(model.capabilities.supportedDurationsSeconds?.length).toBeGreaterThan(0);
        expect(model.capabilities.supportedResolutions?.length).toBeGreaterThan(0);
        expect(model.capabilities.maximumReferenceImages).toBeTypeOf('number');
      }
    }
  });

  it('defines the official Lyria 3 request limits and formats', () => {
    const clip = getModel('lyria-3-clip-preview');
    const pro = getModel('lyria-3-pro-preview');
    expect(clip?.apiSurface).toBe('google-ai-interactions-v1beta');
    expect(clip?.capabilities).toMatchObject({
      maximumInputImages: 10,
      supportedAudioFormats: ['mp3'],
      fixedDurationSeconds: 30,
    });
    expect(pro?.capabilities.supportedAudioFormats).toEqual(['mp3', 'wav']);
  });

  it('translates canonical IDs only at the provider boundary', () => {
    expect(resolveCanonicalModelId('gemini-3.1-pro-preview')).toBe('gemini-3.1-pro');
    expect(resolveProviderModelId('gemini-3.1-pro')).toBe('gemini-3.1-pro-preview');
    expect(resolveProviderModelId('gemini-3.1-pro', 'vertex-ai')).toBe('gemini-3.1-pro');
    expect(getProviderBinding('gemini-3.1-pro', 'vertex-ai')?.apiSurface).toBe('vertex-ai-v1');
  });

  it('maps retired persisted IDs to actionable current replacements', () => {
    expect(resolveCanonicalModelId('gemini-2.0-flash')).toBe('gemini-3.5-flash-lite');
    expect(resolveCanonicalModelId('veo-3.1-lite-generate-preview')).toBe('veo-3.1-lite');
  });

  it('preserves unknown IDs for project migration diagnostics', () => {
    expect(resolveCanonicalModelId('future-provider-model')).toBe('future-provider-model');
    expect(resolveProviderModelId('future-provider-model')).toBe('future-provider-model');
  });
});
