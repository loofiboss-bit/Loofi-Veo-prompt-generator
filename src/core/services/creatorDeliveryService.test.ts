import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Project, ProductionRun, TimelineClip, Asset } from '@core/types';
vi.mock('@core/services/projectDocumentService', () => ({
  projectDocumentService: { update: vi.fn(), load: vi.fn() },
}));
vi.mock('@core/services/gemini/geminiAudioService', () => ({ transcribeAudio: vi.fn() }));
vi.mock('@core/utils/projectArchiver', () => ({ resolveProjectAssetBlob: vi.fn() }));
import {
  creatorDeliveryService,
  canonicalRenderJson,
  defaultCreatorDelivery,
} from './creatorDeliveryService';

const clip: TimelineClip = {
  id: 'clip',
  label: 'Selected video',
  trackId: 'v',
  type: 'video',
  resourceId: 'asset',
  startTime: 2,
  duration: 3,
  offset: 1,
};
const asset: Asset = {
  id: 'asset',
  storageKey: 'durable-key',
  type: 'video',
  name: 'video.mp4',
  url: '',
  data: '',
  mimeType: 'video/mp4',
};
const makeProject = (clips: TimelineClip[] = [clip]) =>
  ({
    id: 'p',
    name: 'Saved project',
    storyboard: {
      shots: [],
      timeline: {
        tracks: [{ id: 'v', type: 'video', trackType: 'dialogue', label: 'Video', zIndex: 0 }],
        clips: structuredClone(clips),
        currentTime: 0,
        zoomLevel: 20,
      },
    },
  }) as unknown as Project;
describe('creator render plans', () => {
  it('rejects unsupported caption effects instead of silently dropping them', async () => {
    const textClip = {
      ...clip,
      id: 'caption',
      type: 'text' as const,
      opacity: 0.5,
      caption: {
        id: 'caption',
        text: 'Visible text',
        startTime: 2,
        endTime: 5,
        style: 'classic' as const,
      },
    };
    await expect(
      creatorDeliveryService.buildPlan(makeProject([clip, textClip]), [asset]),
    ).rejects.toMatchObject({ clipId: 'caption' });
  });
  beforeEach(() => {
    Object.defineProperty(window, 'electron', {
      configurable: true,
      value: {
        readDesktopMedia: vi
          .fn()
          .mockResolvedValue({ bytes: new ArrayBuffer(2), mimeType: 'video/mp4' }),
      },
    });
  });
  it('canonicalizes nested keys without depending on insertion order', () => {
    expect(canonicalRenderJson({ z: [{ b: 2, a: 1 }], a: 3 })).toBe(
      canonicalRenderJson({ a: 3, z: [{ a: 1, b: 2 }] }),
    );
  });
  it('freezes trim, gaps, stored media identity, captions and style snapshot', async () => {
    const p = makeProject();
    p.creatorDelivery = defaultCreatorDelivery(p);
    const plan = await creatorDeliveryService.buildPlan(p, [asset]);
    expect(plan.durationSeconds).toBe(5);
    expect(plan.clips[0]).toMatchObject({
      mediaId: 'durable-key',
      startTime: 2,
      offset: 1,
      crop: { mode: 'fit' },
    });
    p.storyboard.timeline.clips[0].duration = 10;
    expect(plan.clips[0].duration).toBe(3);
    expect(plan.contentHash).toHaveLength(64);
  });
  it('rejects unsupported effects instead of silently omitting them', async () => {
    await expect(
      creatorDeliveryService.buildPlan(makeProject([{ ...clip, duration: 3, opacity: 0.5 }]), [
        asset,
      ]),
    ).rejects.toThrow('not supported');
  });
  it('rejects missing local media, excess duration and multiple visual tracks', async () => {
    await expect(
      creatorDeliveryService.buildPlan(makeProject([{ ...clip, duration: 3 }]), []),
    ).rejects.toThrow('Local media');
    await expect(
      creatorDeliveryService.buildPlan(makeProject([{ ...clip, duration: 61 }]), [asset]),
    ).rejects.toThrow('60 seconds');
    await expect(
      creatorDeliveryService.buildPlan(
        makeProject([
          { ...clip, duration: 3 },
          { ...clip, id: 'other', trackId: 'other' },
        ]),
        [asset],
      ),
    ).rejects.toThrow('one main');
  });
  it('rejects arbitrary volume automation and nonoverlapping dissolves with a clip identity', async () => {
    await expect(
      creatorDeliveryService.buildPlan(
        makeProject([
          {
            ...clip,
            volumeKeyframes: [
              { time: 0, value: 0 },
              { time: 1, value: 1 },
            ],
          },
        ]),
        [asset],
      ),
    ).rejects.toMatchObject({ clipId: 'clip' });
    await expect(
      creatorDeliveryService.buildPlan(
        makeProject([{ ...clip, transition: { type: 'dissolve', duration: 0.5 } }]),
        [asset],
      ),
    ).rejects.toThrow('Overlap this clip');
  });
  it('renders the selected production take instead of a newer unselected take', async () => {
    const run = {
      projectId: 'p',
      shots: [
        {
          id: 1,
          selectedTakeId: 'chosen',
          takes: [
            { id: 'chosen', localMediaKey: 'asset' },
            { id: 'later', localMediaKey: 'wrong' },
          ],
        },
      ],
    } as unknown as ProductionRun;
    const plan = await creatorDeliveryService.buildPlan(
      makeProject([{ ...clip, resourceId: 1 }]),
      [asset],
      run,
    );
    expect(plan.clips[0].mediaId).toBe('durable-key');
    const missing = { ...run, shots: [{ ...run.shots[0], selectedTakeId: 'missing' }] };
    await expect(
      creatorDeliveryService.buildPlan(makeProject([{ ...clip, resourceId: 1 }]), [asset], missing),
    ).rejects.toThrow('Selected take');
  });
  it('maps simple audio fades to a frozen render plan', async () => {
    const p = makeProject([
      clip,
      { ...clip, id: 'a', type: 'audio', trackId: 'a', resourceId: 'audio' },
    ]);
    p.storyboard.timeline.tracks.push({
      id: 'a',
      label: 'Audio',
      type: 'audio',
      trackType: 'music',
      zIndex: 1,
    });
    p.creatorDelivery = {
      ...defaultCreatorDelivery(p),
      audioFades: { a: { inSeconds: 0.5, outSeconds: 0.5 } },
    };
    const plan = await creatorDeliveryService.buildPlan(p, [
      asset,
      { ...asset, id: 'audio', type: 'audio', storageKey: 'audio-key' },
    ]);
    expect(plan.clips[1]).toMatchObject({
      fadeInSeconds: 0.5,
      fadeOutSeconds: 0.5,
      mediaId: 'audio-key',
    });
  });
});
