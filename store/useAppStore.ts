
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { PromptState, Shot, GlobalContext, Asset } from '../types';
import { INITIAL_STATE } from '../constants';
import { idbStorage } from '../utils/storage';

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

  // Hydration Flag
  _hasHydrated: boolean;

  // Actions
  setPromptState: (update: Partial<PromptState> | ((prev: PromptState) => Partial<PromptState>), action?: 'replace') => void;
  
  // StoryBoard Actions
  setSbGlobalContext: (context: GlobalContext | ((prev: GlobalContext) => GlobalContext)) => void;
  setSbShots: (shots: Shot[] | ((prev: Shot[]) => Shot[])) => void;
  addShot: (type?: 'video' | 'title') => void;
  updateShot: (id: number, field: keyof Shot, value: any) => void;
  deleteShot: (id: number) => void;
  
  // Asset Actions
  addAsset: (asset: Asset) => void;
  removeAsset: (id: string) => void;

  // Series Bible Actions
  setSeriesBible: (text: string) => void;

  // Bulk Sync
  setFullState: (newState: { promptState?: PromptState, sbGlobalContext?: GlobalContext, sbShots?: Shot[], seriesBible?: string }) => void;

  resetAll: () => void;
  setHasHydrated: (state: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      promptState: INITIAL_STATE,
      sbGlobalContext: { style: '', character: '', setting: '' },
      sbShots: [{ id: 1, type: 'video', action: '', camera: '', characterId: '' }],
      assets: [],
      seriesBible: '',
      _hasHydrated: false,

      setHasHydrated: (state) => set({ _hasHydrated: state }),

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

      addShot: (type: 'video' | 'title' = 'video') => set((state) => {
        const newId = state.sbShots.length > 0 ? Math.max(...state.sbShots.map(s => s.id)) + 1 : 1;
        const newShot: Shot = { 
            id: newId,
            type: type,
            action: '', 
            camera: '', 
            characterId: '', 
            generatedVideoUrl: '', 
            takes: [],
            selectedTakeIndex: 0,
            visualLink: false, 
            audioUrl: undefined,
            duration: 5,
            titleConfig: type === 'title' ? {
                text: 'New Title',
                background: '#000000',
                color: '#ffffff',
                fontSize: 80
            } : undefined
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

      setFullState: (newState) => set((state) => ({
          ...state,
          ...newState
      })),

      resetAll: () => set({
        promptState: INITIAL_STATE,
        sbGlobalContext: { style: '', character: '', setting: '' },
        sbShots: [{ id: 1, type: 'video', action: '', camera: '', characterId: '' }],
        seriesBible: ''
      })
    }),
    {
      name: 'veo-prompt-state-v3', // unique name for the item in storage
      storage: createJSONStorage(() => idbStorage), // Use our custom IDB adapter
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      // We whitelist fields to persist to avoid saving transient UI state if it were added
      partialize: (state) => ({
        promptState: state.promptState,
        sbGlobalContext: state.sbGlobalContext,
        sbShots: state.sbShots,
        assets: state.assets,
        seriesBible: state.seriesBible
      }),
    }
  )
);
