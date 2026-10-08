import { describe, expect, it } from 'vitest';
import type { VideoPromptArtifactInput } from '@core/types';
import {
  LAB_CAPABILITIES,
  STUDIO_CAPABILITIES,
  studioGenerationBlocker,
  studioVideoRequest,
} from './studioCapabilities';

const input: VideoPromptArtifactInput = {
  idea: 'A courier walks down a street',
  target: 'veo-api',
  mode: 'text-to-video',
  durationSeconds: 8,
  aspectRatio: '16:9',
};

describe('Studio execution capabilities', () => {
  it.each([
    'flow-veo',
    'kling',
    'runway-gen3',
    'sora',
    'luma-ray',
    'wan-video',
    'minimax-hailuo',
    'suno',
  ] as const)('keeps %s manual and prevents an internal provider request', (target) => {
    expect(STUDIO_CAPABILITIES[target].handoff).toBe('manual');
    if (target !== 'suno')
      expect(() => studioVideoRequest({ ...input, target })).toThrow(/manual copy/);
  });
  it.each([4, 6, 8] as const)(
    'preserves supported duration %s and request settings',
    (durationSeconds) => {
      expect(
        studioVideoRequest({
          ...input,
          durationSeconds,
          aspectRatio: '9:16',
          negativePrompt: 'no captions',
        }),
      ).toMatchObject({
        durationSeconds,
        aspectRatio: '9:16',
        negativePrompt: 'no captions',
        mode: 'text-to-video',
      });
    },
  );
  it('rejects ten seconds and missing image references before generation', () => {
    expect(studioGenerationBlocker({ ...input, durationSeconds: 10 })).toMatch(/4, 6 or 8/);
    expect(studioGenerationBlocker({ ...input, mode: 'image-to-video' })).toMatch(/first frame/);
    expect(
      studioGenerationBlocker({ ...input, mode: 'first-last-frames', firstFrameAssetId: 'first' }),
    ).toMatch(/both first and last/);
  });
  it('retains real first/last frame IDs in interpolation requests', () => {
    expect(
      studioVideoRequest({
        ...input,
        mode: 'first-last-frames',
        firstFrameAssetId: 'first',
        lastFrameAssetId: 'last',
      }),
    ).toMatchObject({
      mode: 'interpolation',
      firstFrameAssetId: 'first',
      lastFrameAssetId: 'last',
      durationSeconds: 8,
    });
  });
  it('retains ingredient references and requires their eight-second duration', () => {
    expect(
      studioVideoRequest({ ...input, mode: 'ingredients', referenceAssetIds: ['ref-1', 'ref-2'] }),
    ).toMatchObject({ mode: 'reference-images', referenceAssetIds: ['ref-1', 'ref-2'] });
    expect(
      studioGenerationBlocker({
        ...input,
        mode: 'ingredients',
        referenceAssetIds: ['ref-1'],
        durationSeconds: 4,
      }),
    ).toMatch(/eight-second/);
  });
  it('does not expose unqualified generation, Live, LAN, Foley or FCPXML as runnable', () => {
    for (const id of ['comfy', 'live', 'lan', 'foley', 'fcpxml']) {
      expect(LAB_CAPABILITIES.find((item) => item.id === id)?.runnable).toBe(false);
    }
    expect(LAB_CAPABILITIES.find((item) => item.id === 'spatial')?.detail).toMatch(/preview/);
  });
});
