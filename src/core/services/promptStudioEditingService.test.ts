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
  it('rejects a full-pack response that omits sections instead of moving locked blocks', () => {
    const proposed = '[Verse 1]\nChanged\n[Chorus]\nWrong chorus\n';
    expect(() => preserveLockedLyricSections(lyrics, proposed, ['[Chorus]', '[Verse 2]'])).toThrow(
      /section order or count/,
    );
  });
  it('never invokes AI for a locked section', async () => {
    const artifact = compileMusicPromptArtifact({ topic: 'Home', language: 'Swedish', lyrics });
    await expect(
      rewriteStudioLyricSection(artifact, '[Chorus]', 'Rewrite', ['[Chorus]']),
    ).rejects.toThrow(/locked/);
    expect(mocks.optimizeMusic).not.toHaveBeenCalled();
  });

  it('passes the active cancellation signal through targeted lyric rewriting', async () => {
    const artifact = compileMusicPromptArtifact({ topic: 'Home', language: 'Swedish', lyrics });
    const currentLyrics = (artifact.primary as MusicPromptVariant).lyrics;
    mocks.optimizeMusic.mockResolvedValue(artifact);
    const controller = new AbortController();
    await rewriteStudioLyricSection(artifact, '[Chorus]', 'Warmer', [], 0, controller.signal);
    expect(mocks.optimizeMusic).toHaveBeenCalledWith(
      expect.objectContaining({ lyrics: currentLyrics }),
      undefined,
      controller.signal,
    );
  });

  it('preserves distinct repeated lyric sections in order without duplication (F5)', () => {
    const multiChorusLyrics =
      '[Verse 1]\nIntro verse\n\n[Chorus]\nFirst unique chorus\n\n[Verse 2]\nSecond verse\n\n[Chorus]\nSecond unique chorus\n';
    const proposed =
      '[Verse 1]\nAI verse 1\n\n[Chorus]\nAI chorus 1\n\n[Verse 2]\nAI verse 2\n\n[Chorus]\nAI chorus 2\n';

    // Lock both choruses
    const result = preserveLockedLyricSections(multiChorusLyrics, proposed, ['[Chorus]']);

    // Should preserve first unique chorus in first slot, second in second slot, without extra chorus appended
    expect(result).toContain('[Chorus]\nFirst unique chorus\n\n');
    expect(result).toContain('[Chorus]\nSecond unique chorus\n');
    expect(result.match(/\[Chorus\]/g)?.length).toBe(2);
    expect(result.indexOf('First unique chorus')).toBeLessThan(
      result.indexOf('Second unique chorus'),
    );
  });
});

describe('occurrence-aware lyric editing', () => {
  const repeated =
    '[Verse]\nOpening\n\n[Chorus]\nIdentical hook  \n\n[Verse]\nMiddle\n\n[Chorus]\nIdentical hook  \n';
  it('replaces the second occurrence from a single-section response without touching other bytes', () => {
    const result = replaceStudioLyricSection(repeated, '[Chorus]\nNew second hook', '[Chorus] #2', [
      '[Chorus] #1',
    ]);
    expect(result).toBe(
      repeated.slice(0, repeated.lastIndexOf('[Chorus]')) + '[Chorus]\nNew second hook\n',
    );
  });
  it('selects the matching second occurrence from a complete response', () => {
    const proposed = repeated
      .replace('Opening', 'AI opening')
      .replaceAll('Identical hook  ', 'AI hook');
    const result = replaceStudioLyricSection(repeated, proposed, '[Chorus] #2', []);
    expect(result).toBe(
      repeated.slice(0, repeated.lastIndexOf('[Chorus]')) + '[Chorus]\nAI hook\n',
    );
  });
  it('rejects ambiguous bare selectors and reordered or missing full-pack sections', () => {
    expect(() => replaceStudioLyricSection(repeated, '[Chorus]\nNew', '[Chorus]', [])).toThrow(
      /specific occurrence/,
    );
    expect(() =>
      preserveLockedLyricSections(repeated, '[Chorus]\nNew\n[Verse]\nChanged', ['[Chorus] #2']),
    ).toThrow(/order or count/);
  });
  it('preserves identical locked blocks as distinct occurrences', () => {
    const result = preserveLockedLyricSections(
      repeated,
      repeated.replaceAll('Identical hook  ', 'AI changed'),
      ['[Chorus]'],
    );
    expect(result).toBe(repeated);
    expect(result.match(/Identical hook/g)).toHaveLength(2);
  });
  it('checks an indexed legacy whole-heading lock before invoking AI', async () => {
    const artifact = compileMusicPromptArtifact({
      topic: 'Home',
      language: 'English',
      lyrics: repeated,
    });
    mocks.optimizeMusic.mockClear();
    await expect(
      rewriteStudioLyricSection(artifact, '[Chorus] #2', 'Change', ['Chorus']),
    ).rejects.toThrow(/locked/);
    expect(mocks.optimizeMusic).not.toHaveBeenCalled();
  });
});
