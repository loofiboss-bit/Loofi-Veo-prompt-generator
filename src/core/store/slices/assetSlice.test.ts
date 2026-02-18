/**
 * Tests for assetSlice via useAppStore.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAppStore } from '@core/store/useAppStore';
import type { Asset, CharacterProfile, HistoryEntry, CustomPreset, VisualDNA } from '@core/types';

vi.mock('idb-keyval', () => ({
  get: vi.fn().mockResolvedValue(undefined),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
  keys: vi.fn().mockResolvedValue([]),
  createStore: vi.fn(),
}));

vi.mock('@core/services/loggerService', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const makeAsset = (id: string): Asset => ({
  id,
  name: `Asset ${id}`,
  type: 'image',
  url: `https://example.com/${id}`,
  data: '',
  mimeType: 'image/png',
});

const makeCharacter = (id: string): CharacterProfile => ({
  id,
  name: `Character ${id}`,
  attributes: {
    age: '30',
    gender: 'neutral',
    ethnicity: 'mixed',
    bodyType: 'average',
    skinTone: 'medium',
  },
  appearance: { hair: 'brown', eyes: 'blue', distinguishingFeatures: 'none' },
  wardrobe: 'casual',
  visualPrompt: 'a person',
  fixedSeed: null,
  negativePrompt: '',
});

const makeHistoryEntry = (id: string): HistoryEntry => ({
  id,
  prompt: 'A cinematic shot',
  params: {} as import('@core/types').PromptState,
  timestamp: Date.now(),
});

const makePreset = (id: string): CustomPreset => ({
  id,
  name: `Preset ${id}`,
  params: {} as import('@core/types').PromptState,
});

const makeVisualDNA = (id: string): VisualDNA => ({
  id,
  name: `DNA ${id}`,
  timestamp: Date.now(),
  styleParams: {},
});

beforeEach(() => {
  useAppStore.setState({
    assets: [],
    characterBank: [],
    history: [],
    customPresets: [],
    visualDNA: [],
  });
});

describe('assetSlice — assets', () => {
  it('addAsset prepends asset to list', () => {
    useAppStore.getState().addAsset(makeAsset('a1'));
    expect(useAppStore.getState().assets).toHaveLength(1);
    expect(useAppStore.getState().assets[0].id).toBe('a1');
  });

  it('updateAsset merges partial updates', () => {
    useAppStore.getState().addAsset(makeAsset('a1'));
    useAppStore.getState().updateAsset('a1', { name: 'Updated' });
    expect(useAppStore.getState().assets[0].name).toBe('Updated');
  });

  it('updateAsset does nothing for unknown id', () => {
    useAppStore.getState().addAsset(makeAsset('a1'));
    useAppStore.getState().updateAsset('unknown', { name: 'X' });
    expect(useAppStore.getState().assets[0].name).toBe('Asset a1');
  });

  it('removeAsset removes by id', () => {
    useAppStore.getState().addAsset(makeAsset('a1'));
    useAppStore.getState().addAsset(makeAsset('a2'));
    useAppStore.getState().removeAsset('a1');
    expect(useAppStore.getState().assets).toHaveLength(1);
    expect(useAppStore.getState().assets[0].id).toBe('a2');
  });
});

describe('assetSlice — characters', () => {
  it('addCharacter prepends to characterBank', () => {
    useAppStore.getState().addCharacter(makeCharacter('c1'));
    expect(useAppStore.getState().characterBank).toHaveLength(1);
  });

  it('updateCharacter merges updates', () => {
    useAppStore.getState().addCharacter(makeCharacter('c1'));
    useAppStore.getState().updateCharacter('c1', { name: 'Neo' });
    expect(useAppStore.getState().characterBank[0].name).toBe('Neo');
  });

  it('deleteCharacter removes by id', () => {
    useAppStore.getState().addCharacter(makeCharacter('c1'));
    useAppStore.getState().deleteCharacter('c1');
    expect(useAppStore.getState().characterBank).toHaveLength(0);
  });

  it('setCharacterBank replaces entire list', () => {
    useAppStore.getState().addCharacter(makeCharacter('c1'));
    useAppStore.getState().setCharacterBank([makeCharacter('c2'), makeCharacter('c3')]);
    expect(useAppStore.getState().characterBank).toHaveLength(2);
    expect(useAppStore.getState().characterBank[0].id).toBe('c2');
  });
});

describe('assetSlice — history', () => {
  it('addToHistory prepends and limits to 50 entries', () => {
    for (let i = 0; i < 55; i++) {
      useAppStore.getState().addToHistory(makeHistoryEntry(`h${i}`));
    }
    expect(useAppStore.getState().history).toHaveLength(50);
  });

  it('clearHistory empties history', () => {
    useAppStore.getState().addToHistory(makeHistoryEntry('h1'));
    useAppStore.getState().clearHistory();
    expect(useAppStore.getState().history).toHaveLength(0);
  });

  it('deleteHistoryEntry removes specific entry', () => {
    useAppStore.getState().addToHistory(makeHistoryEntry('h1'));
    useAppStore.getState().addToHistory(makeHistoryEntry('h2'));
    useAppStore.getState().deleteHistoryEntry('h1');
    expect(useAppStore.getState().history.find((h) => h.id === 'h1')).toBeUndefined();
    expect(useAppStore.getState().history).toHaveLength(1);
  });
});

describe('assetSlice — presets', () => {
  it('addPreset prepends preset', () => {
    useAppStore.getState().addPreset(makePreset('p1'));
    expect(useAppStore.getState().customPresets).toHaveLength(1);
  });

  it('updatePreset replaces preset by id', () => {
    const p = makePreset('p1');
    useAppStore.getState().addPreset(p);
    useAppStore.getState().updatePreset({ ...p, name: 'New Name' });
    expect(useAppStore.getState().customPresets[0].name).toBe('New Name');
  });

  it('deletePreset removes by id', () => {
    useAppStore.getState().addPreset(makePreset('p1'));
    useAppStore.getState().deletePreset('p1');
    expect(useAppStore.getState().customPresets).toHaveLength(0);
  });
});

describe('assetSlice — visualDNA', () => {
  it('addVisualDNA prepends entry', () => {
    useAppStore.getState().addVisualDNA(makeVisualDNA('d1'));
    expect(useAppStore.getState().visualDNA).toHaveLength(1);
  });

  it('deleteVisualDNA removes by id', () => {
    useAppStore.getState().addVisualDNA(makeVisualDNA('d1'));
    useAppStore.getState().deleteVisualDNA('d1');
    expect(useAppStore.getState().visualDNA).toHaveLength(0);
  });

  it('setVisualDNA replaces entire list', () => {
    useAppStore.getState().addVisualDNA(makeVisualDNA('d1'));
    useAppStore.getState().setVisualDNA([makeVisualDNA('d2'), makeVisualDNA('d3')]);
    expect(useAppStore.getState().visualDNA).toHaveLength(2);
    expect(useAppStore.getState().visualDNA[0].id).toBe('d2');
  });
});
