/**
 * Pure utility functions extracted from electron/main.cjs for testability.
 * All functions are side-effect-free and depend only on their arguments.
 */

const ERROR_SCHEMA_VERSION = '1.0.0';
const LOG_ROTATE_MAX_BYTES = 1 * 1024 * 1024;
const LOG_ROTATE_KEEP_LINES = 500;
const WRITE_BATCH_SIZE = 50;
const DEDUPE_WINDOW_MS = 5000;
const RATE_LIMIT_WINDOW_MS = 1000;
const RATE_LIMIT_MAX_ENTRIES = 120;
const SAFE_MODE_THRESHOLD = 3;

/**
 * Normalize a raw error entry into a well-formed log object.
 * Fills in defaults for missing or invalid fields.
 *
 * @param {unknown} input - Raw error entry from the renderer.
 * @returns {object} Normalized entry with schemaVersion, code, message, etc.
 */
function normalizeErrorEntry(input) {
  const raw = typeof input === 'object' && input !== null ? input : {};
  const context = typeof raw.context === 'object' && raw.context !== null ? raw.context : undefined;
  const timestamp = Number.isFinite(raw.timestamp) ? raw.timestamp : Date.now();
  const message =
    typeof raw.message === 'string' && raw.message.trim() ? raw.message : 'Unknown error';
  const code = typeof raw.code === 'string' && raw.code.trim() ? raw.code : 'UNEXPECTED_ERROR';
  const level = raw.level === 'warning' ? 'warning' : 'error';
  const correlationId =
    typeof raw.correlationId === 'string' && raw.correlationId.trim()
      ? raw.correlationId
      : `cid_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const stack = typeof raw.stack === 'string' ? raw.stack : undefined;

  return {
    schemaVersion: ERROR_SCHEMA_VERSION,
    code,
    message,
    stack,
    context,
    correlationId,
    timestamp,
    level,
  };
}

/**
 * Check whether a new entry passes the rate limit.
 * Mutates `enqueueTimes` by pruning old entries and pushing `now`.
 *
 * @param {number}   now           - Current timestamp (ms).
 * @param {number[]} enqueueTimes  - Mutable array of recent enqueue timestamps.
 * @param {number}   windowMs      - Duration of the rate-limit window.
 * @param {number}   maxEntries    - Max entries allowed within the window.
 * @returns {boolean} True if the entry is within the rate limit.
 */
function passesRateLimit(
  now,
  enqueueTimes,
  windowMs = RATE_LIMIT_WINDOW_MS,
  maxEntries = RATE_LIMIT_MAX_ENTRIES,
) {
  while (enqueueTimes.length > 0 && now - enqueueTimes[0] > windowMs) {
    enqueueTimes.shift();
  }
  if (enqueueTimes.length >= maxEntries) {
    return false;
  }
  enqueueTimes.push(now);
  return true;
}

/**
 * Determine whether an entry should be deduplicated (suppressed).
 * Mutates `recentFingerprints` map to track seen entries.
 *
 * @param {object}       entry              - Normalized error entry.
 * @param {number}       now                - Current timestamp (ms).
 * @param {Map<string,number>} recentFingerprints - Mutable map of fingerprint→lastSeen.
 * @param {number}       windowMs           - Deduplication window duration.
 * @returns {boolean} True if the entry is a duplicate and should be skipped.
 */
function shouldDeduplicate(entry, now, recentFingerprints, windowMs = DEDUPE_WINDOW_MS) {
  const fingerprint = `${entry.code}:${entry.message}:${entry.stack || ''}`.slice(0, 240);
  const lastSeen = recentFingerprints.get(fingerprint);
  if (lastSeen !== undefined && now - lastSeen < windowMs) {
    return true;
  }
  recentFingerprints.set(fingerprint, now);

  if (recentFingerprints.size > 1000) {
    const cutoff = now - windowMs;
    for (const [key, ts] of recentFingerprints.entries()) {
      if (ts < cutoff) recentFingerprints.delete(key);
    }
  }

  return false;
}

/**
 * Return platform-specific candidate paths for a DaVinci Resolve install.
 *
 * @param {string} platform - Value from `process.platform`.
 * @returns {string[]} Array of absolute paths to check.
 */
function getResolveInstallCandidates(platform = process.platform) {
  if (platform === 'win32') {
    return [
      'C:\\Program Files\\Blackmagic Design\\DaVinci Resolve\\Resolve.exe',
      'C:\\Program Files\\Blackmagic Design\\DaVinci Resolve\\bin\\resolve.exe',
    ];
  }

  if (platform === 'darwin') {
    return [
      '/Applications/DaVinci Resolve/DaVinci Resolve.app/Contents/MacOS/Resolve',
      '/Applications/DaVinci Resolve/DaVinci Resolve.app',
    ];
  }

  return ['/opt/resolve/bin/resolve', '/usr/bin/resolve', '/usr/local/bin/resolve'];
}

module.exports = {
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
};
