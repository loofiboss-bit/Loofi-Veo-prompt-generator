import { describe, expect, it } from 'vitest';
import { MODEL_LIFECYCLE_CATALOG } from './catalog';

describe('MODEL_LIFECYCLE_CATALOG', () => {
  it('does not permit shut-down models in the executable catalog', () => {
    expect(MODEL_LIFECYCLE_CATALOG.filter((model) => model.status === 'shut-down')).toEqual([]);
  });

  it('assigns every executable model a unique lifecycle entry', () => {
    const modelIds = MODEL_LIFECYCLE_CATALOG.map((model) => model.id);
    expect(new Set(modelIds).size).toBe(modelIds.length);
  });
});
