


import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage } from '../utils/storage';
import { INITIAL_STATE } from '../constants';

// Slices
import { UiSlice, createUiSlice } from './slices/uiSlice';
import { TimelineSlice, createTimelineSlice } from './slices/timelineSlice';
import { PromptSlice, createPromptSlice } from './slices/promptSlice';
import { AssetSlice, createAssetSlice } from './slices/assetSlice';

// Combined State Interface
type AppState = UiSlice & TimelineSlice & PromptSlice & AssetSlice & {
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
  resetAll: () => void;
  setFullState: (newState: any) => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get, api) => ({
      ...createUiSlice(set, get, api),
      ...createTimelineSlice(set, get, api),
      ...createPromptSlice(set, get, api),
      ...createAssetSlice(set, get, api),

      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),

      // Bulk Sync for Collaboration
      setFullState: (newState) => set((state) => ({ ...state, ...newState })),

      resetAll: () => set({
        promptState: INITIAL_STATE,
        sbGlobalContext: { style: '', character: '', setting: '' },
        sbShots: [{ 
            id: 1, 
            type: 'video', 
            action: '', 
            camera: '', 
            characterId: '', 
            takes: [], 
            selectedTakeIndex: 0, 
            visualLink: false, 
            duration: 5, 
            transition: { type: 'cut', duration: 0 } 
        }],
        sbTimeline: { 
            // Reset to default tracks from slice logic if possible, or hardcode defaults here
            tracks: [
                { id: 'text_main', label: 'Captions/Overlay', type: 'text', trackType: 'captions', zIndex: 10 },
                { id: 'video_main', label: 'Video', type: 'video', trackType: 'dialogue', zIndex: 1 },
                { id: 'audio_dialogue', label: 'Dialogue', type: 'audio', trackType: 'dialogue', zIndex: 0 },
                { id: 'audio_sfx', label: 'SFX', type: 'audio', trackType: 'sfx', zIndex: 0 },
                { id: 'audio_music', label: 'Music', type: 'audio', trackType: 'music', zIndex: 0 },
            ], 
            clips: [], 
            zoomLevel: 20, 
            currentTime: 0 
        },
        seriesBible: '',
        credits: 100,
        variables: { "HERO": "Detective John", "THEME": "Cyberpunk Noir", "LOCATION": "Neon City" }
      })
    }),
    {
      name: 'veo-prompt-state-v5', // Bump version for slice refactor
      storage: createJSONStorage(() => idbStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      partialize: (state) => ({
        // Prompt Slice
        promptState: state.promptState,
        sbGlobalContext: state.sbGlobalContext,
        variables: state.variables,
        seriesBible: state.seriesBible,
        credits: state.credits,
        
        // Timeline Slice
        sbShots: state.sbShots,
        sbTimeline: state.sbTimeline,
        
        // Asset Slice
        assets: state.assets,
        characterBank: state.characterBank,
        history: state.history,
        customPresets: state.customPresets,
        visualDNA: state.visualDNA,
        
        // UI Slice
        theme: state.theme
      }),
    }
  )
);
