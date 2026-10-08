import { describe, expect, it } from 'vitest';
import type { VideoPromptArtifactInput, VideoPromptVariant } from '@core/types/promptArtifact';
import {
  compileVideoPromptArtifact,
  compileMusicPromptArtifact,
  validatePromptArtifact,
  optimizeVideoPromptArtifact,
} from './promptStudioService';
import { editStudioVariant } from './promptStudioEditingService';
import { useSettingsStore } from '@core/store/useSettingsStore';

const input: VideoPromptArtifactInput = {
  idea: 'A courier walks',
  target: 'veo-api',
  mode: 'text-to-video',
  durationSeconds: 8,
  aspectRatio: '16:9',
};
describe('Studio validation', () => {
  it('marks broad manual model labels unconfirmed instead of claiming compatibility', () => {
    const check = compileVideoPromptArtifact({ ...input, target: 'runway-gen3' }).validation.find(
      (entry) => entry.id === 'target-compatibility',
    );
    expect(check).toMatchObject({
      status: 'warning',
      evidence: 'unknown',
      action: { field: 'target' },
      verifiedDate: '2026-10-08',
    });
  });
  it('uses provider request validation with field actions and documented sources', () => {
    const artifact = compileVideoPromptArtifact({
      ...input,
      mode: 'ingredients',
      durationSeconds: 4,
      referenceAssetIds: ['ref'],
    });
    expect(artifact.validation).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: 'blocked',
          evidence: 'documented',
          action: { field: 'durationSeconds' },
          sourceUrl: 'https://ai.google.dev/gemini-api/docs/veo',
        }),
      ]),
    );
    expect(
      compileVideoPromptArtifact({ ...input, durationSeconds: 10 }).validation.some(
        (entry) => entry.id === 'provider-duration-unsupported-durationSeconds',
      ),
    ).toBe(true);
  });
  it('never adjusts invalid settings and reports missing media', () => {
    const artifact = compileVideoPromptArtifact({
      ...input,
      mode: 'first-last-frames',
      durationSeconds: 10,
    });
    expect(artifact.input).toMatchObject({ mode: 'first-last-frames', durationSeconds: 10 });
    expect(
      artifact.validation.some(
        (entry) => entry.action?.field === 'firstFrameAssetId' && entry.status === 'blocked',
      ),
    ).toBe(true);
  });
  it('revalidates edited alternative text, accepts quoted dialogue and keeps copy fields consistent', () => {
    const artifact = compileVideoPromptArtifact({ ...input, dialogue: '"Welcome home"' });
    expect((artifact.primary as VideoPromptVariant).prompt).toContain('"Welcome home"');
    const edited = editStudioVariant(artifact, 2, { prompt: '"Welcome home", then leave' });
    expect(edited.validation.find((entry) => entry.id === 'variant-2-single-scene')).toMatchObject({
      status: 'warning',
      evidence: 'heuristic',
      action: { field: 'variant', variantIndex: 2 },
    });
    expect(validatePromptArtifact(edited)).toEqual([]);
    const empty = editStudioVariant(edited, 1, { prompt: '' });
    expect(empty.validation.find((entry) => entry.id === 'variant-1-text')?.status).toBe('blocked');
  });
  it.each([
    [{ lastFrameAssetId: 'last' }, 'firstFrameAssetId'],
    [{ firstFrameAssetId: 'first' }, 'lastFrameAssetId'],
  ] as const)(
    'opens the missing frame control for manual interpolation: %s',
    (references, field) => {
      const artifact = compileVideoPromptArtifact({
        ...input,
        target: 'flow-veo',
        mode: 'first-last-frames',
        ...references,
      });
      expect(artifact.validation.find((entry) => entry.id === 'mode')).toMatchObject({
        status: 'warning',
        action: { field },
      });
    },
  );
  it('treats motion writing guidance as warning rather than a hard constraint', () => {
    const artifact = editStudioVariant(
      compileVideoPromptArtifact({ ...input, target: 'kling', mode: 'image-to-video' }),
      1,
      { prompt: 'A warm evening portrait' },
    );
    expect(
      artifact.validation.find((entry) => entry.id === 'variant-1-motion-recipe'),
    ).toMatchObject({ status: 'warning', evidence: 'heuristic' });
  });
  it('evaluates every music variant after edits', () => {
    const artifact = editStudioVariant(
      compileMusicPromptArtifact({ topic: 'Home', language: 'Swedish' }),
      2,
      { styleOfMusic: 'x'.repeat(201), lyrics: '' },
    );
    expect(artifact.validation.find((entry) => entry.id === 'variant-2-style')?.status).toBe(
      'warning',
    );
    expect(artifact.validation.find((entry) => entry.id === 'variant-2-lyrics')).toMatchObject({
      status: 'blocked',
      action: { field: 'lyrics', variantIndex: 2 },
    });
    expect(artifact.validation.find((entry) => entry.id === 'variant-0-lyrics')?.status).toBe(
      'pass',
    );
  });
  it('preserves quoted optimizer output and revalidates the proposal', async () => {
    const original = useSettingsStore.getState().promptGenerationProvider;
    useSettingsStore.setState({ promptGenerationProvider: 'ollama' });
    try {
      const artifact = await optimizeVideoPromptArtifact(input, {
        optimizeVideo: async () => ({ prompt: 'A courier says "Hello", then waves' }),
        optimizeMusic: async () => ({}),
      });
      expect((artifact.primary as VideoPromptVariant).prompt).toContain('"Hello"');
      expect(
        artifact.validation.find((entry) => entry.id === 'variant-0-single-scene')?.status,
      ).toBe('warning');
    } finally {
      useSettingsStore.setState({ promptGenerationProvider: original });
    }
  });
});
