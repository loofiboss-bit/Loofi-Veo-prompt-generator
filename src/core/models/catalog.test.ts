import { describe, expect, it } from 'vitest';
import {
  getProviderBinding,
  MODEL_CATALOG,
  resolveCanonicalModelId,
  resolveProviderModelId,
} from './catalog';

describe('MODEL_CATALOG', () => {
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
      expect(model.pricing.effectiveDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(model.capabilities.operations.length).toBeGreaterThan(0);
      expect(model.capabilities.inputModalities.length).toBeGreaterThan(0);
      expect(model.capabilities.outputModalities.length).toBeGreaterThan(0);
    }
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

  it('translates canonical IDs only at the provider boundary', () => {
    expect(resolveCanonicalModelId('gemini-3.1-pro-preview')).toBe('gemini-3.1-pro');
    expect(resolveProviderModelId('gemini-3.1-pro')).toBe('gemini-3.1-pro-preview');
    expect(resolveProviderModelId('gemini-3.1-pro', 'vertex-ai')).toBe('gemini-3.1-pro');
    expect(getProviderBinding('gemini-3.1-pro', 'vertex-ai')?.apiSurface).toBe('vertex-ai-v1');
  });

  it('preserves unknown IDs for project migration diagnostics', () => {
    expect(resolveCanonicalModelId('future-provider-model')).toBe('future-provider-model');
    expect(resolveProviderModelId('future-provider-model')).toBe('future-provider-model');
  });
});
