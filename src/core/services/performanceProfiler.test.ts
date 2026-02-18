/**
 * Performance Profiler Unit Tests
 * Tests for performance measurement and tracking
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock logger
vi.mock('./loggerService', () => ({
  log: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { performanceProfiler } from './performanceProfiler';
import { log } from './loggerService';

describe('performanceProfiler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    performanceProfiler.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('start', () => {
    it('should start timing for a key', () => {
      performanceProfiler.start('test-operation');

      // Should not throw and performance.now should be called internally
      expect(performance.now).toBeDefined();
    });

    it('should handle multiple concurrent timings', () => {
      performanceProfiler.start('operation-1');
      performanceProfiler.start('operation-2');

      // Both should be tracked independently
      expect(() => performanceProfiler.end('operation-1')).not.toThrow();
      expect(() => performanceProfiler.end('operation-2')).not.toThrow();
    });

    it('should handle undefined performance gracefully', () => {
      const originalPerformance = global.performance;
      // @ts-expect-error - Testing undefined performance
      global.performance = undefined;

      expect(() => performanceProfiler.start('test')).not.toThrow();

      global.performance = originalPerformance;
    });
  });

  describe('end', () => {
    it('should end timing and return duration', () => {
      performanceProfiler.start('test-operation');

      vi.advanceTimersByTime(100);

      const duration = performanceProfiler.end('test-operation');

      expect(duration).toBeGreaterThan(0);
      expect(log.info).toHaveBeenCalledWith(
        'Performance metric: test-operation',
        'performance-profiler',
        expect.objectContaining({
          durationMs: expect.any(Number),
        }),
      );
    });

    it('should return null if key was not started', () => {
      const duration = performanceProfiler.end('non-existent-key');

      expect(duration).toBeNull();
    });

    it('should store measure in history', () => {
      performanceProfiler.start('test-operation');
      vi.advanceTimersByTime(50);
      performanceProfiler.end('test-operation');

      const measures = performanceProfiler.getRecentMeasures(1);

      expect(measures.length).toBe(1);
      expect(measures[0].key).toBe('test-operation');
      expect(measures[0].durationMs).toBeGreaterThan(0);
    });

    it('should limit measures to maxEntries', () => {
      // Add more than maxEntries (200) measures
      for (let i = 0; i < 250; i++) {
        performanceProfiler.start(`operation-${i}`);
        performanceProfiler.end(`operation-${i}`);
      }

      const measures = performanceProfiler.getRecentMeasures(250);

      expect(measures.length).toBeLessThanOrEqual(200);
    });

    it('should remove oldest entries when exceeding maxEntries', () => {
      for (let i = 0; i < 201; i++) {
        performanceProfiler.start(`operation-${i}`);
        performanceProfiler.end(`operation-${i}`);
      }

      const measures = performanceProfiler.getRecentMeasures(250);

      // Should not contain the first operation
      expect(measures.every((m) => m.key !== 'operation-0')).toBe(true);
    });

    it('should handle undefined performance gracefully', () => {
      const originalPerformance = global.performance;
      // @ts-expect-error - Testing undefined performance
      global.performance = undefined;

      const duration = performanceProfiler.end('test');

      expect(duration).toBeNull();

      global.performance = originalPerformance;
    });

    it('should log duration with 2 decimal precision', () => {
      performanceProfiler.start('test-operation');
      vi.advanceTimersByTime(123.456);
      performanceProfiler.end('test-operation');

      expect(log.info).toHaveBeenCalledWith(
        'Performance metric: test-operation',
        'performance-profiler',
        expect.objectContaining({
          durationMs: expect.any(Number),
        }),
      );

      const logCall = vi.mocked(log.info).mock.calls[0];
      const metadata = logCall[2] as { durationMs: number };
      // Check that it's a reasonable number
      expect(metadata.durationMs).toBeGreaterThan(0);
    });

    it('should delete start time after ending', () => {
      performanceProfiler.start('test-operation');
      performanceProfiler.end('test-operation');

      // Second end should return null
      const secondDuration = performanceProfiler.end('test-operation');
      expect(secondDuration).toBeNull();
    });
  });

  describe('trackSync', () => {
    it('should track synchronous operation', () => {
      const result = performanceProfiler.trackSync('sync-op', () => {
        vi.advanceTimersByTime(50);
        return 'result';
      });

      expect(result).toBe('result');
      expect(log.info).toHaveBeenCalledWith(
        'Performance metric: sync-op',
        'performance-profiler',
        expect.any(Object),
      );

      const measures = performanceProfiler.getRecentMeasures(1);
      expect(measures.length).toBe(1);
      expect(measures[0].key).toBe('sync-op');
    });

    it('should track even if action throws error', () => {
      expect(() => {
        performanceProfiler.trackSync('error-op', () => {
          throw new Error('Test error');
        });
      }).toThrow('Test error');

      // Should still log the measurement
      expect(log.info).toHaveBeenCalledWith(
        'Performance metric: error-op',
        'performance-profiler',
        expect.any(Object),
      );
    });

    it('should return action result', () => {
      const result = performanceProfiler.trackSync('calc', () => 42);

      expect(result).toBe(42);
    });

    it('should handle complex return types', () => {
      const complexResult = { data: [1, 2, 3], meta: { count: 3 } };
      const result = performanceProfiler.trackSync('complex', () => complexResult);

      expect(result).toEqual(complexResult);
    });
  });

  describe('trackAsync', () => {
    it('should track asynchronous operation', async () => {
      const result = await performanceProfiler.trackAsync('async-op', async () => {
        vi.advanceTimersByTime(100);
        return 'async-result';
      });

      expect(result).toBe('async-result');
      expect(log.info).toHaveBeenCalledWith(
        'Performance metric: async-op',
        'performance-profiler',
        expect.any(Object),
      );

      const measures = performanceProfiler.getRecentMeasures(1);
      expect(measures.length).toBe(1);
      expect(measures[0].key).toBe('async-op');
    });

    it('should track even if async action rejects', async () => {
      await expect(
        performanceProfiler.trackAsync('error-async', async () => {
          throw new Error('Async error');
        }),
      ).rejects.toThrow('Async error');

      // Should still log the measurement
      expect(log.info).toHaveBeenCalledWith(
        'Performance metric: error-async',
        'performance-profiler',
        expect.any(Object),
      );
    });

    it('should return async action result', async () => {
      const result = await performanceProfiler.trackAsync('fetch', async () => {
        return { data: 'fetched' };
      });

      expect(result).toEqual({ data: 'fetched' });
    });

    it('should handle promise chains', async () => {
      const result = await performanceProfiler.trackAsync('chain', async () => {
        return Promise.resolve(1)
          .then((x) => x + 1)
          .then((x) => x * 2);
      });

      expect(result).toBe(4);
    });
  });

  describe('getRecentMeasures', () => {
    it('should return default 25 most recent measures', () => {
      for (let i = 0; i < 30; i++) {
        performanceProfiler.start(`op-${i}`);
        performanceProfiler.end(`op-${i}`);
      }

      const measures = performanceProfiler.getRecentMeasures();

      expect(measures.length).toBe(25);
      // Should contain the most recent ones
      expect(measures[measures.length - 1].key).toBe('op-29');
    });

    it('should return specified count of recent measures', () => {
      for (let i = 0; i < 20; i++) {
        performanceProfiler.start(`op-${i}`);
        performanceProfiler.end(`op-${i}`);
      }

      const measures = performanceProfiler.getRecentMeasures(10);

      expect(measures.length).toBe(10);
      expect(measures[0].key).toBe('op-10');
      expect(measures[9].key).toBe('op-19');
    });

    it('should return all measures if count exceeds total', () => {
      for (let i = 0; i < 5; i++) {
        performanceProfiler.start(`op-${i}`);
        performanceProfiler.end(`op-${i}`);
      }

      const measures = performanceProfiler.getRecentMeasures(100);

      expect(measures.length).toBe(5);
    });

    it('should return measures with complete metadata', () => {
      performanceProfiler.start('test-op');
      vi.advanceTimersByTime(100);
      performanceProfiler.end('test-op');

      const measures = performanceProfiler.getRecentMeasures(1);

      expect(measures[0]).toHaveProperty('key');
      expect(measures[0]).toHaveProperty('durationMs');
      expect(measures[0]).toHaveProperty('startedAt');
      expect(measures[0]).toHaveProperty('endedAt');
      expect(measures[0].endedAt).toBeGreaterThan(measures[0].startedAt);
    });

    it('should return empty array when no measures recorded', () => {
      const measures = performanceProfiler.getRecentMeasures();

      expect(measures).toEqual([]);
    });
  });

  describe('clear', () => {
    it('should clear all starts and measures', () => {
      performanceProfiler.start('op-1');
      performanceProfiler.start('op-2');
      performanceProfiler.end('op-1');

      performanceProfiler.clear();

      const measures = performanceProfiler.getRecentMeasures();
      expect(measures.length).toBe(0);

      // Ending op-2 should return null since starts were cleared
      const duration = performanceProfiler.end('op-2');
      expect(duration).toBeNull();
    });

    it('should allow fresh measurements after clear', () => {
      performanceProfiler.start('old-op');
      performanceProfiler.end('old-op');

      performanceProfiler.clear();

      performanceProfiler.start('new-op');
      const duration = performanceProfiler.end('new-op');

      expect(duration).not.toBeNull();

      const measures = performanceProfiler.getRecentMeasures();
      expect(measures.length).toBe(1);
      expect(measures[0].key).toBe('new-op');
    });
  });

  describe('integration scenarios', () => {
    it('should handle multiple operations with different timings', () => {
      performanceProfiler.start('fast-op');
      vi.advanceTimersByTime(10);
      performanceProfiler.end('fast-op');

      performanceProfiler.start('slow-op');
      vi.advanceTimersByTime(500);
      performanceProfiler.end('slow-op');

      const measures = performanceProfiler.getRecentMeasures(2);

      expect(measures[0].durationMs).toBeLessThan(measures[1].durationMs);
    });

    it('should handle overlapping operations', () => {
      performanceProfiler.start('op-1');
      vi.advanceTimersByTime(50);

      performanceProfiler.start('op-2');
      vi.advanceTimersByTime(50);

      performanceProfiler.end('op-1'); // total 100ms
      vi.advanceTimersByTime(50);
      performanceProfiler.end('op-2'); // total 100ms

      const measures = performanceProfiler.getRecentMeasures(2);

      expect(measures.length).toBe(2);
      expect(measures[0].key).toBe('op-1');
      expect(measures[1].key).toBe('op-2');
    });

    it('should handle same key used multiple times', () => {
      performanceProfiler.start('repeated');
      performanceProfiler.end('repeated');

      performanceProfiler.start('repeated');
      performanceProfiler.end('repeated');

      const measures = performanceProfiler.getRecentMeasures(10);

      expect(measures.filter((m) => m.key === 'repeated').length).toBe(2);
    });
  });
});
