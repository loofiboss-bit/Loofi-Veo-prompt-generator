import { describe, it, expect } from 'vitest';
import { parseSemver, compareSemver, satisfiesSemver } from './semver';

describe('parseSemver', () => {
  it('should parse basic semver', () => {
    const result = parseSemver('1.6.0');
    expect(result).toEqual({ major: 1, minor: 6, patch: 0, prerelease: undefined });
  });

  it('should parse semver with prerelease', () => {
    const result = parseSemver('1.6.0-beta.3');
    expect(result).toEqual({ major: 1, minor: 6, patch: 0, prerelease: 'beta.3' });
  });

  it('should strip leading v', () => {
    const result = parseSemver('v2.0.0');
    expect(result).toEqual({ major: 2, minor: 0, patch: 0, prerelease: undefined });
  });

  it('should handle partial versions', () => {
    const result = parseSemver('1.0');
    expect(result).toEqual({ major: 1, minor: 0, patch: 0, prerelease: undefined });
  });
});

describe('compareSemver', () => {
  it('should return 0 for equal versions', () => {
    expect(compareSemver('1.6.0', '1.6.0')).toBe(0);
  });

  it('should compare major versions', () => {
    expect(compareSemver('2.0.0', '1.0.0')).toBe(1);
    expect(compareSemver('1.0.0', '2.0.0')).toBe(-1);
  });

  it('should compare minor versions', () => {
    expect(compareSemver('1.7.0', '1.6.0')).toBe(1);
    expect(compareSemver('1.5.0', '1.6.0')).toBe(-1);
  });

  it('should compare patch versions', () => {
    expect(compareSemver('1.6.1', '1.6.0')).toBe(1);
    expect(compareSemver('1.6.0', '1.6.1')).toBe(-1);
  });

  it('should rank stable above prerelease', () => {
    expect(compareSemver('1.6.0', '1.6.0-beta.1')).toBe(1);
    expect(compareSemver('1.6.0-beta.1', '1.6.0')).toBe(-1);
  });

  it('should compare prerelease strings lexicographically', () => {
    expect(compareSemver('1.6.0-beta.2', '1.6.0-beta.1')).toBe(1);
    expect(compareSemver('1.6.0-alpha.1', '1.6.0-beta.1')).toBe(-1);
  });
});

describe('satisfiesSemver', () => {
  it('should match exact version', () => {
    expect(satisfiesSemver('1.6.0', '1.6.0')).toBe(true);
    expect(satisfiesSemver('1.7.0', '1.6.0')).toBe(false);
  });

  it('should handle >= range', () => {
    expect(satisfiesSemver('1.7.0', '>=1.6.0')).toBe(true);
    expect(satisfiesSemver('1.6.0', '>=1.6.0')).toBe(true);
    expect(satisfiesSemver('1.5.0', '>=1.6.0')).toBe(false);
  });

  it('should handle ^ (caret) range — same major', () => {
    expect(satisfiesSemver('1.7.0', '^1.6.0')).toBe(true);
    expect(satisfiesSemver('1.6.1', '^1.6.0')).toBe(true);
    expect(satisfiesSemver('1.6.0', '^1.6.0')).toBe(true);
    expect(satisfiesSemver('1.5.0', '^1.6.0')).toBe(false);
    expect(satisfiesSemver('2.0.0', '^1.6.0')).toBe(false);
  });

  it('should handle ~ (tilde) range — same major.minor', () => {
    expect(satisfiesSemver('1.6.1', '~1.6.0')).toBe(true);
    expect(satisfiesSemver('1.6.0', '~1.6.0')).toBe(true);
    expect(satisfiesSemver('1.7.0', '~1.6.0')).toBe(false);
    expect(satisfiesSemver('1.5.9', '~1.6.0')).toBe(false);
  });

  it('should handle whitespace in range', () => {
    expect(satisfiesSemver('1.7.0', '>= 1.6.0')).toBe(true);
    expect(satisfiesSemver('1.7.0', '^ 1.6.0')).toBe(true);
  });
});
