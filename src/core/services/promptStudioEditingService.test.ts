import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MusicPromptVariant, VideoPromptVariant } from '@core/types';
import {
  compileMusicPromptArtifact,
  compileVideoPromptArtifact,
  validatePromptArtifact,
} from './promptStudioService';
import {
  editStudioVariant,
  preserveLockedLyricSections,
  replaceStudioLyricSection,
  rewriteStudioLyricSection,
} from './promptStudioEditingService';
const mocks = vi.hoisted(() => ({ optimizeMusic: vi.fn() }));
vi.mock('./promptStudioService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./promptStudioService')>()),
  optimizeMusicPromptArtifact: mocks.optimizeMusic,
}));
const lyrics =
  '[Verse 1]\nÅter hemma  \n\n[Chorus]\nMin gamla refräng\n\n[Verse 2]\nLås mig exakt!\n';

describe('Studio variant editing', () => {
  beforeEach(() => mocks.optimizeMusic.mockReset());
  it('synchronizes video copy fields and preserves the other two variants', () => {
    const artifact = compileVideoPromptArtifact({
      idea: 'Night street',
      target: 'kling',
      mode: 'text-to-video',
      durationSeconds: 8,
      aspectRatio: '16:9',
    });
    const edited = editStudioVariant(artifact, 1, {
      prompt: 'Edited cinematic text',
      negativePrompt: 'no signage',
    });
    expect(edited.primary).toBe(artifact.primary);
    expect(edited.alternatives[1]).toBe(artifact.alternatives[1]);
    expect(edited.alternatives[0]).toMatchObject({
      prompt: 'Edited cinematic text',
      copyPrompt: 'Edited cinematic text',
      negativePrompt: 'no signage',
      copyNegativePrompt: 'no signage',
    });
    expect((edited.alternatives[0] as VideoPromptVariant).copyAll).toContain(
      'Negative prompt: no signage',
    );
    expect(artifact.provenance.source).toBe('compiler');
    expect(edited.provenance.source).toBe('editor');
    expect(validatePromptArtifact(edited)).toEqual([]);
  });
  it('synchronizes selected music style and lyrics copy text without changing other variants', () => {
    const artifact = compileMusicPromptArtifact({ topic: 'Home', language: 'Swedish', lyrics });
    const edited = editStudioVariant(artifact, 2, {
      styleOfMusic: 'Nordic folk',
      lyrics: '[Chorus]\nHemma',
    });
    expect(edited.primary).toBe(artifact.primary);
    expect(edited.alternatives[0]).toBe(artifact.alternatives[0]);
    expect(edited.alternatives[1]).toMatchObject({
      copyStyle: 'Nordic folk',
      copyLyrics: '[Chorus]\nHemma',
    });
    expect((edited.alternatives[1] as MusicPromptVariant).copyAll).toContain(
      'Style of Music:\nNordic folk',
    );
    expect((edited.alternatives[1] as MusicPromptVariant).copyAll).toContain(
      'Lyrics:\n[Chorus]\nHemma',
    );
  });
  it('keeps every non-selected and locked lyric section byte-exact', () => {
    const proposed =
      '[Verse 1]\nWrong changed verse\n[Chorus]\nMin nya refräng\n\n[Verse 2]\nWrong changed locked verse';
    expect(replaceStudioLyricSection(lyrics, proposed, '[Chorus]', ['[Verse 2]'])).toBe(
      '[Verse 1]\nÅter hemma  \n\n[Chorus]\nMin nya refräng\n\n[Verse 2]\nLås mig exakt!\n',
    );
    expect(() => replaceStudioLyricSection(lyrics, proposed, '[Verse 2]', ['[Verse 2]'])).toThrow(
      /locked/,
    );
    expect(() =>
      replaceStudioLyricSection(lyrics, '[Verse 1]\nOnly verse', '[Chorus]', []),
    ).toThrow(/omitted/);
  });
  it('asks AI to keep the requested language and applies only the selected section', async () => {
    const artifact = editStudioVariant(
      compileMusicPromptArtifact({ topic: 'Home', language: 'Swedish', lyrics }),
      0,
      { lyrics },
    );
    const proposed = compileMusicPromptArtifact({
      topic: 'Home',
      language: 'Swedish',
      lyrics: '[Verse 1]\nWrong\n[Chorus]\nNy refräng\n\n[Verse 2]\nWrong',
    });
    mocks.optimizeMusic.mockResolvedValue(proposed);
    const result = await rewriteStudioLyricSection(artifact, '[Chorus]', 'Make the hook warmer', [
      '[Verse 2]',
    ]);
    expect(mocks.optimizeMusic).toHaveBeenCalledWith(
      expect.objectContaining({
        language: 'Swedish',
        lyrics,
        mixNotes: expect.stringContaining('Keep the requested lyrics language'),
      }),
    );
    expect((result.primary as MusicPromptVariant).lyrics).toContain('[Verse 1]\nÅter hemma  \n\n');
    expect((result.primary as MusicPromptVariant).lyrics).toContain('[Verse 2]\nLås mig exakt!\n');
    expect((result.primary as MusicPromptVariant).copyLyrics).toBe(
      (result.primary as MusicPromptVariant).lyrics,
    );
  });
  it('rewrites the selected alternative and leaves the primary variant unchanged', async () => {
    const artifact = editStudioVariant(
      compileMusicPromptArtifact({ topic: 'Home', language: 'Swedish', lyrics }),
      1,
      { lyrics: '[Verse 1]\nAlternativ vers\n[Chorus]\nAlternativ refräng\n' },
    );
    mocks.optimizeMusic.mockResolvedValue(
      compileMusicPromptArtifact({
        topic: 'Home',
        language: 'Swedish',
        lyrics: '[Chorus]\nNy alternativ refräng\n',
      }),
    );
    const result = await rewriteStudioLyricSection(artifact, '[Chorus]', 'Warmer', [], 1);
    expect(result.primary).toBe(artifact.primary);
    expect((result.alternatives[0] as MusicPromptVariant).lyrics).toContain('Alternativ vers');
    expect((result.alternatives[0] as MusicPromptVariant).lyrics).toContain(
      'Ny alternativ refräng',
    );
  });
  it('retains locked blocks in full-pack optimization even when AI omits them', () => {
    const proposed = '[Verse 1]\nChanged\n[Chorus]\nWrong chorus\n';
    const result = preserveLockedLyricSections(lyrics, proposed, ['[Chorus]', '[Verse 2]']);
    expect(result).toContain('[Verse 1]\nChanged');
    expect(result).toContain('[Chorus]\nMin gamla refräng\n\n');
    expect(result).toContain('[Verse 2]\nLås mig exakt!\n');
    expect(result).not.toContain('Wrong chorus');
  });
  it('never invokes AI for a locked section', async () => {
    const artifact = compileMusicPromptArtifact({ topic: 'Home', language: 'Swedish', lyrics });
    await expect(
      rewriteStudioLyricSection(artifact, '[Chorus]', 'Rewrite', ['[Chorus]']),
    ).rejects.toThrow(/locked/);
    expect(mocks.optimizeMusic).not.toHaveBeenCalled();
  });
});
