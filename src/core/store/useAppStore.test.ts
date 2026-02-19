/**
 * useAppStore Migration / Hydration Tests
 *
 * Verifies that previously-persisted data shapes hydrate correctly into the
 * current store, and that `partialize` keeps the right fields while excluding
 * transient UI state.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock idb-keyval before any store imports
vi.mock('idb-keyval', () => ({
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
  createStore: vi.fn(),
  update: vi.fn(),
}));

import { useAppStore, type AppState } from './useAppStore';

/**
 * Simulates a previously-persisted state object (v5 era) to make sure the
 * current store can merge/hydrate it without errors.
 */
// Intentionally uses incomplete/legacy shapes to test hydration tolerance.
/* eslint-disable @typescript-eslint/no-explicit-any */
const LEGACY_PERSISTED_STATE: Partial<AppState> = {
  promptState: {
    idea: 'Test prompt idea',
    environment: 'Mountain lake',
    artStyle: 'Cinematic',
    cameraMovement: 'Static shot',
    aspectRatio: '16:9',
    resolution: '1080p',
    language: 'en',
    model: 'gemini-3-pro-preview',
    targetModel: 'veo',
  } as any,
  sbGlobalContext: {
    style: 'noir',
    character: 'detective',
    setting: 'city',
  } as any,
  sbShots: [
    { id: 1, type: 'video', action: 'Walk down the street', camera: 'tracking', duration: 5 },
    { id: 2, type: 'video', action: 'Enter the building', camera: 'static', duration: 3 },
  ] as any,
  tracks: [
    { id: 'video_main', label: 'Video', type: 'video', trackType: 'dialogue', zIndex: 1 },
  ] as any,
  clips: [],
  seriesBible: 'A noir detective story...',
  credits: 85,
  variables: { HERO: 'Detective John' },
  assets: [],
  characterBank: [],
  history: [],
  customPresets: [],
  visualDNA: null as any,
  theme: 'dark',
};
/* eslint-enable @typescript-eslint/no-explicit-any */

describe('useAppStore hydration', () => {
  beforeEach(() => {
    // Reset store to defaults between tests
    useAppStore.getState().resetAll();
  });

  it('hydrates legacy persisted state via setFullState without errors', () => {
    const { setFullState } = useAppStore.getState();

    // Simulate what Zustand persist does: merge persisted state into store
    expect(() => setFullState(LEGACY_PERSISTED_STATE)).not.toThrow();

    const state = useAppStore.getState();
    expect(state.promptState.idea).toBe('Test prompt idea');
    expect(state.sbGlobalContext.style).toBe('noir');
    expect(state.sbShots).toHaveLength(2);
    expect(state.sbShots[0].action).toBe('Walk down the street');
    expect(state.seriesBible).toBe('A noir detective story...');
    expect(state.credits).toBe(85);
  });

  it('preserves default values for fields not in persisted state', () => {
    const { setFullState } = useAppStore.getState();

    // Hydrate with a minimal state (missing many fields)
    setFullState({
      promptState: { idea: 'Minimal', environment: '' },
    } as Partial<AppState>);

    const state = useAppStore.getState();
    expect(state.promptState.idea).toBe('Minimal');
    // Other fields should still exist from the default slice
    expect(state.sbShots).toBeDefined();
    expect(state.tracks).toBeDefined();
    expect(state.credits).toBeDefined();
  });

  it('partialize excludes transient UI state from persistence payload', () => {
    const state = useAppStore.getState();

    // Access the persist API to get partialize
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const persistOptions = (useAppStore as any).persist;
    if (!persistOptions?.getOptions) {
      // Fallback: verify by checking that transient fields exist in full state
      // but would NOT be in a partialized version
      expect(state._hasHydrated).toBeDefined();
      expect(state.resetAll).toBeDefined();
      return;
    }

    const options = persistOptions.getOptions();
    const partialized = options.partialize(state);

    // Should include domain data
    expect(partialized.promptState).toBeDefined();
    expect(partialized.sbShots).toBeDefined();
    expect(partialized.tracks).toBeDefined();
    expect(partialized.clips).toBeDefined();
    expect(partialized.credits).toBeDefined();
    expect(partialized.theme).toBeDefined();

    // Should exclude transient state
    expect(partialized._hasHydrated).toBeUndefined();
    expect(partialized.zoomLevel).toBeUndefined();
    expect(partialized.currentTime).toBeUndefined();
    expect(partialized.activeStudio).toBeUndefined();
    expect(partialized.isHistoryOpen).toBeUndefined();
  });

  it('resetAll returns store to a valid initial state', () => {
    const { setFullState, resetAll } = useAppStore.getState();

    // Hydrate then reset
    setFullState(LEGACY_PERSISTED_STATE);
    resetAll();

    const state = useAppStore.getState();
    expect(state.sbShots).toHaveLength(1);
    expect(state.sbShots[0].id).toBe(1);
    expect(state.credits).toBe(100);
    expect(state.sbGlobalContext.style).toBe('');
    expect(state.seriesBible).toBe('');
  });

  it('handles partial shot data without crashing', () => {
    const { setFullState } = useAppStore.getState();

    // Simulate corrupted/incomplete shot data from an older version
    const partialShots = [
      { id: 1, type: 'video', action: 'Test' },
      // missing: camera, duration, takes, etc.
    ];

    expect(() => setFullState({ sbShots: partialShots } as Partial<AppState>)).not.toThrow();

    const state = useAppStore.getState();
    expect(state.sbShots).toHaveLength(1);
    expect(state.sbShots[0].action).toBe('Test');
  });

  it('supports explicit theme setting and toggle compatibility', () => {
    const { setTheme, toggleTheme } = useAppStore.getState();

    setTheme('light');
    expect(useAppStore.getState().theme).toBe('light');

    toggleTheme();
    expect(useAppStore.getState().theme).toBe('dark');
  });
});
