import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Asset, ProductionRun, Shot, TimelineClip } from '@core/types';
import {
  timelinePreviewGain,
  timelinePreviewSource,
  TimelineSourcePreview,
} from './TimelineSourcePreview';
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, text: string) => text }),
}));
beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
});
const clip: TimelineClip = {
  id: 'video',
  resourceId: 1,
  selectedTakeId: 'old',
  type: 'video',
  trackId: 'v',
  startTime: 0,
  duration: 3,
  offset: 0,
  label: 'Original edit',
};
describe('timeline source preview', () => {
  it('mixes clip volume, keyframes, fades and track mute in the shared preview gain', () => {
    const mixed: TimelineClip = {
      ...clip,
      startTime: 10,
      duration: 8,
      volume: 0.8,
      volumeKeyframes: [
        { time: 0, value: 0.5 },
        { time: 4, value: 1 },
      ],
    };
    expect(
      timelinePreviewGain(mixed, 12, { inSeconds: 4, outSeconds: 2 }, false, true),
    ).toBeCloseTo(0.3);
    expect(timelinePreviewGain(mixed, 12, undefined, true, true)).toBe(0);
    expect(timelinePreviewGain(mixed, 12, undefined, false, false)).toBe(0);
    expect(timelinePreviewGain(mixed, 17, { inSeconds: 0, outSeconds: 2 }, false, true)).toBe(0.4);
  });
  it('uses the pinned take even when the scene has a newer accepted take', () => {
    const shots = [{ id: 1, generatedVideoUrl: 'blob:new' }] as Shot[];
    const run = {
      shots: [
        {
          id: 1,
          selectedTakeId: 'new',
          takes: [
            { id: 'old', localMediaUrl: 'blob:old' },
            { id: 'new', localMediaUrl: 'blob:new' },
          ],
        },
      ],
    } as ProductionRun;
    expect(timelinePreviewSource(clip, [], shots, run)).toBe('blob:old');
    expect(timelinePreviewSource(clip, [], shots, null)).toBeUndefined();
    expect(
      timelinePreviewSource(
        clip,
        [{ id: 'old', url: 'blob:retained-old' }] as Asset[],
        shots,
        null,
      ),
    ).toBe('blob:retained-old');
  });
  it('prefers the registered stream for a frozen take over an inaccessible file URL', () => {
    const run = {
      shots: [
        {
          id: 1,
          selectedTakeId: 'new',
          takes: [
            {
              id: 'old',
              localMediaKey: 'local-media:old',
              localMediaUrl: 'file:///private/old.mp4',
            },
            {
              id: 'new',
              localMediaKey: 'local-media:new',
              localMediaUrl: 'file:///private/new.mp4',
            },
          ],
        },
      ],
    } as ProductionRun;
    const assets = [
      { id: 'local-media:new', url: 'loofi-media://media/local-media%3Anew' },
      { id: 'local-media:old', url: 'loofi-media://media/local-media%3Aold' },
    ] as Asset[];
    expect(timelinePreviewSource(clip, assets, [], run)).toBe(
      'loofi-media://media/local-media%3Aold',
    );
  });
  it('renders overlapping audio and time-aligned captions even during a visual gap', () => {
    const clips = [
      {
        ...clip,
        id: 'music',
        selectedTakeId: undefined,
        type: 'audio' as const,
        resourceId: 'music',
        offset: 2,
      },
      {
        ...clip,
        id: 'speech',
        selectedTakeId: undefined,
        type: 'audio' as const,
        resourceId: 'speech',
      },
      {
        ...clip,
        id: 'caption',
        type: 'text' as const,
        caption: {
          id: 'c',
          text: 'Actual caption',
          startTime: 0,
          endTime: 3,
          style: 'classic' as const,
        },
      },
    ];
    const assets = [
      { id: 'music', url: 'blob:music' },
      { id: 'speech', url: 'blob:speech' },
    ] as Asset[];
    const { container } = render(
      <TimelineSourcePreview
        clips={clips}
        tracks={[]}
        shots={[]}
        assets={assets}
        run={null}
        time={1}
        playing={false}
        onFailure={vi.fn()}
      />,
    );
    expect(container.querySelectorAll('audio')).toHaveLength(2);
    expect(screen.getByText('Actual caption')).toBeTruthy();
    expect(container.querySelector('video')).toBeNull();
  });
});

it('synchronizes source offset and volume for audio playback and releases media on unmount', () => {
  vi.spyOn(HTMLMediaElement.prototype, 'readyState', 'get').mockReturnValue(1);
  const audio = {
    ...clip,
    id: 'speech',
    resourceId: 'speech',
    type: 'audio' as const,
    selectedTakeId: undefined,
    startTime: 2,
    offset: 4,
    duration: 5,
    volume: 0.25,
  };
  const { container, unmount } = render(
    <TimelineSourcePreview
      clips={[audio]}
      tracks={[]}
      assets={[{ id: 'speech', url: 'blob:audio' }] as Asset[]}
      shots={[]}
      run={null}
      time={3}
      playing
      onFailure={vi.fn()}
    />,
  );
  const element = container.querySelector('audio')!;
  expect(element.currentTime).toBe(5);
  expect(element.volume).toBe(0.25);
  expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
  unmount();
  expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
});

it('respects track mute and active state while keeping captions visible only on active tracks', () => {
  const audio = {
    ...clip,
    id: 'speech',
    type: 'audio' as const,
    resourceId: 'speech',
    trackId: 'dialogue',
    selectedTakeId: undefined,
  };
  const caption = {
    ...clip,
    id: 'caption',
    type: 'text' as const,
    trackId: 'captions',
    caption: {
      id: 'caption',
      text: 'Keep this visible',
      startTime: 0,
      endTime: 3,
      style: 'classic' as const,
    },
  };
  const assets = [{ id: 'speech', url: 'blob:speech' }] as Asset[];
  const onFailure = vi.fn();
  const { container, rerender } = render(
    <TimelineSourcePreview
      clips={[audio, caption]}
      tracks={[
        {
          id: 'dialogue',
          label: 'Dialogue',
          type: 'audio',
          trackType: 'dialogue',
          zIndex: 0,
          muted: true,
        },
        { id: 'captions', label: 'Captions', type: 'text', trackType: 'captions', zIndex: 1 },
      ]}
      assets={assets}
      shots={[]}
      run={null}
      time={1}
      playing={false}
      onFailure={onFailure}
    />,
  );
  expect(container.querySelector('audio')?.volume).toBe(0);
  expect(screen.getByText('Keep this visible')).toBeTruthy();
  rerender(
    <TimelineSourcePreview
      clips={[audio, caption]}
      tracks={[
        {
          id: 'dialogue',
          label: 'Dialogue',
          type: 'audio',
          trackType: 'dialogue',
          zIndex: 0,
          active: false,
        },
        {
          id: 'captions',
          label: 'Captions',
          type: 'text',
          trackType: 'captions',
          zIndex: 1,
          active: false,
        },
      ]}
      assets={assets}
      shots={[]}
      run={null}
      time={1}
      playing={false}
      onFailure={onFailure}
    />,
  );
  expect(container.querySelector('audio')).toBeNull();
  expect(screen.queryByText('Keep this visible')).toBeNull();
});

it('routes preview media through one shared Web Audio gain path', () => {
  const original = Object.getOwnPropertyDescriptor(window, 'AudioContext');
  const source = { connect: vi.fn(), disconnect: vi.fn() };
  const gain = {
    gain: { value: 1 },
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
  const context = {
    state: 'running',
    destination: {},
    createMediaElementSource: vi.fn(() => source),
    createGain: vi.fn(() => gain),
    close: vi.fn().mockResolvedValue(undefined),
  } as unknown as AudioContext;
  const AudioContextMock = vi.fn(function MockAudioContext() {
    return context;
  });
  Object.defineProperty(window, 'AudioContext', {
    configurable: true,
    value: AudioContextMock,
  });
  try {
    const audio = {
      ...clip,
      id: 'speech',
      resourceId: 'speech',
      type: 'audio' as const,
      selectedTakeId: undefined,
      volume: 0.25,
    };
    const { container, unmount } = render(
      <TimelineSourcePreview
        clips={[audio]}
        tracks={[]}
        assets={[{ id: 'speech', url: 'blob:audio' }] as Asset[]}
        shots={[]}
        run={null}
        time={1}
        playing={false}
        onFailure={vi.fn()}
      />,
    );
    expect(AudioContextMock).toHaveBeenCalled();
    const element = container.querySelector('audio')!;
    expect(context.createMediaElementSource).toHaveBeenCalledWith(element);
    expect(source.connect).toHaveBeenCalledWith(gain);
    expect(gain.connect).toHaveBeenCalledWith(context.destination);
    expect(element.volume).toBe(1);
    expect(gain.gain.value).toBe(0.25);
    unmount();
    expect(source.disconnect).toHaveBeenCalledOnce();
    expect(gain.disconnect).toHaveBeenCalledOnce();
  } finally {
    if (original) Object.defineProperty(window, 'AudioContext', original);
    else Reflect.deleteProperty(window, 'AudioContext');
  }
});
