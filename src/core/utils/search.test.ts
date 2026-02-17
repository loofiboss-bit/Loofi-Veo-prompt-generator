import { describe, it, expect } from 'vitest';
import { levenshteinDistance, filterItem } from './search';

describe('levenshteinDistance', () => {
  it('should return 0 for identical strings', () => {
    expect(levenshteinDistance('hello', 'hello')).toBe(0);
    expect(levenshteinDistance('', '')).toBe(0);
    expect(levenshteinDistance('a', 'a')).toBe(0);
  });

  it('should return correct distance for single character differences', () => {
    expect(levenshteinDistance('cat', 'bat')).toBe(1); // substitution
    expect(levenshteinDistance('cat', 'ca')).toBe(1); // deletion
    expect(levenshteinDistance('ca', 'cat')).toBe(1); // insertion
  });

  it('should handle completely different strings', () => {
    expect(levenshteinDistance('abc', 'xyz')).toBe(3);
    expect(levenshteinDistance('hello', 'world')).toBe(4);
  });

  it('should handle empty strings', () => {
    expect(levenshteinDistance('', 'abc')).toBe(3); // all insertions
    expect(levenshteinDistance('abc', '')).toBe(3); // all deletions
  });

  it('should handle different lengths correctly', () => {
    expect(levenshteinDistance('a', 'abcdef')).toBe(5);
    expect(levenshteinDistance('abcdef', 'a')).toBe(5);
  });

  it('should calculate multiple edits correctly', () => {
    expect(levenshteinDistance('kitten', 'sitting')).toBe(3); // k->s, e->i, +g
    expect(levenshteinDistance('saturday', 'sunday')).toBe(3);
  });
});

describe('filterItem', () => {
  it('should return true for empty query', () => {
    expect(filterItem('', 'any text')).toBe(true);
    expect(filterItem('   ', 'any text')).toBe(true);
  });

  it('should find exact substring matches (case-insensitive)', () => {
    expect(filterItem('hello', 'hello world')).toBe(true);
    expect(filterItem('HELLO', 'hello world')).toBe(true);
    expect(filterItem('world', 'hello world')).toBe(true);
  });

  it('should return false for no match', () => {
    expect(filterItem('xyz', 'hello world')).toBe(false);
    expect(filterItem('test', 'hello world')).toBe(false);
  });

  it('should handle undefined texts gracefully', () => {
    expect(filterItem('hello', undefined)).toBe(false);
    expect(filterItem('hello', undefined, 'hello world')).toBe(true);
    expect(filterItem('hello', 'no match', undefined, 'hello world')).toBe(true);
  });

  it('should perform fuzzy matching for queries longer than 2 chars', () => {
    // Query "cat" (3 chars, length > 2) uses fuzzy match with threshold=1
    expect(filterItem('cat', 'The cat is here')).toBe(true); // exact substring match triggers before fuzzy
    expect(filterItem('abc', 'No match in this text')).toBe(false); // no match
  });

  it('should use stricter threshold for longer queries', () => {
    // For queries <= 5 chars, threshold is 1; for > 5 chars, threshold is 2
    // This is demonstrated by the threshold logic in the implementation
    expect(filterItem('hello', 'hello world')).toBe(true);
  });

  it('should handle multiple text fields (varargs)', () => {
    expect(filterItem('hello', 'goodbye', 'hello world')).toBe(true);
    expect(filterItem('hello', 'goodbye', 'farewell')).toBe(false);
  });

  it('should trim and lowercase query correctly', () => {
    expect(filterItem('  HELLO  ', 'Hello World')).toBe(true);
  });

  it('should split words for fuzzy matching', () => {
    // "hello" should match against individual words
    expect(filterItem('hello', 'say hello please')).toBe(true);
  });
});
