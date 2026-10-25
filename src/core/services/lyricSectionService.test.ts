import { describe, expect, it } from 'vitest';
import {
  isLyricSectionLocked,
  parseLyricSections,
  resolveLyricSection,
  setLyricSectionLocked,
} from './lyricSectionService';
import {
  getLyricSections,
  regenerateLyrics,
  shortenLyrics,
  updateLyricsSection,
} from './promptStudioService';

const lyrics =
  'Preamble stays  \n[Chorus]\nFirst line  \nAnother line\n\n[Verse]\nMiddle\n\n[Chorus]\nSecond line  \nNext line\n';

describe('shared lyric section identity', () => {
  it('assigns stable occurrence IDs and retains raw whitespace and preamble offsets', () => {
    const sections = parseLyricSections(lyrics);
    expect(sections.map((section) => section.id)).toEqual([
      '[Chorus] #1',
      '[Verse] #1',
      '[Chorus] #2',
    ]);
    expect(getLyricSections(lyrics)).toEqual(['[Chorus] #1', '[Verse]', '[Chorus] #2']);
    expect(sections[0].raw).toBe('[Chorus]\nFirst line  \nAnother line\n\n');
    expect(lyrics.slice(0, sections[0].start)).toBe('Preamble stays  \n');
    expect(resolveLyricSection(lyrics, '[Chorus] #2')?.content).toContain('Second line');
  });
  it('understands bare legacy locks and can unlock only one repeated occurrence', () => {
    const sections = parseLyricSections(lyrics);
    expect(sections.filter((section) => isLyricSectionLocked(section, ['chorus']))).toHaveLength(2);
    const locks = setLyricSectionLocked(lyrics, '[Chorus] #2', ['[Chorus]'], false);
    expect(locks).toEqual(['[Chorus] #1']);
    expect(isLyricSectionLocked(sections[2], locks)).toBe(false);
  });
  it('preserves the exact locked occurrence in local shorten/regenerate and manual section updates', () => {
    const before = parseLyricSections(lyrics)[2].raw;
    for (const result of [
      shortenLyrics(lyrics, ['[Chorus] #2']),
      regenerateLyrics(lyrics, 'Home', 'English', ['[Chorus] #2']),
    ]) {
      expect(parseLyricSections(result)[2].raw).toBe(before);
      expect(result).toMatch(/^Preamble stays  \n/);
    }
    expect(updateLyricsSection(lyrics, '[Chorus] #2', 'Wrong', ['[Chorus] #2'])).toBe(lyrics);
    const updated = updateLyricsSection(lyrics, '[Chorus] #2', 'New ending');
    expect(updated).toContain('[Chorus]\nNew ending\n');
    expect(parseLyricSections(updated)[0].raw).toBe(parseLyricSections(lyrics)[0].raw);
  });
});
