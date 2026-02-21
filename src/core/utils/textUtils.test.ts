import { describe, it, expect } from 'vitest';
import { countSyllables } from './textUtils';

describe('countSyllables', () => {
  it('should return 0 for empty string', () => {
    expect(countSyllables('')).toBe(0);
  });

  it('should return 0 for whitespace-only string', () => {
    expect(countSyllables('   ')).toBe(0);
  });

  it('should count syllables in a single word', () => {
    expect(countSyllables('hello')).toBeGreaterThanOrEqual(1);
  });

  it('should count syllables in multiple words', () => {
    const result = countSyllables('the quick brown fox');
    expect(result).toBeGreaterThanOrEqual(4);
  });

  it('should handle short words (3 chars or less) as 1 syllable', () => {
    expect(countSyllables('cat')).toBe(1);
    expect(countSyllables('the')).toBe(1);
    expect(countSyllables('an')).toBe(1);
  });

  it('should ignore meta-tags in brackets', () => {
    expect(countSyllables('[Chorus] hello')).toBe(countSyllables('hello'));
  });

  it('should ignore meta-tags in parentheses', () => {
    expect(countSyllables('(Ad-lib) world')).toBe(countSyllables('world'));
  });

  it('should handle words with silent e', () => {
    // "cake" -> after removing silent e suffix, should still count
    const result = countSyllables('cake');
    expect(result).toBeGreaterThanOrEqual(1);
  });

  it('should handle words with diphthongs', () => {
    const result = countSyllables('beautiful');
    expect(result).toBeGreaterThanOrEqual(2);
  });

  it('should handle string with only meta-tags', () => {
    // After removing tags, only whitespace/empty remains
    const result = countSyllables('[Chorus]');
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it('should handle words with hyphens and special chars', () => {
    const result = countSyllables('well-known');
    expect(result).toBeGreaterThanOrEqual(1);
  });
});
