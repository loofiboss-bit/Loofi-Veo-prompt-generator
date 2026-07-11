import { describe, expect, it } from 'vitest';
import { MODEL_CATALOG } from './catalog';

describe('MODEL_CATALOG', () => {
  it('does not permit shut-down models in the executable catalog', () => {
    expect(MODEL_CATALOG.filter((model) => model.lifecycle === 'shut-down')).toEqual([]);
  });

  it('assigns every executable model a unique lifecycle entry', () => {
    const modelIds = MODEL_CATALOG.map((model) => model.id);
    expect(new Set(modelIds).size).toBe(modelIds.length);
  });
});
