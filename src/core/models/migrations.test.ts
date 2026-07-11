import { describe, expect, it } from 'vitest';
import { migrateModelPreference } from './migrations';

describe('migrateModelPreference', () => {
  it('maps retired IDs while retaining the source for recovery', () => {
    expect(migrateModelPreference({ model: 'gemini-3-pro-preview', veoModel: 'fast' })).toEqual({
      requestedModelId: 'gemini-3-pro-preview',
      resolvedModelId: 'gemini-3.5-flash',
      migratedFrom: 'gemini-3-pro-preview',
      mode: 'fast',
    });
  });

  it('preserves an unknown model ID instead of discarding it', () => {
    expect(migrateModelPreference({ model: 'future-model-99' })).toMatchObject({
      requestedModelId: 'future-model-99',
      resolvedModelId: 'future-model-99',
      mode: 'smart',
    });
  });

  it('is idempotent for a v8 preference', () => {
    const preference = {
      requestedModelId: 'veo-3.1-lite',
      resolvedModelId: 'veo-3.1-lite',
      mode: 'economy' as const,
    };
    expect(migrateModelPreference({ modelPreference: preference })).toBe(preference);
  });
});
