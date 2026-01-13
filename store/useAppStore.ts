

import { create } from 'zustand';
import { PromptState, Shot, GlobalContext, Asset } from '../types';
import { INITIAL_STATE } from '../constants';

interface AppState {
  // Main Prompt State
  promptState: PromptState;
  
  // StoryBoard State
  sbGlobalContext: GlobalContext;
  sbShots: Shot[];

  // Global Asset Library
  assets: Asset[];

  // Series Bible / Lore
  seriesBible: string;

  // Actions
  setPromptState: (update: Partial<PromptState> | ((prev: PromptState) => Partial<PromptState>), action?: 'replace') => void;
  
  // StoryBoard Actions
  setSbGlobalContext: (context: GlobalContext | ((prev: GlobalContext) => GlobalContext)) => void;
  setSbShots: (shots: Shot[] | ((prev: Shot[]) => Shot[])) => void;
  addShot: () => void;
  updateShot: (id: number, field: keyof Shot, value: any) => void;
  deleteShot: (id: number) => void;
  
  // Asset Actions
  addAsset: (asset: Asset) => void;
  removeAsset: (id: string) => void;

  // Series Bible Actions
  setSeriesBible: (text: string) => void;

  resetAll: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  promptState: INITIAL_STATE,
  sbGlobalContext: { style: '', character: '', setting: '' },
  sbShots: [{ id: 1, action: '', camera: '', characterId: '' }],
  assets: [],
  seriesBible: '',

  setPromptState: (update, action) => set((state) => {
    if (action === 'replace') {
      return { promptState: update as PromptState };
    }
    const newValues = typeof update === 'function' ? update(state.promptState) : update;
    return { promptState: { ...state.promptState, ...newValues } };
  }),

  setSbGlobalContext: (context) => set((state) => {
    const newContext = typeof context === 'function' ? context(state.sbGlobalContext) : context;
    return { sbGlobalContext: newContext };
  }),

  setSbShots: (shots) => set((state) => {
    const newShots = typeof shots === 'function' ? shots(state.sbShots) : shots;
    return { sbShots: newShots };
  }),

  addShot: () => set((state) => {
    const newId = state.sbShots.length > 0 ? Math.max(...state.sbShots.map(s => s.id)) + 1 : 1;
    const newShot: Shot = { 
        id: newId, 
        action: '', 
        camera: '', 
        characterId: '', 
        generatedVideoUrl: '', 
        takes: [],
        selectedTakeIndex: 0,
        visualLink: false, 
        audioUrl: undefined 
    };
    return { sbShots: [...state.sbShots, newShot] };
  }),

  updateShot: (id, field, value) => set((state) => ({
    sbShots: state.sbShots.map(s => s.id === id ? { ...s, [field]: value } : s)
  })),

  deleteShot: (id) => set((state) => {
    if (state.sbShots.length <= 1) return state; // Don't delete last shot
    return { sbShots: state.sbShots.filter(s => s.id !== id) };
  }),

  addAsset: (asset) => set((state) => ({
    assets: [asset, ...state.assets]
  })),

  removeAsset: (id) => set((state) => ({
    assets: state.assets.filter(a => a.id !== id)
  })),

  setSeriesBible: (text) => set({ seriesBible: text }),

  resetAll: () => set({
    promptState: INITIAL_STATE,
    sbGlobalContext: { style: '', character: '', setting: '' },
    sbShots: [{ id: 1, action: '', camera: '', characterId: '' }],
    seriesBible: ''
  })
}));