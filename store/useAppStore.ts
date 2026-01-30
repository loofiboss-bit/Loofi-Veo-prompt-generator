

import { create, StoreApi, UseBoundStore } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { temporal, TemporalState } from 'zundo';
import { idbStorage } from '../utils/storage';
import { INITIAL_STATE } from '../constants';

// Slices
import { UiSlice, createUiSlice } from './slices/uiSlice';
import { TimelineSlice, createTimelineSlice } from './slices/timelineSlice';
import { PromptSlice, createPromptSlice } from './slices/promptSlice';
import { AssetSlice, createAssetSlice } from './slices/assetSlice';

// Combined State Interface
export type AppState = UiSlice & TimelineSlice & PromptSlice & AssetSlice & {
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
  resetAll: () => void;
  setFullState: (newState: any) => void;
};

export const useAppStore = create<AppState>()(
  temporal(
    persist(
      (set, get, api) => ({
        ...createUiSlice(set as any, get as any, api as any),
        ...createTimelineSlice(set as any, get as any, api as any),
        ...createPromptSlice(set as any, get as any, api as any),
        ...createAssetSlice(set as any, get as any, api as any),

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
          tracks: [
            { id: 'text_main', label: 'Captions/Overlay', type: 'text', trackType: 'captions', zIndex: 10 },
            { id: 'video_main', label: 'Video', type: 'video', trackType: 'dialogue', zIndex: 1 },
            { id: 'audio_dialogue', label: 'Dialogue', type: 'audio', trackType: 'dialogue', zIndex: 0 },
            { id: 'audio_sfx', label: 'SFX', type: 'audio', trackType: 'sfx', zIndex: 0 },
            { id: 'audio_music', label: 'Music', type: 'audio', trackType: 'music', zIndex: 0 },
          ],
          clips: [],
          zoomLevel: 20, 
          currentTime: 0,
          seriesBible: '',
          credits: 100,
          variables: { "HERO": "Detective John", "THEME": "Cyberpunk Noir", "LOCATION": "Neon City" }
        })
      }),
      {
        name: 'veo-prompt-state-v6', // Bump version for timeline split
        storage: createJSONStorage(() => idbStorage),
        onRehydrateStorage: () => (state) => {
          (state as AppState)?.setHasHydrated(true);
        },
        partialize: (state) => {
          const s = state as AppState;
          return {
            // Prompt Slice
            promptState: s.promptState,
            sbGlobalContext: s.sbGlobalContext,
            variables: s.variables,
            seriesBible: s.seriesBible,
            credits: s.credits,
            
            // Timeline Slice (Split)
            sbShots: s.sbShots,
            tracks: s.tracks,
            clips: s.clips,
            // Note: zoomLevel and currentTime are transient UI state, often not persisted or history-tracked
            
            // Asset Slice
            assets: s.assets,
            characterBank: s.characterBank,
            history: s.history,
            customPresets: s.customPresets,
            visualDNA: s.visualDNA,
            
            // UI Slice
            theme: s.theme
          };
        },
      }
    ),
    {
      limit: 50,
      // Only track structural changes to the timeline and shots
      partialize: (state) => ({
        sbShots: state.sbShots,
        tracks: state.tracks,
        clips: state.clips,
        // Explicitly exclude zoomLevel and currentTime from history snapshots
      }),
      // Only add to history if these specific fields change
      equality: (a, b) => 
        JSON.stringify(a) === JSON.stringify(b)
    }
  )
) as unknown as UseBoundStore<StoreApi<AppState>> & { temporal: StoreApi<TemporalState<AppState>> };