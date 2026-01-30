
import { StateCreator } from 'zustand';
import { Shot, TimelineTrack, TimelineClip, ClipTransition } from '../../types';

const DEFAULT_TRACKS: TimelineTrack[] = [
    { id: 'text_main', label: 'Captions/Overlay', type: 'text', trackType: 'captions', zIndex: 10 },
    { id: 'video_main', label: 'Video', type: 'video', trackType: 'dialogue', zIndex: 1 },
    { id: 'audio_dialogue', label: 'Dialogue', type: 'audio', trackType: 'dialogue', zIndex: 0 },
    { id: 'audio_sfx', label: 'SFX', type: 'audio', trackType: 'sfx', zIndex: 0 },
    { id: 'audio_music', label: 'Music', type: 'audio', trackType: 'music', zIndex: 0 },
];

export interface TimelineSlice {
  sbShots: Shot[];
  // Flattened Timeline State for robust partial history
  tracks: TimelineTrack[];
  clips: TimelineClip[];
  zoomLevel: number;
  currentTime: number;

  // StoryBoard Actions
  setSbShots: (shots: Shot[] | ((prev: Shot[]) => Shot[])) => void;
  addShot: (type?: 'video' | 'title') => void;
  updateShot: (id: number, field: keyof Shot, value: any) => void;
  deleteShot: (id: number) => void;
  
  // Timeline Actions
  syncTimelineFromShots: () => void;
  updateTimelineClip: (clipId: string, updates: Partial<TimelineClip>) => void;
  addTimelineClip: (clip: TimelineClip) => void;
  updateShotTransition: (shotId: number, transition: ClipTransition) => void;
  
  // View State Actions
  setZoomLevel: (level: number) => void;
  setCurrentTime: (time: number) => void;
}

export const createTimelineSlice: StateCreator<TimelineSlice> = (set, get) => ({
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
    tracks: DEFAULT_TRACKS,
    clips: [],
    zoomLevel: 20,
    currentTime: 0,

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
        if (state.sbShots.length <= 1) return state;
        return { sbShots: state.sbShots.filter(s => s.id !== id) };
    }),

    syncTimelineFromShots: () => set((state) => {
        const clips: TimelineClip[] = [];
        let currentTime = 0;
        
        state.sbShots.forEach((shot) => {
            if (!shot.generatedVideoUrl && shot.type !== 'title' && shot.action) return;
            const duration = shot.duration || 5;
            
            // Video Track (Layer 1)
            clips.push({
                id: `video_${shot.id}`,
                resourceId: shot.id,
                trackId: 'video_main',
                startTime: currentTime,
                duration: duration,
                offset: 0,
                type: 'video',
                label: shot.type === 'title' ? `Title` : `Shot ${shot.id}`,
                transition: shot.transition,
                opacity: 1.0,
                volume: 1.0,
                panning: { x: 0, z: 0 }
            });

            // Linked Dialogue (Layer 0)
            if(shot.audioUrl) {
                clips.push({
                    id: `audio_${shot.id}`,
                    resourceId: shot.id,
                    trackId: 'audio_dialogue',
                    startTime: currentTime,
                    duration: shot.audioDuration || duration,
                    offset: 0,
                    type: 'audio',
                    label: `Dialog ${shot.id}`,
                    volume: 1.0,
                    panning: { x: 0, z: 0 }
                });
            }

            // Linked SFX (Layer 0)
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
                        label: sfx.description,
                        volume: 1.0,
                        panning: { x: 0, z: 0 }
                    });
                });
            }
            currentTime += duration;
        });
        
        // Preserve manually added text clips/tracks
        const existingTextClips = state.clips.filter(c => c.trackId === 'text_main');
        const otherManualClips = state.clips.filter(c => 
            c.trackId !== 'video_main' && 
            c.trackId !== 'audio_dialogue' && 
            c.trackId !== 'audio_sfx' && 
            c.trackId !== 'text_main'
        );

        return {
            clips: [...clips, ...existingTextClips, ...otherManualClips]
        };
    }),

    updateTimelineClip: (clipId, updates) => set((state) => ({
        clips: state.clips.map(c => c.id === clipId ? { ...c, ...updates } : c)
    })),

    addTimelineClip: (clip) => set((state) => ({
        clips: [...state.clips, { ...clip, panning: clip.panning || { x: 0, z: 0 } }]
    })),

    updateShotTransition: (shotId, transition) => set((state) => {
        const updatedShots = state.sbShots.map(s => s.id === shotId ? { ...s, transition } : s);
        return { sbShots: updatedShots };
    }),

    setZoomLevel: (level) => set({ zoomLevel: level }),
    setCurrentTime: (time) => set({ currentTime: time }),
});
