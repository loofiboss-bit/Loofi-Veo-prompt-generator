import { describe, expect, it } from 'vitest';
import type { VideoPromptArtifactInput } from '@core/types';
import {
  LAB_CAPABILITIES,
  STUDIO_CAPABILITIES,
  studioGenerationBlocker,
  studioVideoRequest,
  studioVideoRequestIssues,
} from './studioCapabilities';

const input: VideoPromptArtifactInput = {
  idea: 'A courier walks down a street',
  target: 'flow-veo',
  mode: 'text-to-video',
  durationSeconds: 8,
  aspectRatio: '16:9',
};

describe('Studio execution capabilities', () => {
  it.each([
    'flow-veo',
    'omni-flash',
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
    'validates supported duration %s and request settings for active profiles',
    (durationSeconds) => {
      expect(
        studioVideoRequestIssues({
          ...input,
          durationSeconds,
          aspectRatio: '9:16',
          negativePrompt: 'no captions',
        }),
      ).toEqual([]);
    },
  );

  it('rejects unsupported durations and retired targets before generation', () => {
    expect(studioVideoRequestIssues({ ...input, durationSeconds: 10 })[0]?.message).toMatch(
      /4, 6, 8/,
    );
    expect(studioVideoRequestIssues({ ...input, target: 'veo-api' })[0]?.message).toMatch(
      /retired/i,
    );
    expect(studioGenerationBlocker({ ...input, target: 'veo-api' })).toMatch(/shut down/i);
    expect(() => studioVideoRequest({ ...input, target: 'veo-api' })).toThrow(/shut down/i);
  });

  it('validates mode-specific durations for Gemini Omni 1.2 Flash', () => {
    expect(
      studioVideoRequestIssues({
        ...input,
        target: 'omni-flash',
        mode: 'text-to-video',
        durationSeconds: 15,
      }),
    ).toEqual([]);
    expect(
      studioVideoRequestIssues({
        ...input,
        target: 'omni-flash',
        mode: 'extend',
        durationSeconds: 12,
      })[0]?.message,
    ).toMatch(/3, 4, 5, 6, 7, 8, 9, 10/);
  });

  it('does not expose unqualified generation, Live, LAN, Foley or FCPXML as runnable', () => {
    for (const id of ['comfy', 'live', 'lan', 'foley', 'fcpxml']) {
      expect(LAB_CAPABILITIES.find((item) => item.id === id)?.runnable).toBe(false);
    }
    expect(LAB_CAPABILITIES.find((item) => item.id === 'spatial')?.detail).toMatch(/preview/);
  });
});
