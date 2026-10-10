import { StateCreator } from 'zustand';
import { Shot, TimelineTrack, TimelineClip, ClipTransition, Caption } from '@core/types';

const DEFAULT_TRACKS: TimelineTrack[] = [
  { id: 'text_main', label: 'Captions/Overlay', type: 'text', trackType: 'captions', zIndex: 10 },
  { id: 'video_main', label: 'Video', type: 'video', trackType: 'dialogue', zIndex: 1 },
  { id: 'audio_dialogue', label: 'Dialogue', type: 'audio', trackType: 'dialogue', zIndex: 0 },
  { id: 'audio_sfx', label: 'SFX', type: 'audio', trackType: 'sfx', zIndex: 0 },
  { id: 'audio_music', label: 'Music', type: 'audio', trackType: 'music', zIndex: 0 },
  { id: 'audio_ambience', label: 'Atmosphere', type: 'audio', trackType: 'ambience', zIndex: -1 },
];

/** Keep caption timing and timeline geometry in one undoable document update. */
const timedClip = (clip: TimelineClip, startTime: number, duration: number): TimelineClip => ({
  ...clip,
  startTime,
  duration,
  ...(clip.type === 'text' ? { offset: 0 } : {}),
  ...(clip.caption
    ? { caption: { ...clip.caption, startTime, endTime: startTime + duration } }
    : {}),
});

const moveLinkedClips = (clips: TimelineClip[], shifts: Map<string, number>): TimelineClip[] =>
  clips.map((clip) => {
    const delta =
      shifts.get(clip.id) ?? (clip.sourceClipId ? shifts.get(clip.sourceClipId) : undefined);
    return delta === undefined ? clip : timedClip(clip, clip.startTime + delta, clip.duration);
  });

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
  splitTimelineClip: (clipId: string, relativeTime: number) => void;
  setTimelineClipTransition: (clipId: string, transition: ClipTransition) => void;
  importTimelineCaptions: (
    captions: Caption[],
    mode: 'append' | 'replace',
    sourceClipId?: string,
  ) => void;
  mergeTimelineCaptions: (clipIds: string[]) => void;
  shiftTimelineCaptions: (clipIds: string[], delta: number) => void;
  removeTimelineClip: (clipId: string, ripple?: boolean) => void;
  updateShotTransition: (shotId: number, transition: ClipTransition) => void;
  shiftTrackClips: (trackId: string, timeThreshold: number, delta: number) => void;

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
        if (!shot.generatedVideoUrl && shot.type !== 'title') return;
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

      const updated = { ...targetClip, ...updates };
      if (
        !Number.isFinite(updated.startTime) ||
        updated.startTime < 0 ||
        !Number.isFinite(updated.duration) ||
        updated.duration <= 0 ||
        !Number.isFinite(updated.offset) ||
        updated.offset < 0
      )
        return state;
      // Offset changes trim source content; only the remaining movement translates captions.
      const movement =
        updated.startTime - targetClip.startTime - (updated.offset - targetClip.offset);
      const shifts = new Map<string, number>();
      if (ripple) {
        const delta =
          updated.startTime + updated.duration - targetClip.startTime - targetClip.duration;
        for (const clip of state.clips) {
          if (clip.trackId === targetClip.trackId && clip.startTime > targetClip.startTime)
            shifts.set(clip.id, delta);
        }
      }
      const clips = state.clips.flatMap((clip): TimelineClip[] => {
        if (clip.id === clipId) return [timedClip(updated, updated.startTime, updated.duration)];
        if (clip.type === 'text' && clip.sourceClipId === clipId) {
          const start = Math.max(updated.startTime, clip.startTime + movement);
          const end = Math.min(
            updated.startTime + updated.duration,
            clip.startTime + clip.duration + movement,
          );
          return end > start ? [timedClip(clip, start, end - start)] : [];
        }
        return [clip];
      });
      const shifted = moveLinkedClips(clips, shifts);
      return shifted.some((clip) => clip.startTime < 0) ? state : { clips: shifted };
    }),

  removeTimelineClip: (clipId, ripple = false) =>
    set((state) => {
      const target = state.clips.find((clip) => clip.id === clipId);
      if (!target) return state;
      const shifts = new Map<string, number>();
      if (ripple) {
        for (const clip of state.clips) {
          if (clip.trackId === target.trackId && clip.startTime > target.startTime)
            shifts.set(clip.id, -target.duration);
        }
      }
      return {
        clips: moveLinkedClips(
          state.clips.filter((clip) => clip.id !== clipId && clip.sourceClipId !== clipId),
          shifts,
        ),
      };
    }),

  setTimelineClipTransition: (clipId, transition) =>
    set((state) => {
      const target = state.clips.find((clip) => clip.id === clipId);
      if (
        !target ||
        !['video', 'image'].includes(target.type) ||
        !['cut', 'fade_black', 'dissolve'].includes(transition.type)
      )
        return state;
      const ordered = state.clips
        .filter(
          (clip) =>
            clip.trackId === target.trackId && (clip.type === 'video' || clip.type === 'image'),
        )
        .sort((a, b) => a.startTime - b.startTime);
      const previous = ordered[ordered.findIndex((clip) => clip.id === clipId) - 1];
      if (transition.type === 'dissolve' && !previous) return state;
      const duration =
        transition.type === 'cut'
          ? 0
          : Math.min(
              transition.duration,
              target.duration / 2,
              previous ? previous.duration / 2 : target.duration / 2,
            );
      if (!Number.isFinite(duration) || (transition.type !== 'cut' && duration <= 0)) return state;
      // Dissolves need real overlapping source intervals. Update all affected clips and
      // linked captions together so both export validation and undo see a complete edit.
      const start =
        previous && (transition.type === 'dissolve' || target.transition?.type === 'dissolve')
          ? previous.startTime + previous.duration - (transition.type === 'dissolve' ? duration : 0)
          : target.startTime;
      const delta = start - target.startTime;
      const shifts = new Map(
        state.clips
          .filter((clip) => clip.trackId === target.trackId && clip.startTime >= target.startTime)
          .map((clip) => [clip.id, delta]),
      );
      const clips = moveLinkedClips(state.clips, shifts).map((clip) =>
        clip.id === clipId ? { ...clip, transition: { type: transition.type, duration } } : clip,
      );
      return clips.some((clip) => clip.startTime < 0) ? state : { clips };
    }),

  splitTimelineClip: (clipId, relativeTime) =>
    set((state) => {
      const clip = state.clips.find((entry) => entry.id === clipId);
      if (
        !clip ||
        !Number.isFinite(relativeTime) ||
        relativeTime <= 0 ||
        relativeTime >= clip.duration
      )
        return state;
      const splitTime = clip.startTime + relativeTime;
      const secondId = crypto.randomUUID();
      const part = (
        entry: TimelineClip,
        start: number,
        end: number,
        id: string,
        sourceClipId = entry.sourceClipId,
      ): TimelineClip => ({
        ...timedClip(entry, start, end - start),
        id,
        sourceClipId,
        offset: entry.type === 'text' ? 0 : entry.offset + start - entry.startTime,
        ...(entry.caption
          ? {
              caption: {
                ...entry.caption,
                id: crypto.randomUUID(),
                startTime: start,
                endTime: end,
              },
            }
          : {}),
      });
      return {
        clips: state.clips.flatMap((entry): TimelineClip[] => {
          if (entry.id === clipId)
            return [
              part(entry, entry.startTime, splitTime, entry.id),
              {
                ...part(entry, splitTime, entry.startTime + entry.duration, secondId),
                transition: { type: 'cut', duration: 0 },
              },
            ];
          if (entry.type !== 'text' || entry.sourceClipId !== clipId) return [entry];
          const end = entry.startTime + entry.duration;
          if (entry.startTime >= splitTime) return [{ ...entry, sourceClipId: secondId }];
          if (end <= splitTime) return [entry];
          return [
            part(entry, entry.startTime, splitTime, entry.id, clipId),
            part(entry, splitTime, end, crypto.randomUUID(), secondId),
          ];
        }),
      };
    }),

  importTimelineCaptions: (captions, mode, sourceClipId) =>
    set((state) => {
      if (
        captions.some(
          (caption) =>
            !caption.text.trim() ||
            !Number.isFinite(caption.startTime) ||
            !Number.isFinite(caption.endTime) ||
            caption.startTime < 0 ||
            caption.endTime <= caption.startTime,
        )
      )
        return state;
      return {
        clips: [
          ...state.clips.filter((clip) => mode !== 'replace' || !clip.caption),
          ...captions.map(
            (caption): TimelineClip => ({
              id: crypto.randomUUID(),
              resourceId: caption.id,
              trackId: 'text_main',
              type: 'text',
              label: caption.text,
              startTime: caption.startTime,
              duration: caption.endTime - caption.startTime,
              offset: 0,
              caption: { ...caption, id: crypto.randomUUID() },
              sourceClipId,
            }),
          ),
        ],
      };
    }),

  mergeTimelineCaptions: (clipIds) =>
    set((state) => {
      const selected = state.clips
        .filter((clip) => clipIds.includes(clip.id) && clip.caption)
        .sort((a, b) => a.startTime - b.startTime);
      if (
        selected.length < 2 ||
        selected.some(
          (clip) =>
            clip.sourceClipId !== selected[0].sourceClipId || clip.trackId !== selected[0].trackId,
        )
      )
        return state;
      const first = selected[0];
      const end = Math.max(...selected.map((clip) => clip.startTime + clip.duration));
      const text = selected.map((clip) => clip.caption!.text).join('\n');
      const merged = timedClip(
        { ...first, label: text, caption: { ...first.caption!, id: crypto.randomUUID(), text } },
        first.startTime,
        end - first.startTime,
      );
      return {
        clips: state.clips.flatMap((clip) =>
          clip.id === first.id
            ? [merged]
            : selected.some((entry) => entry.id === clip.id)
              ? []
              : [clip],
        ),
      };
    }),

  shiftTimelineCaptions: (clipIds, delta) =>
    set((state) => {
      if (
        !Number.isFinite(delta) ||
        state.clips.some(
          (clip) => clipIds.includes(clip.id) && clip.caption && clip.startTime + delta < 0,
        )
      )
        return state;
      return {
        clips: state.clips.map((clip) =>
          clipIds.includes(clip.id) && clip.caption
            ? timedClip(clip, clip.startTime + delta, clip.duration)
            : clip,
        ),
      };
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
    set((state) => {
      if (!Number.isFinite(delta)) return state;
      const shifts = new Map(
        state.clips
          .filter((clip) => clip.trackId === trackId && clip.startTime > timeThreshold)
          .map((clip) => [clip.id, delta]),
      );
      const clips = moveLinkedClips(state.clips, shifts);
      return clips.some((clip) => clip.startTime < 0) ? state : { clips };
    }),

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
