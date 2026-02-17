import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock import.meta.env to ensure DEV is false (so HMR suppression doesn't interfere)
vi.stubGlobal('import', {
  meta: {
    env: {
      DEV: false,
    },
  },
});

import { incrementCrashCounterFromComponentDidCatch } from './crashCounterService';

const CRASH_COUNT_KEY = 'veo-crash-count';
const LAST_CRASH_KEY = 'veo-last-crash';
const SESSION_CRASH_RECORDED_KEY = 'veo-session-crash-recorded';

describe('crashCounterService', () => {
  beforeEach(() => {
    // Clear all storage before each test
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('incrementCrashCounterFromComponentDidCatch', () => {
    it('should increment crash count from 0 to 1', () => {
      incrementCrashCounterFromComponentDidCatch();

      expect(localStorage.getItem(CRASH_COUNT_KEY)).toBe('1');
    });

    it('should increment crash count from existing value', () => {
      localStorage.setItem(CRASH_COUNT_KEY, '5');

      incrementCrashCounterFromComponentDidCatch();

      expect(localStorage.getItem(CRASH_COUNT_KEY)).toBe('6');
    });

    it('should increment multiple times across different sessions', () => {
      // First session
      incrementCrashCounterFromComponentDidCatch();
      expect(localStorage.getItem(CRASH_COUNT_KEY)).toBe('1');

      // New session - clear session storage
      sessionStorage.clear();

      // Second session
      incrementCrashCounterFromComponentDidCatch();
      expect(localStorage.getItem(CRASH_COUNT_KEY)).toBe('2');

      // New session
      sessionStorage.clear();

      // Third session
      incrementCrashCounterFromComponentDidCatch();
      expect(localStorage.getItem(CRASH_COUNT_KEY)).toBe('3');
    });

    it('should record only once per session', () => {
      incrementCrashCounterFromComponentDidCatch();
      expect(localStorage.getItem(CRASH_COUNT_KEY)).toBe('1');

      // Try to increment again in same session
      incrementCrashCounterFromComponentDidCatch();

      // Count should remain 1 (not incremented again)
      expect(localStorage.getItem(CRASH_COUNT_KEY)).toBe('1');

      // Verify session flag is set
      expect(sessionStorage.getItem(SESSION_CRASH_RECORDED_KEY)).toBe('1');
    });

    it('should record last crash timestamp', () => {
      const beforeTime = Date.now();
      incrementCrashCounterFromComponentDidCatch();
      const afterTime = Date.now();

      const lastCrashRaw = localStorage.getItem(LAST_CRASH_KEY);
      expect(lastCrashRaw).not.toBeNull();

      const lastCrash = Number(lastCrashRaw);
      expect(lastCrash).toBeGreaterThanOrEqual(beforeTime);
      expect(lastCrash).toBeLessThanOrEqual(afterTime);
    });

    it('should set session crash recorded flag', () => {
      expect(sessionStorage.getItem(SESSION_CRASH_RECORDED_KEY)).toBeNull();

      incrementCrashCounterFromComponentDidCatch();

      expect(sessionStorage.getItem(SESSION_CRASH_RECORDED_KEY)).toBe('1');
    });

    it('should handle malformed localStorage count gracefully', () => {
      localStorage.setItem(CRASH_COUNT_KEY, 'not-a-number');

      // Should not throw and should treat as 0
      incrementCrashCounterFromComponentDidCatch();

      expect(localStorage.getItem(CRASH_COUNT_KEY)).toBe('1');
    });

    it('should handle Infinity gracefully', () => {
      localStorage.setItem(CRASH_COUNT_KEY, 'Infinity');

      incrementCrashCounterFromComponentDidCatch();

      expect(localStorage.getItem(CRASH_COUNT_KEY)).toBe('1');
    });

    it('should handle NaN gracefully', () => {
      localStorage.setItem(CRASH_COUNT_KEY, 'NaN');

      incrementCrashCounterFromComponentDidCatch();

      expect(localStorage.getItem(CRASH_COUNT_KEY)).toBe('1');
    });

    it('should handle negative numbers gracefully', () => {
      localStorage.setItem(CRASH_COUNT_KEY, '-5');

      incrementCrashCounterFromComponentDidCatch();

      // Should treat -5 as finite and increment to -4
      const result = localStorage.getItem(CRASH_COUNT_KEY);
      expect(result).toBe('-4');
    });

    it('should handle large numbers', () => {
      localStorage.setItem(CRASH_COUNT_KEY, '999999');

      incrementCrashCounterFromComponentDidCatch();

      expect(localStorage.getItem(CRASH_COUNT_KEY)).toBe('1000000');
    });

    it('should not increment if session flag already set', () => {
      // Manually set session flag
      sessionStorage.setItem(SESSION_CRASH_RECORDED_KEY, '1');

      incrementCrashCounterFromComponentDidCatch();

      // Should not have incremented
      expect(localStorage.getItem(CRASH_COUNT_KEY)).toBeNull();
    });

    it('should update last crash timestamp on each call in different sessions', () => {
      incrementCrashCounterFromComponentDidCatch();
      const firstTimestamp = Number(localStorage.getItem(LAST_CRASH_KEY));

      // Simulate new session
      sessionStorage.clear();

      // Wait a bit to ensure timestamp difference
      const delayPromise = new Promise((resolve) => setTimeout(resolve, 10));

      return delayPromise.then(() => {
        incrementCrashCounterFromComponentDidCatch();
        const secondTimestamp = Number(localStorage.getItem(LAST_CRASH_KEY));

        expect(secondTimestamp).toBeGreaterThan(firstTimestamp);
      });
    });

    it('should handle empty localStorage gracefully', () => {
      sessionStorage.clear();
      localStorage.clear();

      incrementCrashCounterFromComponentDidCatch();

      expect(localStorage.getItem(CRASH_COUNT_KEY)).toBe('1');
      expect(localStorage.getItem(LAST_CRASH_KEY)).not.toBeNull();
      expect(sessionStorage.getItem(SESSION_CRASH_RECORDED_KEY)).toBe('1');
    });

    it('should be idempotent within a session', () => {
      incrementCrashCounterFromComponentDidCatch();
      const count1 = localStorage.getItem(CRASH_COUNT_KEY);

      incrementCrashCounterFromComponentDidCatch();
      const count2 = localStorage.getItem(CRASH_COUNT_KEY);

      incrementCrashCounterFromComponentDidCatch();
      const count3 = localStorage.getItem(CRASH_COUNT_KEY);

      expect(count1).toBe('1');
      expect(count2).toBe('1');
      expect(count3).toBe('1');
    });
  });
});
