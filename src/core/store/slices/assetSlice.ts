import { StateCreator } from 'zustand';
import {
  Asset,
  CharacterProfile,
  HistoryEntry,
  CustomPreset,
  ProductionBible,
  VisualDNA,
} from '@core/types';
import { continuityService } from '@core/services/continuityService';

export interface AssetSlice {
  assets: Asset[];
  characterBank: CharacterProfile[];
  history: HistoryEntry[];
  customPresets: CustomPreset[];
  visualDNA: VisualDNA[];
  productionBible: ProductionBible;

  // Asset Actions
  addAsset: (asset: Asset) => void;
  updateAsset: (id: string, updates: Partial<Asset>) => void;
  removeAsset: (id: string) => void;

  // Character Actions
  addCharacter: (character: CharacterProfile) => void;
  updateCharacter: (id: string, updates: Partial<CharacterProfile>) => void;
  deleteCharacter: (id: string) => void;
  setCharacterBank: (characters: CharacterProfile[]) => void;

  // Data Actions
  addToHistory: (entry: HistoryEntry) => void;
  clearHistory: () => void;
  deleteHistoryEntry: (id: string) => void;

  addPreset: (preset: CustomPreset) => void;
  updatePreset: (preset: CustomPreset) => void;
  deletePreset: (id: string) => void;

  addVisualDNA: (dna: VisualDNA) => void;
  deleteVisualDNA: (id: string) => void;
  setVisualDNA: (dnas: VisualDNA[]) => void;
  setProductionBible: (productionBible: ProductionBible) => void;
}

export const createAssetSlice: StateCreator<AssetSlice> = (set) => ({
  assets: [],
  characterBank: [],
  history: [],
  customPresets: [],
  visualDNA: [],
  productionBible: {
    schemaVersion: 1,
    profiles: [],
    lockedDefaults: {},
    updatedAt: 0,
  },

  addAsset: (asset) => set((state) => ({ assets: [asset, ...state.assets] })),
  updateAsset: (id, updates) =>
    set((state) => ({ assets: state.assets.map((a) => (a.id === id ? { ...a, ...updates } : a)) })),
  removeAsset: (id) => set((state) => ({ assets: state.assets.filter((a) => a.id !== id) })),

  addCharacter: (character) =>
    set((state) => ({
      characterBank: [character, ...state.characterBank],
      productionBible: continuityService.upsertProfile(
        state.productionBible,
        continuityService.createProfileFromCharacter(character),
      ),
    })),
  updateCharacter: (id, updates) =>
    set((state) => {
      const characterBank = state.characterBank.map((c) =>
        c.id === id ? { ...c, ...updates } : c,
      );
      const character = characterBank.find((item) => item.id === id);
      return {
        characterBank,
        ...(character
          ? {
              productionBible: continuityService.upsertProfile(
                state.productionBible,
                continuityService.createProfileFromCharacter(character),
              ),
            }
          : {}),
      };
    }),
  deleteCharacter: (id) =>
    set((state) => ({
      characterBank: state.characterBank.filter((c) => c.id !== id),
      productionBible: {
        ...state.productionBible,
        profiles: state.productionBible.profiles.filter(
          (profile) => profile.id !== `continuity-character-${id}`,
        ),
        updatedAt: Date.now(),
      },
    })),
  setCharacterBank: (characters) =>
    set((state) => ({
      characterBank: characters,
      productionBible: characters.reduce(
        (bible, character) =>
          continuityService.upsertProfile(
            bible,
            continuityService.createProfileFromCharacter(character),
          ),
        state.productionBible,
      ),
    })),

  addToHistory: (entry) => set((state) => ({ history: [entry, ...state.history].slice(0, 50) })),
  clearHistory: () => set({ history: [] }),
  deleteHistoryEntry: (id) =>
    set((state) => ({ history: state.history.filter((h) => h.id !== id) })),

  addPreset: (preset) => set((state) => ({ customPresets: [preset, ...state.customPresets] })),
  updatePreset: (preset) =>
    set((state) => ({
      customPresets: state.customPresets.map((p) => (p.id === preset.id ? preset : p)),
    })),
  deletePreset: (id) =>
    set((state) => ({ customPresets: state.customPresets.filter((p) => p.id !== id) })),

  addVisualDNA: (dna) =>
    set((state) => ({
      visualDNA: [dna, ...state.visualDNA],
      productionBible: continuityService.upsertProfile(
        state.productionBible,
        continuityService.createProfileFromVisualDNA(dna),
      ),
    })),
  deleteVisualDNA: (id) =>
    set((state) => ({
      visualDNA: state.visualDNA.filter((d) => d.id !== id),
      productionBible: {
        ...state.productionBible,
        profiles: state.productionBible.profiles.filter(
          (profile) => profile.id !== `continuity-look-${id}`,
        ),
        updatedAt: Date.now(),
      },
    })),
  setVisualDNA: (dnas) =>
    set((state) => ({
      visualDNA: dnas,
      productionBible: dnas.reduce(
        (bible, dna) =>
          continuityService.upsertProfile(bible, continuityService.createProfileFromVisualDNA(dna)),
        state.productionBible,
      ),
    })),
  setProductionBible: (productionBible) => set({ productionBible }),
});
