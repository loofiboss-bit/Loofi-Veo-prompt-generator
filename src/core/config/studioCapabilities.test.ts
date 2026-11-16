import { describe, expect, it } from 'vitest';
import type { VideoPromptArtifactInput } from '@core/types';
import {
  LAB_CAPABILITIES,
  STUDIO_CAPABILITIES,
  getStudioExecutionContract,
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
    ['flow-veo', 'vertex-veo-ga', false],
    ['omni-flash', 'gemini-omni', false],
    ['kling', 'external-manual-slot', true],
    ['runway-gen3', 'external-manual-slot', true],
    ['luma-ray', 'external-manual-slot', true],
    ['wan-video', 'external-manual-slot', true],
    ['minimax-hailuo', 'external-manual-slot', true],
  ] as const)(
    'unblocks %s for production handoff under %s contract',
    (target, expectedMode, expectedManualIngestion) => {
      const sample: VideoPromptArtifactInput = {
        ...input,
        target,
        durationSeconds: target === 'wan-video' ? 30 : target === 'luma-ray' ? 5 : 8,
      };
      expect(getStudioExecutionContract(sample)).toMatchObject({
        executionMode: expectedMode,
        target,
        requiresManualMediaIngestion: expectedManualIngestion,
      });
      expect(studioGenerationBlocker(sample)).toBeNull();
      const request = studioVideoRequest(sample);
      expect(request.executionMode).toBe(expectedMode);
      expect(request.target).toBe(target);
    },
  );

  it('keeps Sora and retired Veo Preview blocked for handoff', () => {
    expect(STUDIO_CAPABILITIES.suno.handoff).toBe('manual');
    expect(studioGenerationBlocker({ ...input, target: 'sora' })).toMatch(/retired/i);
    expect(() => studioVideoRequest({ ...input, target: 'sora' })).toThrow(/retired/i);
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
