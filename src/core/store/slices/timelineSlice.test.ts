/**
 * Tests for timelineSlice via useAppStore.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAppStore } from '@core/store/useAppStore';
import type { TimelineClip, ClipTransition } from '@core/types';

vi.mock('idb-keyval', () => ({
  get: vi.fn().mockResolvedValue(undefined),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
  keys: vi.fn().mockResolvedValue([]),
  createStore: vi.fn(),
}));

vi.mock('@core/services/loggerService', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const makeClip = (
  id: string,
  trackId = 'video_main',
  startTime = 0,
  duration = 5,
): TimelineClip => ({
  id,
  resourceId: 1,
  trackId,
  startTime,
  duration,
  offset: 0,
  type: 'video',
  label: `Clip ${id}`,
  opacity: 1,
  volume: 1,
  panning: { x: 0, z: 0 },
});

beforeEach(() => {
  useAppStore.setState({
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
    clips: [],
    zoomLevel: 20,
    currentTime: 0,
  });
});

describe('timelineSlice — shots', () => {
  it('setSbShots replaces shots with array', () => {
    useAppStore.getState().setSbShots([]);
    expect(useAppStore.getState().sbShots).toHaveLength(0);
  });

  it('setSbShots accepts functional updater', () => {
    useAppStore.getState().setSbShots((prev) => [...prev, { ...prev[0], id: 99, action: 'new' }]);
    expect(useAppStore.getState().sbShots).toHaveLength(2);
    expect(useAppStore.getState().sbShots[1].id).toBe(99);
  });

  it('addShot appends a new shot with incremented id', () => {
    useAppStore.getState().addShot();
    const shots = useAppStore.getState().sbShots;
    expect(shots).toHaveLength(2);
    expect(shots[1].id).toBe(2);
  });

  it('addShot with type "title" creates title shot', () => {
    useAppStore.getState().addShot('title');
    expect(useAppStore.getState().sbShots[1].type).toBe('title');
  });

  it('updateShot changes a specific field', () => {
    useAppStore.getState().updateShot(1, 'action', 'Run through corridors');
    expect(useAppStore.getState().sbShots[0].action).toBe('Run through corridors');
  });

  it('deleteShot removes shot when more than one exists', () => {
    useAppStore.getState().addShot();
    useAppStore.getState().deleteShot(1);
    expect(useAppStore.getState().sbShots).toHaveLength(1);
    expect(useAppStore.getState().sbShots[0].id).toBe(2);
  });

  it('deleteShot does not remove last shot', () => {
    useAppStore.getState().deleteShot(1);
    expect(useAppStore.getState().sbShots).toHaveLength(1);
  });
});

describe('timelineSlice — clips', () => {
  it('addTimelineClip appends a clip', () => {
    useAppStore.getState().addTimelineClip(makeClip('c1'));
    expect(useAppStore.getState().clips).toHaveLength(1);
  });

  it('addTimelineClip defaults panning when omitted', () => {
    const clipNoPanning = { ...makeClip('c1') };
    delete (clipNoPanning as { panning?: unknown }).panning;
    useAppStore.getState().addTimelineClip(clipNoPanning);
    expect(useAppStore.getState().clips[0].panning).toEqual({ x: 0, z: 0 });
  });

  it('updateTimelineClip merges updates', () => {
    useAppStore.getState().addTimelineClip(makeClip('c1'));
    useAppStore.getState().updateTimelineClip('c1', { label: 'Updated' });
    expect(useAppStore.getState().clips[0].label).toBe('Updated');
  });

  it('updateTimelineClip does nothing for unknown clip id', () => {
    useAppStore.getState().addTimelineClip(makeClip('c1'));
    useAppStore.getState().updateTimelineClip('unknown', { label: 'X' });
    expect(useAppStore.getState().clips[0].label).toBe('Clip c1');
  });

  it('updateTimelineClip with ripple shifts subsequent clips on same track', () => {
    useAppStore.getState().addTimelineClip(makeClip('c1', 'video_main', 0, 5));
    useAppStore.getState().addTimelineClip(makeClip('c2', 'video_main', 5, 3));
    useAppStore.getState().updateTimelineClip('c1', { duration: 8 }, true);
    expect(useAppStore.getState().clips.find((c) => c.id === 'c2')?.startTime).toBe(8);
  });

  it('removeTimelineClip removes a clip', () => {
    useAppStore.getState().addTimelineClip(makeClip('c1'));
    useAppStore.getState().removeTimelineClip('c1');
    expect(useAppStore.getState().clips).toHaveLength(0);
  });

  it('removeTimelineClip with ripple shifts subsequent clips', () => {
    useAppStore.getState().addTimelineClip(makeClip('c1', 'video_main', 0, 5));
    useAppStore.getState().addTimelineClip(makeClip('c2', 'video_main', 5, 3));
    useAppStore.getState().addTimelineClip(makeClip('c3', 'video_main', 8, 4));
    useAppStore.getState().removeTimelineClip('c1', true);
    expect(useAppStore.getState().clips.find((c) => c.id === 'c2')?.startTime).toBe(0);
    expect(useAppStore.getState().clips.find((c) => c.id === 'c3')?.startTime).toBe(3);
  });

  it('removeTimelineClip does nothing for unknown id', () => {
    useAppStore.getState().addTimelineClip(makeClip('c1'));
    useAppStore.getState().removeTimelineClip('unknown');
    expect(useAppStore.getState().clips).toHaveLength(1);
  });
});

describe('timelineSlice — transitions and helpers', () => {
  it('updateShotTransition updates a shot transition', () => {
    const transition: ClipTransition = { type: 'fade_black', duration: 0.5 };
    useAppStore.getState().updateShotTransition(1, transition);
    expect(useAppStore.getState().sbShots[0].transition).toEqual(transition);
  });

  it('shiftTrackClips shifts clips above threshold', () => {
    useAppStore.getState().addTimelineClip(makeClip('c1', 'video_main', 2, 3));
    useAppStore.getState().addTimelineClip(makeClip('c2', 'video_main', 6, 3));
    useAppStore.getState().shiftTrackClips('video_main', 3, 5);
    expect(useAppStore.getState().clips.find((c) => c.id === 'c1')?.startTime).toBe(2);
    expect(useAppStore.getState().clips.find((c) => c.id === 'c2')?.startTime).toBe(11);
  });
});

describe('timelineSlice — view state', () => {
  it('setZoomLevel updates zoomLevel', () => {
    useAppStore.getState().setZoomLevel(50);
    expect(useAppStore.getState().zoomLevel).toBe(50);
  });

  it('setCurrentTime updates currentTime', () => {
    useAppStore.getState().setCurrentTime(12.5);
    expect(useAppStore.getState().currentTime).toBe(12.5);
  });
});

describe('timelineSlice — gcTimeline', () => {
  it('does not prune when 50 or fewer shots', () => {
    useAppStore.getState().gcTimeline();
    expect(useAppStore.getState().sbShots).toHaveLength(1);
  });

  it('prunes to 50 most recent shots and associated clips', () => {
    // Add 55 shots
    const shots = Array.from({ length: 55 }, (_, i) => ({
      id: i + 1,
      type: 'video' as const,
      action: '',
      camera: '',
      characterId: '',
      takes: [],
      selectedTakeIndex: 0,
      visualLink: false,
      duration: 5,
      transition: { type: 'cut' as const, duration: 0 },
    }));
    // Add clips for shots 1–5 (to be pruned) and 6–55 (to be kept)
    const clips = shots
      .map((s) => makeClip(`cl_${s.id}`, 'video_main', s.id * 5, 5))
      .map((c, i) => ({ ...c, resourceId: shots[i].id }));

    useAppStore.setState({ sbShots: shots, clips });
    useAppStore.getState().gcTimeline();

    const { sbShots, clips: remainingClips } = useAppStore.getState();
    expect(sbShots).toHaveLength(50);
    // Shot 1-5 should be pruned (lowest IDs)
    expect(sbShots.find((s) => s.id === 1)).toBeUndefined();
    expect(sbShots.find((s) => s.id === 55)).toBeDefined();
    // Clips referencing pruned shots should also be pruned
    expect(remainingClips.find((c) => c.resourceId === 1)).toBeUndefined();
    expect(remainingClips.find((c) => c.resourceId === 55)).toBeDefined();
  });
});

describe('timelineSlice — syncTimelineFromShots', () => {
  it('generates video clip for shot that has a generatedVideoUrl', () => {
    useAppStore.setState({
      sbShots: [
        {
          id: 1,
          type: 'video',
          action: 'Chase scene',
          camera: '',
          characterId: '',
          takes: [],
          selectedTakeIndex: 0,
          visualLink: false,
          duration: 4,
          generatedVideoUrl: 'https://cdn/v1.mp4',
          transition: { type: 'cut', duration: 0 },
        },
      ],
      clips: [],
    });
    useAppStore.getState().syncTimelineFromShots();
    const clips = useAppStore.getState().clips;
    expect(clips.some((c) => c.id === 'video_1')).toBe(true);
  });

  it('generates title clip for title-type shot', () => {
    useAppStore.setState({
      sbShots: [
        {
          id: 1,
          type: 'title',
          action: '',
          camera: '',
          characterId: '',
          takes: [],
          selectedTakeIndex: 0,
          visualLink: false,
          duration: 3,
          transition: { type: 'cut', duration: 0 },
        },
      ],
      clips: [],
    });
    useAppStore.getState().syncTimelineFromShots();
    const clips = useAppStore.getState().clips;
    const titleClip = clips.find((c) => c.id === 'video_1');
    expect(titleClip?.label).toBe('Title');
  });
});
