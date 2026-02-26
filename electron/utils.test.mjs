/**
 * Unit tests for electron/utils.cjs — pure functions extracted from main process.
 *
 * Run with:  node --test electron/utils.test.mjs
 * Or via:    npx vitest run electron/utils.test.mjs --environment node
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  ERROR_SCHEMA_VERSION,
  LOG_ROTATE_MAX_BYTES,
  LOG_ROTATE_KEEP_LINES,
  WRITE_BATCH_SIZE,
  DEDUPE_WINDOW_MS,
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_ENTRIES,
  SAFE_MODE_THRESHOLD,
  normalizeErrorEntry,
  passesRateLimit,
  shouldDeduplicate,
  getResolveInstallCandidates,
} = require('./utils.cjs');

// ── Constants ───────────────────────────────────────────────────────────

describe('constants', () => {
  it('ERROR_SCHEMA_VERSION is a semver string', () => {
    assert.match(ERROR_SCHEMA_VERSION, /^\d+\.\d+\.\d+$/);
  });

  it('LOG_ROTATE_MAX_BYTES is 1 MB', () => {
    assert.equal(LOG_ROTATE_MAX_BYTES, 1048576);
  });

  it('LOG_ROTATE_KEEP_LINES is 500', () => {
    assert.equal(LOG_ROTATE_KEEP_LINES, 500);
  });

  it('WRITE_BATCH_SIZE is 50', () => {
    assert.equal(WRITE_BATCH_SIZE, 50);
  });

  it('DEDUPE_WINDOW_MS is 5000', () => {
    assert.equal(DEDUPE_WINDOW_MS, 5000);
  });

  it('RATE_LIMIT_WINDOW_MS is 1000', () => {
    assert.equal(RATE_LIMIT_WINDOW_MS, 1000);
  });

  it('RATE_LIMIT_MAX_ENTRIES is 120', () => {
    assert.equal(RATE_LIMIT_MAX_ENTRIES, 120);
  });

  it('SAFE_MODE_THRESHOLD is 3', () => {
    assert.equal(SAFE_MODE_THRESHOLD, 3);
  });
});

// ── normalizeErrorEntry ─────────────────────────────────────────────────

describe('normalizeErrorEntry', () => {
  it('returns defaults for null input', () => {
    const result = normalizeErrorEntry(null);
    assert.equal(result.schemaVersion, ERROR_SCHEMA_VERSION);
    assert.equal(result.code, 'UNEXPECTED_ERROR');
    assert.equal(result.message, 'Unknown error');
    assert.equal(result.level, 'error');
    assert.equal(typeof result.correlationId, 'string');
    assert.ok(result.correlationId.startsWith('cid_'));
    assert.equal(result.stack, undefined);
    assert.equal(result.context, undefined);
  });

  it('returns defaults for undefined input', () => {
    const result = normalizeErrorEntry(undefined);
    assert.equal(result.code, 'UNEXPECTED_ERROR');
    assert.equal(result.message, 'Unknown error');
  });

  it('returns defaults for string input', () => {
    const result = normalizeErrorEntry('not an object');
    assert.equal(result.code, 'UNEXPECTED_ERROR');
  });

  it('preserves valid fields', () => {
    const input = {
      code: 'MY_CODE',
      message: 'Something broke',
      level: 'warning',
      timestamp: 1700000000000,
      correlationId: 'abc-123',
      stack: 'Error: at line 1',
      context: { source: 'test' },
    };
    const result = normalizeErrorEntry(input);
    assert.equal(result.code, 'MY_CODE');
    assert.equal(result.message, 'Something broke');
    assert.equal(result.level, 'warning');
    assert.equal(result.timestamp, 1700000000000);
    assert.equal(result.correlationId, 'abc-123');
    assert.equal(result.stack, 'Error: at line 1');
    assert.deepEqual(result.context, { source: 'test' });
  });

  it('defaults level to error for non-warning values', () => {
    assert.equal(normalizeErrorEntry({ level: 'info' }).level, 'error');
    assert.equal(normalizeErrorEntry({ level: 'critical' }).level, 'error');
    assert.equal(normalizeErrorEntry({ level: '' }).level, 'error');
  });

  it('generates a correlationId when given empty string', () => {
    const result = normalizeErrorEntry({ correlationId: '   ' });
    assert.ok(result.correlationId.startsWith('cid_'));
  });

  it('uses "Unknown error" for whitespace-only message', () => {
    assert.equal(normalizeErrorEntry({ message: '   ' }).message, 'Unknown error');
  });

  it('uses "UNEXPECTED_ERROR" for whitespace-only code', () => {
    assert.equal(normalizeErrorEntry({ code: '  ' }).code, 'UNEXPECTED_ERROR');
  });

  it('ignores non-string stack', () => {
    assert.equal(normalizeErrorEntry({ stack: 42 }).stack, undefined);
    assert.equal(normalizeErrorEntry({ stack: {} }).stack, undefined);
  });

  it('ignores non-object context', () => {
    assert.equal(normalizeErrorEntry({ context: 'str' }).context, undefined);
    assert.equal(normalizeErrorEntry({ context: 42 }).context, undefined);
  });

  it('uses Date.now() for non-finite timestamp', () => {
    const before = Date.now();
    const result = normalizeErrorEntry({ timestamp: NaN });
    assert.ok(result.timestamp >= before);
  });
});

// ── passesRateLimit ─────────────────────────────────────────────────────

describe('passesRateLimit', () => {
  let times;

  beforeEach(() => {
    times = [];
  });

  it('allows entries within the limit', () => {
    const now = 10000;
    assert.ok(passesRateLimit(now, times, 1000, 3));
    assert.ok(passesRateLimit(now + 100, times, 1000, 3));
    assert.ok(passesRateLimit(now + 200, times, 1000, 3));
    assert.equal(times.length, 3);
  });

  it('rejects entries that exceed the limit', () => {
    const now = 10000;
    passesRateLimit(now, times, 1000, 2);
    passesRateLimit(now + 100, times, 1000, 2);
    assert.equal(passesRateLimit(now + 200, times, 1000, 2), false);
  });

  it('prunes old entries beyond the window', () => {
    passesRateLimit(1000, times, 1000, 2);
    passesRateLimit(1500, times, 1000, 2);
    // Now at capacity  (2 entries within window)
    assert.equal(passesRateLimit(1600, times, 1000, 2), false);
    // Jump past the window — both old entries should be pruned
    assert.ok(passesRateLimit(3000, times, 1000, 2));
    assert.equal(times.length, 1);
  });

  it('handles empty queue', () => {
    assert.ok(passesRateLimit(0, [], 1000, 120));
  });
});

// ── shouldDeduplicate ───────────────────────────────────────────────────

describe('shouldDeduplicate', () => {
  let fingerprints;

  beforeEach(() => {
    fingerprints = new Map();
  });

  it('returns false for the first occurrence', () => {
    const entry = { code: 'A', message: 'msg', stack: undefined };
    assert.equal(shouldDeduplicate(entry, 1000, fingerprints, 5000), false);
  });

  it('returns true for immediate duplicate within window', () => {
    const entry = { code: 'A', message: 'msg', stack: undefined };
    shouldDeduplicate(entry, 1000, fingerprints, 5000);
    assert.ok(shouldDeduplicate(entry, 2000, fingerprints, 5000));
  });

  it('returns false after the dedupe window expires', () => {
    const entry = { code: 'A', message: 'msg', stack: undefined };
    shouldDeduplicate(entry, 1000, fingerprints, 5000);
    assert.equal(shouldDeduplicate(entry, 7000, fingerprints, 5000), false);
  });

  it('treats entries with different codes as distinct', () => {
    const a = { code: 'A', message: 'msg' };
    const b = { code: 'B', message: 'msg' };
    shouldDeduplicate(a, 1000, fingerprints, 5000);
    assert.equal(shouldDeduplicate(b, 1000, fingerprints, 5000), false);
  });

  it('treats entries with different stacks as distinct', () => {
    const a = { code: 'A', message: 'msg', stack: 'stack1' };
    const b = { code: 'A', message: 'msg', stack: 'stack2' };
    shouldDeduplicate(a, 1000, fingerprints, 5000);
    assert.equal(shouldDeduplicate(b, 1000, fingerprints, 5000), false);
  });

  it('prunes fingerprints when map exceeds 1000 entries', () => {
    for (let i = 0; i < 1010; i++) {
      fingerprints.set(`key_${i}`, 100);
    }
    const entry = { code: 'NEW', message: 'msg' };
    shouldDeduplicate(entry, 50000, fingerprints, 5000);
    // Old entries (timestamped at 100) should have been pruned
    assert.ok(fingerprints.size < 1010);
  });
});

// ── getResolveInstallCandidates ─────────────────────────────────────────

describe('getResolveInstallCandidates', () => {
  it('returns Windows paths for win32', () => {
    const paths = getResolveInstallCandidates('win32');
    assert.ok(paths.length >= 1);
    assert.ok(paths.every((p) => p.includes('Resolve')));
    assert.ok(paths[0].endsWith('.exe'));
  });

  it('returns macOS paths for darwin', () => {
    const paths = getResolveInstallCandidates('darwin');
    assert.ok(paths.length >= 1);
    assert.ok(paths.every((p) => p.includes('DaVinci Resolve')));
  });

  it('returns Linux paths for linux', () => {
    const paths = getResolveInstallCandidates('linux');
    assert.ok(paths.length >= 1);
    assert.ok(paths.some((p) => p.startsWith('/opt') || p.startsWith('/usr')));
  });

  it('returns Linux paths for unknown platform', () => {
    const paths = getResolveInstallCandidates('freebsd');
    assert.ok(paths.length >= 1);
    assert.ok(paths.some((p) => p.startsWith('/')));
  });
});
