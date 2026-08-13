import { describe, expect, it } from 'vitest';
import {
  adaptSunoPackToMusicInput,
  adaptVideoHistoryEntry,
  compileSunoPackArtifact,
  compileVideoHistoryArtifact,
  compileMusicPromptArtifact,
  compileVideoPromptArtifact,
  getLyricSections,
  optimizeVideoPromptArtifact,
  regenerateLyrics,
  shortenLyrics,
  updateLyricsSection,
  validatePromptArtifact,
} from './promptStudioService';
import type { HistoryEntry, MusicPromptVariant, VideoPromptVariant } from '@core/types';

describe('promptStudioService', () => {
  it.each([
    ['text-to-video', 'one focused, continuous scene'],
    ['image-to-video', 'Describe motion only'],
    ['first-last-frames', 'start frame (opening frame)'],
    ['ingredients', 'Reference roles: hero=character, prop=object'],
    ['extend', 'Continue seamlessly from the previous clip'],
  ] as const)('compiles the %s recipe', (mode, expected) => {
    const artifact = compileVideoPromptArtifact({
      idea: 'A courier crosses a rainy neon street',
      mode,
      target: 'flow-veo',
      aspectRatio: '16:9',
      durationSeconds: 8,
      subject: 'A determined courier in a red raincoat',
      action: 'walks toward a flickering train entrance',
      environment: 'rain-slicked street at blue hour',
      camera: 'slow dolly forward from a low angle',
      lighting: 'cool cyan practicals with warm window spill',
      style: 'cinematic neo-noir',
      audio: 'rain, distant traffic, measured footsteps',
      dialogue: 'I am still on time.',
      startFrame: 'opening frame',
      endFrame: 'train doors closing',
      previousClip: 'the courier turns the corner',
      referenceRoles: 'hero=character, prop=object',
    });

    expect(artifact.schemaVersion).toBe(1);
    expect(artifact.alternatives).toHaveLength(2);
    expect((artifact.primary as VideoPromptVariant).prompt).toContain(expected);
    expect((artifact.primary as VideoPromptVariant).copyPrompt).toBe(
      (artifact.primary as VideoPromptVariant).prompt,
    );
    expect((artifact.primary as VideoPromptVariant).copyAll).toContain('Negative prompt:');
    expect(validatePromptArtifact(artifact)).toEqual([]);
  });

  it('formats dialogue without quotation marks', () => {
    const artifact = compileVideoPromptArtifact({
      idea: 'A quiet conversation in a studio',
      mode: 'text-to-video',
      target: 'veo-api',
      aspectRatio: '16:9',
      durationSeconds: 6,
      dialogue: 'My name is Clara.',
    });

    expect((artifact.primary as VideoPromptVariant).prompt).toContain(
      'the speaker says: My name is Clara.',
    );
    expect((artifact.primary as VideoPromptVariant).prompt).not.toContain('"');
    expect(artifact.validation.find((check) => check.id === 'dialogue')?.status).toBe('pass');
  });

  it('creates exactly three Suno-ready variants and section tags', () => {
    const artifact = compileMusicPromptArtifact({
      topic: 'A midnight train heading toward home',
      language: 'Swedish',
      genre: 'synthwave pop',
      mood: 'hopeful and nocturnal',
      voice: 'Female',
      tempo: '112 BPM',
      instruments: 'analog synth, gated drums',
    });

    expect(artifact.kind).toBe('music');
    expect(artifact.alternatives).toHaveLength(2);
    const primary = artifact.primary as MusicPromptVariant;
    expect(primary.styleOfMusic.length).toBeLessThanOrEqual(200);
    expect(primary.lyrics).toContain('[Chorus]');
    expect(primary.lyrics).toContain('Vi fortsätter');
    expect(primary.productionNotes.join(' ')).toContain('Swedish');
    expect(primary.copyStyle).toBe(primary.styleOfMusic);
    expect(primary.copyLyrics).toBe(primary.lyrics);
    expect(validatePromptArtifact(artifact)).toEqual([]);
  });

  it('keeps locked lyric sections unchanged', () => {
    const lyrics = '[Verse]\nOld verse\n\n[Chorus]\nKeep this hook';
    expect(updateLyricsSection(lyrics, '[Verse]', 'New verse', ['[Chorus]'])).toContain(
      'New verse',
    );
    expect(updateLyricsSection(lyrics, '[Chorus]', 'New hook', ['[Chorus]'])).toContain(
      'Keep this hook',
    );
    expect(getLyricSections(lyrics)).toEqual(['[Verse]', '[Chorus]']);
  });

  it('shortens and regenerates only unlocked lyric sections', () => {
    const lyrics =
      '[Verse]\nLong line one\nLong line two\nLong line three\n\n[Chorus]\nKeep this hook';
    const shortened = shortenLyrics(lyrics, ['[Chorus]']);
    expect(shortened).toContain('[Chorus]\nKeep this hook');
    expect(shortened).not.toContain('Long line two\nLong line three');

    const regenerated = regenerateLyrics(lyrics, 'a midnight train', 'Swedish', ['[Chorus]']);
    expect(regenerated).toContain('[Chorus]\nKeep this hook');
    expect(regenerated).toContain('En stilla puls blir till ett ljus');
  });

  it('normalizes legacy history and Suno packs through compatibility adapters', () => {
    const history = {
      id: 'history-1',
      timestamp: 1,
      prompt: 'Legacy idea',
      params: {
        idea: '  Legacy idea  ',
        environment: '  studio  ',
        characterActions: '  turns  ',
        cameraMovement: '  dolly  ',
        lightingStyle: '  soft light  ',
        artStyle: '  film  ',
        voiceOver: '  hello  ',
        ambientSound: '  room tone  ',
        negativePrompt: '  blur  ',
        aspectRatio: '9:16',
        targetModel: 'veo-api',
        flowVeoOutputMode: 'single-prompt',
      },
    } as unknown as HistoryEntry;
    expect(adaptVideoHistoryEntry(history)).toMatchObject({
      idea: 'Legacy idea',
      target: 'veo-api',
      aspectRatio: '9:16',
      environment: 'studio',
    });
    expect(compileVideoHistoryArtifact(history).alternatives).toHaveLength(2);

    const pack = {
      title: 'Pack title',
      style: 'dream pop',
      lyrics: '[Verse]\nPack lyrics',
      explanation: 'A concise pack',
    };
    expect(adaptSunoPackToMusicInput(pack).lyrics).toBe(pack.lyrics);
    expect(compileSunoPackArtifact(pack).kind).toBe('music');
  });

  it('rejects malformed optimizer JSON instead of silently replacing the local draft', async () => {
    await expect(
      optimizeVideoPromptArtifact(
        {
          idea: 'A focused scene',
          mode: 'text-to-video',
          target: 'flow-veo',
          aspectRatio: '16:9',
          durationSeconds: 8,
        },
        {
          optimizeVideo: async () => '{not-json',
          optimizeMusic: async () => ({}),
        },
      ),
    ).rejects.toThrow(/malformed JSON/i);
  });

  it('updates explicit copy fields when an optimizer returns a valid prompt object', async () => {
    const artifact = await optimizeVideoPromptArtifact(
      {
        idea: 'A focused scene',
        mode: 'text-to-video',
        target: 'flow-veo',
        aspectRatio: '16:9',
        durationSeconds: 8,
      },
      {
        optimizeVideo: async () => ({ prompt: 'A refined scene with a slow camera move.' }),
        optimizeMusic: async () => ({}),
      },
    );
    expect((artifact.primary as VideoPromptVariant).copyPrompt).toBe(
      (artifact.primary as VideoPromptVariant).prompt,
    );
    expect(validatePromptArtifact(artifact)).toEqual([]);
  });
});
