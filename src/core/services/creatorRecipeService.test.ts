import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CREATOR_RECIPES } from '@core/config/creatorRecipes';
import { buildRecipeDraft, creatorRecipeService } from './creatorRecipeService';

const mockStore = new Map<string, unknown>();
vi.mock('idb-keyval', () => ({
  get: vi.fn((key: string) => Promise.resolve(mockStore.get(key))),
  set: vi.fn((key: string, value: unknown) => {
    mockStore.set(key, value);
    // Simulate DB I/O latency (5ms per query)
    return new Promise((resolve) => setTimeout(resolve, 5));
  }),
  del: vi.fn((key: string) => {
    mockStore.delete(key);
    return Promise.resolve();
  }),
  update: vi.fn((key: string, updater: (old: unknown) => unknown) => {
    const val = updater(mockStore.get(key));
    mockStore.set(key, val);
    return Promise.resolve();
  }),
  keys: vi.fn(() => Promise.resolve([...mockStore.keys()])),
  createStore: vi.fn(),
}));

describe('creator recipes', () => {
  beforeEach(() => {
    mockStore.clear();
    // Ensure URL.createObjectURL returns a string in jsdom
    if (!globalThis.URL.createObjectURL) {
      globalThis.URL.createObjectURL = (_blob: Blob) => `blob:mock-${crypto.randomUUID()}`;
    }
  });

  it('creates project from local media files with ordered timeline clips', async () => {
    const files = [
      new File(['img1'], 'photo1.png', { type: 'image/png' }),
      new File(['img2'], 'photo2.png', { type: 'image/png' }),
      new File(['img3'], 'photo3.png', { type: 'image/png' }),
    ];
    const result = await creatorRecipeService.createFromFiles(files, 'My Media Project');
    expect(result.assets).toHaveLength(3);
    expect(result.assets[0].name).toBe('photo1.png');
    expect(result.assets[1].name).toBe('photo2.png');
    expect(result.assets[2].name).toBe('photo3.png');
    expect(result.project.name).toBe('My Media Project');
    expect(result.project.storyboard.timeline.clips).toHaveLength(3);
  });

  it('benchmarks createFromFiles performance with multiple files', async () => {
    const fileCount = 10;
    const files = Array.from(
      { length: fileCount },
      (_, i) => new File([`data-${i}`], `image_${i}.png`, { type: 'image/png' }),
    );
    const start = performance.now();
    const result = await creatorRecipeService.createFromFiles(files, 'Benchmark Project');
    const elapsed = performance.now() - start;
    expect(result.assets).toHaveLength(fileCount);
    console.log(
      `[Benchmark] Baseline createFromFiles (${fileCount} files): ${elapsed.toFixed(2)}ms`,
    );
  });

  it('provides twelve stable recipes and three offline examples', () => {
    expect(CREATOR_RECIPES).toHaveLength(12);
    expect(CREATOR_RECIPES.filter((recipe) => recipe.category === 'social')).toHaveLength(6);
    expect(CREATOR_RECIPES.filter((recipe) => recipe.category === 'story')).toHaveLength(3);
    expect(CREATOR_RECIPES.filter((recipe) => recipe.category === 'music')).toHaveLength(3);
    expect(CREATOR_RECIPES.filter((recipe) => recipe.exampleId)).toHaveLength(3);
    expect(new Set(CREATOR_RECIPES.map((recipe) => recipe.id)).size).toBe(12);
    for (const recipe of CREATOR_RECIPES) {
      expect(recipe.sceneCount).toBeGreaterThanOrEqual(3);
      expect(recipe.sceneCount).toBeLessThanOrEqual(6);
      expect(recipe.sceneIdeas).toHaveLength(recipe.sceneCount);
    }
  });
  it('builds editable project-owned local video artifacts without provider execution', () => {
    const draft = buildRecipeDraft(CREATOR_RECIPES[0], 'Show a coffee ritual', 'project-one');
    expect(draft.projectId).toBe('project-one');
    expect(draft.video.idea).toBe('Show a coffee ritual');
    expect(draft.artifact?.provenance.provider).toBe('local');
    expect(draft.artifact?.kind).toBe('video');
  });
  it('keeps music recipes on the existing local music compiler', () => {
    const draft = buildRecipeDraft(CREATOR_RECIPES[9], 'A quiet dawn', 'music-project');
    expect(draft.mode).toBe('music');
    expect(draft.music.topic).toBe('A quiet dawn');
    expect(draft.artifact?.kind).toBe('music');
    expect(draft.artifact?.provenance.provider).toBe('local');
  });
});
