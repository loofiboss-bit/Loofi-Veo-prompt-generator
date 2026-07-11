import { describe, expect, it } from 'vitest';
import { MODEL_CATALOG, resolveCanonicalModelId, resolveProviderModelId } from './catalog';

describe('MODEL_CATALOG', () => {
  it('does not permit shut-down models in the executable catalog', () => {
    expect(MODEL_CATALOG.filter((model) => model.lifecycle === 'shut-down')).toEqual([]);
  });

  it('assigns every executable model a unique lifecycle entry', () => {
    const modelIds = MODEL_CATALOG.map((model) => model.id);
    expect(new Set(modelIds).size).toBe(modelIds.length);
  });

  it('translates canonical IDs only at the provider boundary', () => {
    expect(resolveCanonicalModelId('gemini-3.1-pro-preview')).toBe('gemini-3.1-pro');
    expect(resolveProviderModelId('gemini-3.1-pro')).toBe('gemini-3.1-pro-preview');
  });

  it('preserves unknown IDs for project migration diagnostics', () => {
    expect(resolveCanonicalModelId('future-provider-model')).toBe('future-provider-model');
    expect(resolveProviderModelId('future-provider-model')).toBe('future-provider-model');
  });
});
