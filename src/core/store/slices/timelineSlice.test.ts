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
  it('does not fabricate a clip for an empty starter scene', () => {
    useAppStore.getState().resetAll();
    useAppStore.getState().syncTimelineFromShots();
    expect(useAppStore.getState().clips).toEqual([]);
  });
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

describe('timelineSlice — atomic caption editing', () => {
  const captionClip = (
    id: string,
    start: number,
    end: number,
    sourceClipId?: string,
  ): TimelineClip => ({
    ...makeClip(id, 'text_main', start, end - start),
    type: 'text',
    sourceClipId,
    caption: { id: `caption-${id}`, text: id, startTime: start, endTime: end, style: 'classic' },
  });
  const resetHistory = () => useAppStore.temporal.getState().clear();

  it('splits text with distinct caption identities, global timing and zero offsets in one undo step', () => {
    const original = captionClip('text', 10, 16);
    useAppStore.setState({ clips: [original] });
    resetHistory();
    useAppStore.getState().splitTimelineClip('text', 2);
    const clips = useAppStore.getState().clips;
    expect(clips.map((clip) => [clip.startTime, clip.duration, clip.offset])).toEqual([
      [10, 2, 0],
      [12, 4, 0],
    ]);
    expect(new Set(clips.map((clip) => clip.caption?.id)).size).toBe(2);
    expect(clips.every((clip) => clip.caption?.id !== original.caption?.id)).toBe(true);
    expect(clips[1].caption).toMatchObject({ startTime: 12, endTime: 16 });
    expect(useAppStore.temporal.getState().pastStates).toHaveLength(1);
    useAppStore.temporal.getState().undo();
    expect(useAppStore.getState().clips).toEqual([original]);
    useAppStore.temporal.getState().redo();
    expect(useAppStore.getState().clips).toEqual(clips);
  });

  it('splits linked captions at source split and reassigns later captions while leaving free text unchanged', () => {
    const free = captionClip('free', 2, 8);
    useAppStore.setState({
      clips: [
        makeClip('video', 'video_main', 0, 10),
        captionClip('crossing', 2, 8, 'video'),
        captionClip('later', 7, 9, 'video'),
        free,
      ],
    });
    useAppStore.getState().splitTimelineClip('video', 5);
    const clips = useAppStore.getState().clips;
    const second = clips.find((clip) => clip.type === 'video' && clip.id !== 'video')!;
    expect(clips.find((clip) => clip.id === 'crossing')).toMatchObject({
      duration: 3,
      sourceClipId: 'video',
    });
    expect(clips.find((clip) => clip.type === 'text' && clip.startTime === 5)).toMatchObject({
      duration: 3,
      sourceClipId: second.id,
      offset: 0,
    });
    expect(clips.find((clip) => clip.id === 'later')?.sourceClipId).toBe(second.id);
    expect(clips.find((clip) => clip.id === 'free')).toEqual(free);
  });

  it('left trim intersects linked captions and removes excluded captions without translating source content', () => {
    const free = captionClip('free', 0, 8);
    useAppStore.setState({
      clips: [
        makeClip('video', 'video_main', 0, 10),
        captionClip('partial', 2, 8, 'video'),
        captionClip('excluded', 0, 2, 'video'),
        free,
      ],
    });
    useAppStore
      .getState()
      .updateTimelineClip('video', { startTime: 4, offset: 4, duration: 6 }, true);
    expect(useAppStore.getState().clips.find((clip) => clip.id === 'partial')).toMatchObject({
      startTime: 4,
      duration: 4,
      caption: { startTime: 4, endTime: 8 },
    });
    expect(useAppStore.getState().clips.find((clip) => clip.id === 'excluded')).toBeUndefined();
    expect(useAppStore.getState().clips.find((clip) => clip.id === 'free')).toEqual(free);
  });

  it('ripples later sources and linked captions together; free captions stay at their time', () => {
    const original = [
      makeClip('first', 'video_main', 0, 5),
      makeClip('second', 'video_main', 5, 5),
      captionClip('linked', 6, 8, 'second'),
      captionClip('free', 6, 8),
    ];
    useAppStore.setState({ clips: original });
    resetHistory();
    useAppStore.getState().updateTimelineClip('first', { duration: 3 }, true);
    expect(useAppStore.getState().clips.find((clip) => clip.id === 'linked')).toMatchObject({
      startTime: 4,
      caption: { startTime: 4, endTime: 6 },
    });
    expect(useAppStore.getState().clips.find((clip) => clip.id === 'free')?.startTime).toBe(6);
    useAppStore.temporal.getState().undo();
    expect(useAppStore.getState().clips).toEqual(original);
    useAppStore.getState().removeTimelineClip('first', true);
    expect(useAppStore.getState().clips.find((clip) => clip.id === 'linked')?.startTime).toBe(1);
    useAppStore.getState().removeTimelineClip('second');
    expect(useAppStore.getState().clips.map((clip) => clip.id)).toEqual(['free']);
  });

  it('gap closing and moving a source also move linked captions', () => {
    useAppStore.setState({
      clips: [makeClip('source', 'video_main', 5, 5), captionClip('linked', 6, 8, 'source')],
    });
    useAppStore.getState().shiftTrackClips('video_main', 0, -5);
    expect(useAppStore.getState().clips[1].caption).toMatchObject({ startTime: 1, endTime: 3 });
    useAppStore.getState().updateTimelineClip('source', { startTime: 3 });
    expect(useAppStore.getState().clips[1].caption).toMatchObject({ startTime: 4, endTime: 6 });
  });

  it('caption append, replace, merge and time shift are atomic and reject negative shifts', () => {
    const captions = [captionClip('one', 0, 2).caption!, captionClip('two', 3, 5).caption!];
    useAppStore.setState({ clips: [makeClip('video')] });
    resetHistory();
    useAppStore.getState().importTimelineCaptions(captions, 'append');
    expect(useAppStore.getState().clips).toHaveLength(3);
    expect(useAppStore.temporal.getState().pastStates).toHaveLength(1);
    const ids = useAppStore
      .getState()
      .clips.filter((clip) => clip.caption)
      .map((clip) => clip.id);
    useAppStore.getState().shiftTimelineCaptions(ids, -1);
    expect(useAppStore.getState().clips.find((clip) => clip.id === ids[0])?.startTime).toBe(0);
    useAppStore.getState().shiftTimelineCaptions(ids, 2);
    useAppStore.getState().mergeTimelineCaptions(ids);
    expect(useAppStore.getState().clips).toHaveLength(2);
    expect(useAppStore.getState().clips[1].caption).toMatchObject({
      text: 'one\ntwo',
      startTime: 2,
      endTime: 7,
    });
    const merged = useAppStore.getState().clips;
    resetHistory();
    useAppStore.getState().importTimelineCaptions([captions[0]], 'replace');
    expect(useAppStore.temporal.getState().pastStates).toHaveLength(1);
    useAppStore.temporal.getState().undo();
    expect(useAppStore.getState().clips).toEqual(merged);
  });
});

describe('timelineSlice — delivery transitions', () => {
  it('creates and removes dissolve overlaps atomically with linked captions and later clips', () => {
    const linked: TimelineClip = {
      ...makeClip('caption', 'text_main', 6, 2),
      type: 'text',
      sourceClipId: 'second',
      caption: { id: 'caption', text: 'Hello', startTime: 6, endTime: 8, style: 'classic' },
    };
    const original = [
      makeClip('first', 'video_main', 0, 5),
      makeClip('second', 'video_main', 5, 5),
      makeClip('third', 'video_main', 10, 5),
      linked,
    ];
    useAppStore.setState({ clips: original });
    useAppStore.temporal.getState().clear();
    useAppStore.getState().setTimelineClipTransition('second', { type: 'dissolve', duration: 0.5 });
    expect(useAppStore.getState().clips.find((clip) => clip.id === 'second')).toMatchObject({
      startTime: 4.5,
      transition: { type: 'dissolve', duration: 0.5 },
    });
    expect(useAppStore.getState().clips.find((clip) => clip.id === 'third')?.startTime).toBe(9.5);
    expect(
      useAppStore.getState().clips.find((clip) => clip.id === 'caption')?.caption,
    ).toMatchObject({ startTime: 5.5, endTime: 7.5 });
    expect(useAppStore.temporal.getState().pastStates).toHaveLength(1);
    useAppStore.temporal.getState().undo();
    expect(useAppStore.getState().clips).toEqual(original);
    useAppStore.temporal.getState().redo();
    useAppStore.getState().setTimelineClipTransition('second', { type: 'cut', duration: 0 });
    expect(useAppStore.getState().clips.find((clip) => clip.id === 'second')?.startTime).toBe(5);
    expect(useAppStore.getState().clips.find((clip) => clip.id === 'third')?.startTime).toBe(10);
  });
  it('bounds transition duration and rejects unsupported delivery transitions', () => {
    useAppStore.setState({
      clips: [makeClip('first', 'video_main', 0, 1), makeClip('second', 'video_main', 1, 1)],
    });
    useAppStore.getState().setTimelineClipTransition('second', { type: 'dissolve', duration: 8 });
    expect(useAppStore.getState().clips[1].transition?.duration).toBe(0.5);
    useAppStore
      .getState()
      .setTimelineClipTransition('second', { type: 'wipe_left', duration: 0.5 });
    expect(useAppStore.getState().clips[1].transition?.type).toBe('dissolve');
    useAppStore.getState().setTimelineClipTransition('first', { type: 'dissolve', duration: 0.5 });
    expect(useAppStore.getState().clips[0].transition).toBeUndefined();
  });
});
