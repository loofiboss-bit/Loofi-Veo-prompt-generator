import { StateCreator } from 'zustand';
import { Shot, TimelineTrack, TimelineClip, ClipTransition } from '@core/types';

const DEFAULT_TRACKS: TimelineTrack[] = [
  { id: 'text_main', label: 'Captions/Overlay', type: 'text', trackType: 'captions', zIndex: 10 },
  { id: 'video_main', label: 'Video', type: 'video', trackType: 'dialogue', zIndex: 1 },
  { id: 'audio_dialogue', label: 'Dialogue', type: 'audio', trackType: 'dialogue', zIndex: 0 },
  { id: 'audio_sfx', label: 'SFX', type: 'audio', trackType: 'sfx', zIndex: 0 },
  { id: 'audio_music', label: 'Music', type: 'audio', trackType: 'music', zIndex: 0 },
  { id: 'audio_ambience', label: 'Atmosphere', type: 'audio', trackType: 'ambience', zIndex: -1 },
];

export interface TimelineSlice {
  sbShots: Shot[];
  tracks: TimelineTrack[];
  clips: TimelineClip[];
  zoomLevel: number;
  currentTime: number;

  // StoryBoard Actions
  setSbShots: (shots: Shot[] | ((prev: Shot[]) => Shot[])) => void;
  addShot: (type?: 'video' | 'title') => void;
  updateShot: (id: number, field: keyof Shot, value: Shot[keyof Shot]) => void;
  deleteShot: (id: number) => void;

  // Timeline Actions
  syncTimelineFromShots: () => void;
  updateTimelineClip: (clipId: string, updates: Partial<TimelineClip>, ripple?: boolean) => void;
  addTimelineClip: (clip: TimelineClip) => void;
  removeTimelineClip: (clipId: string, ripple?: boolean) => void;
  updateShotTransition: (shotId: number, transition: ClipTransition) => void;
  shiftTrackClips: (trackId: string, timeThreshold: number, delta: number) => void;

  // View State Actions
  setZoomLevel: (level: number) => void;
  setCurrentTime: (time: number) => void;

  // Maintenance Actions
  /**
   * Garbage-collect the timeline: prune shots beyond the 50 most recent (by id),
   * and remove any clips that reference pruned shots. Clips not tied to any shot
   * (no matching resourceId in sbShots) are left untouched.
   */
  gcTimeline: () => void;
}

export const createTimelineSlice: StateCreator<TimelineSlice> = (set, _get) => ({
  sbShots: [
    {
      id: 1,
      type: 'video',
      action: '',
      camera: '',
      characterId: '',
      takes: [],
      selectedTakeIndex: 0,
      visualLink: false,
      duration: 5,
      transition: { type: 'cut', duration: 0 },
    },
  ],
  tracks: DEFAULT_TRACKS,
  clips: [],
  zoomLevel: 20,
  currentTime: 0,

  setSbShots: (shots) =>
    set((state) => {
      const newShots = typeof shots === 'function' ? shots(state.sbShots) : shots;
      return { sbShots: newShots };
    }),

  addShot: (type: 'video' | 'title' = 'video') =>
    set((state) => {
      const newId = state.sbShots.length > 0 ? Math.max(...state.sbShots.map((s) => s.id)) + 1 : 1;
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
        titleConfig:
          type === 'title'
            ? {
                text: 'New Title',
                background: '#000000',
                color: '#ffffff',
                fontSize: 80,
              }
            : undefined,
      };
      return { sbShots: [...state.sbShots, newShot] };
    }),

  updateShot: (id, field, value) =>
    set((state) => ({
      sbShots: state.sbShots.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
    })),

  deleteShot: (id) =>
    set((state) => {
      if (state.sbShots.length <= 1) return state;
      return { sbShots: state.sbShots.filter((s) => s.id !== id) };
    }),

  syncTimelineFromShots: () =>
    set((state) => {
      const manualClips = state.clips.filter(
        (c) => c.trackId !== 'video_main' && c.trackId !== 'audio_dialogue',
      );

      const generatedClips: TimelineClip[] = [];
      let cursor = 0;

      state.sbShots.forEach((shot) => {
        if (!shot.generatedVideoUrl && shot.type !== 'title' && shot.action) return;
        const duration = shot.duration || 5;

        generatedClips.push({
          id: `video_${shot.id}`,
          resourceId: shot.id,
          trackId: 'video_main',
          startTime: cursor,
          duration: duration,
          offset: 0,
          type: 'video',
          label: shot.type === 'title' ? `Title` : `Shot ${shot.id}`,
          transition: shot.transition,
          opacity: 1.0,
          volume: 1.0,
          panning: { x: 0, z: 0 },
          maskSequence: shot.maskSequence,
        });

        if (shot.audioUrl) {
          generatedClips.push({
            id: `audio_${shot.id}`,
            resourceId: shot.id,
            trackId: 'audio_dialogue',
            startTime: cursor,
            duration: shot.audioDuration || duration,
            offset: 0,
            type: 'audio',
            label: `Dialog ${shot.id}`,
            volume: 1.0,
            panning: { x: 0, z: 0 },
          });
        }

        if (shot.sfx) {
          shot.sfx.forEach((sfx, idx) => {
            generatedClips.push({
              id: `sfx_${shot.id}_${idx}`,
              resourceId: shot.id,
              trackId: 'audio_sfx',
              startTime: cursor + sfx.timestamp,
              duration: 2,
              offset: 0,
              type: 'audio',
              label: sfx.description,
              volume: 1.0,
              panning: { x: 0, z: 0 },
            });
          });
        }

        cursor += duration;
      });

      const cleanManualClips = manualClips.filter(
        (c) => !generatedClips.some((gc) => gc.id === c.id),
      );

      return {
        clips: [...generatedClips, ...cleanManualClips],
      };
    }),

  updateTimelineClip: (clipId, updates, ripple = false) =>
    set((state) => {
      const targetClip = state.clips.find((c) => c.id === clipId);
      if (!targetClip) return state;

      let newClips = state.clips.map((c) => (c.id === clipId ? { ...c, ...updates } : c));

      // Ripple Logic: If duration changed, shift subsequent clips
      if (ripple && updates.duration !== undefined) {
        const delta = updates.duration - targetClip.duration;
        if (delta !== 0) {
          newClips = newClips.map((c) => {
            if (c.trackId === targetClip.trackId && c.startTime > targetClip.startTime) {
              return { ...c, startTime: c.startTime + delta };
            }
            return c;
          });
        }
      }

      return { clips: newClips };
    }),

  removeTimelineClip: (clipId, ripple = false) =>
    set((state) => {
      const clipToRemove = state.clips.find((c) => c.id === clipId);
      if (!clipToRemove) return state;

      const remainingClips = state.clips.filter((c) => c.id !== clipId);

      if (ripple) {
        const trackId = clipToRemove.trackId;
        const threshold = clipToRemove.startTime;
        const shiftAmount = -clipToRemove.duration;

        const shiftedClips = remainingClips.map((c) => {
          if (c.trackId === trackId && c.startTime > threshold) {
            return { ...c, startTime: c.startTime + shiftAmount };
          }
          return c;
        });
        return { clips: shiftedClips };
      }

      return { clips: remainingClips };
    }),

  addTimelineClip: (clip) =>
    set((state) => ({
      clips: [...state.clips, { ...clip, panning: clip.panning || { x: 0, z: 0 } }],
    })),

  updateShotTransition: (shotId, transition) =>
    set((state) => {
      const updatedShots = state.sbShots.map((s) => (s.id === shotId ? { ...s, transition } : s));
      return { sbShots: updatedShots };
    }),

  shiftTrackClips: (trackId, timeThreshold, delta) =>
    set((state) => ({
      clips: state.clips.map((c) => {
        if (c.trackId === trackId && c.startTime > timeThreshold) {
          return { ...c, startTime: c.startTime + delta };
        }
        return c;
      }),
    })),

  setZoomLevel: (level) => set({ zoomLevel: level }),
  setCurrentTime: (time) => set({ currentTime: time }),

  gcTimeline: () =>
    set((state) => {
      const MAX_SHOTS = 50;
      if (state.sbShots.length <= MAX_SHOTS) return state;

      // Keep the 50 most recent shots (highest id values); preserve order
      const sorted = [...state.sbShots].sort((a, b) => b.id - a.id);
      const keptShots = sorted.slice(0, MAX_SHOTS);
      const keptIds = new Set(keptShots.map((s) => s.id));

      // Prune clips that reference a pruned shot (resourceId matches a shot id
      // that was removed). Clips with no shot match are considered manual and kept.
      const allShotIds = new Set(state.sbShots.map((s) => s.id));
      const prunedClips = state.clips.filter((c) => {
        const refId = c.resourceId as number;
        // If clip references a shot at all, only keep it if that shot is kept
        if (allShotIds.has(refId)) return keptIds.has(refId);
        // Clip references no shot (manual clip) — always keep
        return true;
      });

      // Restore original order for kept shots
      const orderedKeptShots = [...keptShots].sort((a, b) => a.id - b.id);

      return { sbShots: orderedKeptShots, clips: prunedClips };
    }),
});
