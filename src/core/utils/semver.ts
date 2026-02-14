/**
 * Lightweight semver utilities for plugin version compatibility.
 * Supports exact, caret (^), tilde (~), and gte (>=) ranges.
 *
 * @module semver
 */

interface SemverParts {
  major: number;
  minor: number;
  patch: number;
  prerelease: string | undefined;
}

/**
 * Parse a version string into its numeric components.
 * Accepts `1.6.0`, `1.6.0-beta.3`, etc.
 */
export function parseSemver(version: string): SemverParts {
  const cleaned = version.replace(/^[v=]/, '');
  const [core, prerelease] = cleaned.split('-', 2);
  const parts = core.split('.').map(Number);

  return {
    major: parts[0] ?? 0,
    minor: parts[1] ?? 0,
    patch: parts[2] ?? 0,
    prerelease,
  };
}

/**
 * Compare two semver strings.
 * Returns -1 if a < b, 0 if a === b, 1 if a > b.
 * Pre-release versions are considered lower than the same version without pre-release.
 */
export function compareSemver(a: string, b: string): -1 | 0 | 1 {
  const pa = parseSemver(a);
  const pb = parseSemver(b);

  if (pa.major !== pb.major) return pa.major < pb.major ? -1 : 1;
  if (pa.minor !== pb.minor) return pa.minor < pb.minor ? -1 : 1;
  if (pa.patch !== pb.patch) return pa.patch < pb.patch ? -1 : 1;

  // No pre-release beats having one (1.6.0 > 1.6.0-beta.1)
  if (!pa.prerelease && pb.prerelease) return 1;
  if (pa.prerelease && !pb.prerelease) return -1;
  if (pa.prerelease && pb.prerelease) {
    return pa.prerelease < pb.prerelease ? -1 : pa.prerelease > pb.prerelease ? 1 : 0;
  }

  return 0;
}

/**
 * Check whether `version` satisfies a semver `range`.
 *
 * Supported range formats:
 * - Exact:   `1.6.0`   → version must equal range
 * - Caret:   `^1.6.0`  → same major, >= minor.patch
 * - Tilde:   `~1.6.0`  → same major.minor, >= patch
 * - GTE:     `>=1.6.0` → version >= range
 */
export function satisfiesSemver(version: string, range: string): boolean {
  const trimmed = range.trim();

  // >=x.y.z
  if (trimmed.startsWith('>=')) {
    const target = trimmed.slice(2).trim();
    return compareSemver(version, target) >= 0;
  }

  // ^x.y.z — compatible with major
  if (trimmed.startsWith('^')) {
    const target = parseSemver(trimmed.slice(1).trim());
    const v = parseSemver(version);

    if (v.major !== target.major) return false;
    if (v.minor > target.minor) return true;
    if (v.minor === target.minor) return v.patch >= target.patch;
    return false;
  }

  // ~x.y.z — compatible with minor
  if (trimmed.startsWith('~')) {
    const target = parseSemver(trimmed.slice(1).trim());
    const v = parseSemver(version);

    if (v.major !== target.major) return false;
    if (v.minor !== target.minor) return false;
    return v.patch >= target.patch;
  }

  // Exact match
  return compareSemver(version, trimmed) === 0;
}
