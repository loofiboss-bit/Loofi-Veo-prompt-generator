
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { PromptState, Shot, GlobalContext, Asset, CharacterProfile, TimelineState, TimelineTrack, TimelineClip, ClipTransition } from '../types';
import { INITIAL_STATE } from '../constants';
import { idbStorage } from '../utils/storage';

interface AppState {
  // Main Prompt State
  promptState: PromptState;
  
  // StoryBoard State
  sbGlobalContext: GlobalContext;
  sbShots: Shot[];
  sbTimeline: TimelineState;

  // Global Asset Library
  assets: Asset[];
  
  // Character Bank
  characterBank: CharacterProfile[];

  // Global Variables
  variables: Record<string, string>;

  // Series Bible / Lore
  seriesBible: string;

  // Economy
  credits: number;

  // Hydration Flag
  _hasHydrated: boolean;

  // Actions
  setPromptState: (update: Partial<PromptState> | ((prev: PromptState) => Partial<PromptState>), action?: 'replace') => void;
  applyTemplate: (settings: Partial<PromptState>) => void;
  
  // StoryBoard Actions
  setSbGlobalContext: (context: GlobalContext | ((prev: GlobalContext) => GlobalContext)) => void;
  setSbShots: (shots: Shot[] | ((prev: Shot[]) => Shot[])) => void;
  addShot: (type?: 'video' | 'title') => void;
  updateShot: (id: number, field: keyof Shot, value: any) => void;
  deleteShot: (id: number) => void;
  
  // Timeline Actions
  syncTimelineFromShots: () => void;
  updateTimelineClip: (clipId: string, updates: Partial<TimelineClip>) => void;
  addTimelineClip: (clip: TimelineClip) => void;
  updateShotTransition: (shotId: number, transition: ClipTransition) => void;
  
  // Asset Actions
  addAsset: (asset: Asset) => void;
  removeAsset: (id: string) => void;

  // Character Actions
  addCharacter: (character: CharacterProfile) => void;
  updateCharacter: (id: string, updates: Partial<CharacterProfile>) => void;
  deleteCharacter: (id: string) => void;
  setCharacterBank: (characters: CharacterProfile[]) => void;

  // Variable Actions
  setVariable: (key: string, value: string) => void;
  deleteVariable: (key: string) => void;

  // Series Bible Actions
  setSeriesBible: (text: string) => void;

  // Economy Actions
  deductCredits: (amount: number) => boolean;

  // Bulk Sync
  setFullState: (newState: { promptState?: PromptState, sbGlobalContext?: GlobalContext, sbShots?: Shot[], seriesBible?: string, characterBank?: CharacterProfile[], sbTimeline?: TimelineState, variables?: Record<string, string> }) => void;

  resetAll: () => void;
  setHasHydrated: (state: boolean) => void;
}

const DEFAULT_TRACKS: TimelineTrack[] = [
    { id: 'video_main', label: 'Video', type: 'video' },
    { id: 'audio_dialogue', label: 'Dialogue', type: 'audio' },
    { id: 'audio_sfx', label: 'SFX', type: 'audio' },
    { id: 'audio_music', label: 'Music', type: 'audio' }
];

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      promptState: INITIAL_STATE,
      sbGlobalContext: { style: '', character: '', setting: '' },
      sbShots: [{ id: 1, type: 'video', action: '', camera: '', characterId: '' }],
      sbTimeline: {
          tracks: DEFAULT_TRACKS,
          clips: [],
          zoomLevel: 20, // 20px per second
          currentTime: 0
      },
      assets: [],
      characterBank: [],
      variables: {
          "HERO": "Detective John",
          "THEME": "Cyberpunk Noir",
          "LOCATION": "Neon City"
      },
      seriesBible: '',
      credits: 100, // Default start credits
      _hasHydrated: false,

      setHasHydrated: (state) => set({ _hasHydrated: state }),

      setPromptState: (update, action) => set((state) => {
        if (action === 'replace') {
          return { promptState: update as PromptState };
        }
        const newValues = typeof update === 'function' ? update(state.promptState) : update;
        return { promptState: { ...state.promptState, ...newValues } };
      }),

      applyTemplate: (settings) => set((state) => ({
          promptState: { ...state.promptState, ...settings },
          // Reset storyboard when applying a fresh template to ensure clean slate
          sbShots: [{ id: 1, type: 'video', action: '', camera: '', characterId: '' }],
          sbGlobalContext: { style: settings.artStyle || '', character: '', setting: settings.environment || '' }
      })),

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
            transition: { type: 'cut', duration: 0 },
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

      // --- Timeline Actions ---
      
      syncTimelineFromShots: () => set((state) => {
          const clips: TimelineClip[] = [];
          let currentTime = 0;

          state.sbShots.forEach((shot, index) => {
              if (!shot.generatedVideoUrl && shot.type !== 'title') return; // Skip incomplete shots
              
              const duration = shot.duration || 5;
              
              // Handle Transition Offset
              // 1. Video Clip
              clips.push({
                  id: `video_${shot.id}`,
                  resourceId: shot.id,
                  trackId: 'video_main',
                  startTime: currentTime,
                  duration: duration,
                  offset: 0,
                  type: 'video',
                  label: shot.type === 'title' ? `Title: ${shot.titleConfig?.text}` : `Shot ${shot.id}`,
                  transition: shot.transition
              });

              // 2. Audio Clip (if any)
              if (shot.audioUrl) {
                  clips.push({
                      id: `audio_${shot.id}`,
                      resourceId: shot.id,
                      trackId: 'audio_dialogue',
                      startTime: currentTime,
                      duration: shot.audioDuration || duration, // Use audio duration or fallback
                      offset: 0,
                      type: 'audio',
                      label: `Dialog ${shot.id}`
                  });
              }

              // 3. SFX Clips (if any)
              if (shot.sfx) {
                  shot.sfx.forEach((sfx, idx) => {
                      clips.push({
                          id: `sfx_${shot.id}_${idx}`,
                          resourceId: shot.id,
                          trackId: 'audio_sfx',
                          startTime: currentTime + sfx.timestamp,
                          duration: 2, 
                          offset: 0,
                          type: 'audio',
                          label: sfx.description
                      });
                  });
              }

              currentTime += duration;
          });

          return {
              sbTimeline: {
                  ...state.sbTimeline,
                  clips: clips
              }
          };
      }),

      updateTimelineClip: (clipId, updates) => set((state) => ({
          sbTimeline: {
              ...state.sbTimeline,
              clips: state.sbTimeline.clips.map(c => c.id === clipId ? { ...c, ...updates } : c)
          }
      })),

      addTimelineClip: (clip) => set((state) => ({
          sbTimeline: {
              ...state.sbTimeline,
              clips: [...state.sbTimeline.clips, clip]
          }
      })),

      updateShotTransition: (shotId, transition) => set((state) => {
          const updatedShots = state.sbShots.map(s => 
              s.id === shotId ? { ...s, transition } : s
          );
          return { sbShots: updatedShots };
      }),

      addAsset: (asset) => set((state) => ({
        assets: [asset, ...state.assets]
      })),

      removeAsset: (id) => set((state) => ({
        assets: state.assets.filter(a => a.id !== id)
      })),

      addCharacter: (character) => set((state) => ({
        characterBank: [character, ...state.characterBank]
      })),

      updateCharacter: (id, updates) => set((state) => ({
        characterBank: state.characterBank.map(c => c.id === id ? { ...c, ...updates } : c)
      })),

      deleteCharacter: (id) => set((state) => ({
        characterBank: state.characterBank.filter(c => c.id !== id)
      })),

      setCharacterBank: (characters) => set({ characterBank: characters }),

      setVariable: (key, value) => set((state) => ({
          variables: { ...state.variables, [key]: value }
      })),

      deleteVariable: (key) => set((state) => {
          const newVars = { ...state.variables };
          delete newVars[key];
          return { variables: newVars };
      }),

      setSeriesBible: (text) => set({ seriesBible: text }),

      deductCredits: (amount) => {
          const state = get();
          if (state.credits >= amount) {
              set({ credits: state.credits - amount });
              return true;
          }
          return false;
      },

      setFullState: (newState) => set((state) => ({
          ...state,
          ...newState
      })),

      resetAll: () => set({
        promptState: INITIAL_STATE,
        sbGlobalContext: { style: '', character: '', setting: '' },
        sbShots: [{ id: 1, type: 'video', action: '', camera: '', characterId: '' }],
        sbTimeline: {
            tracks: DEFAULT_TRACKS,
            clips: [],
            zoomLevel: 20,
            currentTime: 0
        },
        seriesBible: '',
        credits: 100,
        variables: { "HERO": "Detective John", "THEME": "Cyberpunk Noir" }
      })
    }),
    {
      name: 'veo-prompt-state-v3', // unique name for the item in storage
      storage: createJSONStorage(() => idbStorage), // Use our custom IDB adapter
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      partialize: (state) => ({
        promptState: state.promptState,
        sbGlobalContext: state.sbGlobalContext,
        sbShots: state.sbShots,
        sbTimeline: state.sbTimeline,
        assets: state.assets,
        seriesBible: state.seriesBible,
        characterBank: state.characterBank,
        variables: state.variables,
        credits: state.credits
      }),
    }
  )
);
