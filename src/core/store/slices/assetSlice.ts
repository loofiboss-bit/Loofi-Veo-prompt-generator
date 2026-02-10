
import { StateCreator } from 'zustand';
import { Asset, CharacterProfile, HistoryEntry, CustomPreset, VisualDNA } from '@core/types';

export interface AssetSlice {
  assets: Asset[];
  characterBank: CharacterProfile[];
  history: HistoryEntry[];
  customPresets: CustomPreset[];
  visualDNA: VisualDNA[];

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
}

export const createAssetSlice: StateCreator<AssetSlice> = (set) => ({
  assets: [],
  characterBank: [],
  history: [],
  customPresets: [],
  visualDNA: [],

  addAsset: (asset) => set((state) => ({ assets: [asset, ...state.assets] })),
  updateAsset: (id, updates) => set((state) => ({ assets: state.assets.map(a => a.id === id ? { ...a, ...updates } : a) })),
  removeAsset: (id) => set((state) => ({ assets: state.assets.filter(a => a.id !== id) })),

  addCharacter: (character) => set((state) => ({ characterBank: [character, ...state.characterBank] })),
  updateCharacter: (id, updates) => set((state) => ({ characterBank: state.characterBank.map(c => c.id === id ? { ...c, ...updates } : c) })),
  deleteCharacter: (id) => set((state) => ({ characterBank: state.characterBank.filter(c => c.id !== id) })),
  setCharacterBank: (characters) => set({ characterBank: characters }),

  addToHistory: (entry) => set((state) => ({ history: [entry, ...state.history].slice(0, 50) })),
  clearHistory: () => set({ history: [] }),
  deleteHistoryEntry: (id) => set((state) => ({ history: state.history.filter(h => h.id !== id) })),

  addPreset: (preset) => set((state) => ({ customPresets: [preset, ...state.customPresets] })),
  updatePreset: (preset) => set((state) => ({ customPresets: state.customPresets.map(p => p.id === preset.id ? preset : p) })),
  deletePreset: (id) => set((state) => ({ customPresets: state.customPresets.filter(p => p.id !== id) })),

  addVisualDNA: (dna) => set((state) => ({ visualDNA: [dna, ...state.visualDNA] })),
  deleteVisualDNA: (id) => set((state) => ({ visualDNA: state.visualDNA.filter(d => d.id !== id) })),
  setVisualDNA: (dnas) => set({ visualDNA: dnas }),
});
