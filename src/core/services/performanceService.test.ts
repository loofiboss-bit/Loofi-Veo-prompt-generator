/**
 * PerformanceService Unit Tests
 * Tests for performance profiling and metrics collection
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock idb-keyval
vi.mock('idb-keyval', () => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  keys: vi.fn(),
}));

// Mock loggerService
vi.mock('./loggerService', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock performance API
const performanceMarks = new Map<string, number>();
const performanceMeasures = new Map<string, { duration: number }>();

global.performance = {
  mark: vi.fn((name: string) => {
    performanceMarks.set(name, Date.now());
  }),
  measure: vi.fn((name: string, startMark: string, endMark: string) => {
    const startTime = performanceMarks.get(startMark) || 0;
    const endTime = performanceMarks.get(endMark) || 0;
    const duration = endTime - startTime;
    const measure = { duration, name, entryType: 'measure', startTime, toJSON: () => ({}) };
    performanceMeasures.set(name, measure);
    return measure;
  }),
  clearMarks: vi.fn((name?: string) => {
    if (name) {
      performanceMarks.delete(name);
    } else {
      performanceMarks.clear();
    }
  }),
  clearMeasures: vi.fn((name?: string) => {
    if (name) {
      performanceMeasures.delete(name);
    } else {
      performanceMeasures.clear();
    }
  }),
} as unknown as Performance;

import { logger } from './loggerService';
import { performanceService } from './performanceService';

describe('performanceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    performanceMarks.clear();
    performanceMeasures.clear();
    localStorageMock.clear();
    performanceService.clearMetrics();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('startMark', () => {
    it('should create a start mark in Performance API', () => {
      performanceService.startMark('test-operation');

      expect(performance.mark).toHaveBeenCalledWith('loofi-start-test-operation');
    });

    it('should create unique marks for different labels', () => {
      performanceService.startMark('operation-1');
      performanceService.startMark('operation-2');

      expect(performance.mark).toHaveBeenCalledWith('loofi-start-operation-1');
      expect(performance.mark).toHaveBeenCalledWith('loofi-start-operation-2');
    });
  });

  describe('endMark', () => {
    it('should measure duration and record metric', () => {
      performanceService.startMark('test-op');

      // Simulate some time passing
      performanceMarks.set('loofi-start-test-op', Date.now() - 100);

      performanceService.endMark('test-op');

      const metrics = performanceService.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].label).toBe('test-op');
      expect(metrics[0].duration).toBeGreaterThanOrEqual(0);
      expect(metrics[0].timestamp).toBeDefined();
    });

    it('should clean up marks and measures', () => {
      performanceService.startMark('test-op');
      performanceService.endMark('test-op');

      expect(performance.clearMarks).toHaveBeenCalledWith('loofi-start-test-op');
      expect(performance.clearMarks).toHaveBeenCalledWith('loofi-end-test-op');
      expect(performance.clearMeasures).toHaveBeenCalledWith('loofi-test-op');
    });

    it('should silently ignore if no matching start mark exists', () => {
      vi.mocked(performance.measure).mockImplementationOnce(() => {
        throw new Error('Mark not found');
      });

      expect(() => performanceService.endMark('non-existent')).not.toThrow();

      const metrics = performanceService.getMetrics();
      expect(metrics).toHaveLength(0);
    });

    it('should log via logger when debug mode is enabled', () => {
      localStorageMock.setItem('debug-perf', 'true');

      performanceService.startMark('debug-test');
      performanceService.endMark('debug-test');

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('debug-test'),
        'performanceService',
      );
    });

    it('should not log via logger when debug mode is disabled', () => {
      performanceService.startMark('test');
      performanceService.endMark('test');

      expect(logger.debug).not.toHaveBeenCalledWith(expect.anything(), 'performanceService');
    });
  });

  describe('getMetrics', () => {
    it('should return empty array when no metrics recorded', () => {
      const metrics = performanceService.getMetrics();

      expect(metrics).toEqual([]);
    });

    it('should return all recorded metrics', () => {
      performanceService.startMark('op1');
      performanceService.endMark('op1');

      performanceService.startMark('op2');
      performanceService.endMark('op2');

      const metrics = performanceService.getMetrics();

      expect(metrics).toHaveLength(2);
      expect(metrics[0].label).toBe('op1');
      expect(metrics[1].label).toBe('op2');
    });

    it('should return a copy of metrics array', () => {
      performanceService.startMark('test');
      performanceService.endMark('test');

      const metrics1 = performanceService.getMetrics();
      const metrics2 = performanceService.getMetrics();

      expect(metrics1).not.toBe(metrics2);
      expect(metrics1).toEqual(metrics2);
    });

    it('should not allow mutation of internal buffer', () => {
      performanceService.startMark('test');
      performanceService.endMark('test');

      const metrics = performanceService.getMetrics();
      metrics.length = 0;

      const metricsAfter = performanceService.getMetrics();
      expect(metricsAfter).toHaveLength(1);
    });
  });

  describe('clearMetrics', () => {
    it('should remove all buffered metrics', () => {
      performanceService.startMark('op1');
      performanceService.endMark('op1');
      performanceService.startMark('op2');
      performanceService.endMark('op2');

      expect(performanceService.getMetrics()).toHaveLength(2);

      performanceService.clearMetrics();

      expect(performanceService.getMetrics()).toHaveLength(0);
      expect(logger.info).toHaveBeenCalledWith('Performance metrics cleared', 'performanceService');
    });

    it('should allow new metrics after clearing', () => {
      performanceService.startMark('op1');
      performanceService.endMark('op1');

      performanceService.clearMetrics();

      performanceService.startMark('op2');
      performanceService.endMark('op2');

      const metrics = performanceService.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].label).toBe('op2');
    });
  });

  describe('ring buffer behavior', () => {
    it('should limit buffer to MAX_METRICS entries', () => {
      // MAX_METRICS is 200, so we'll add 201 entries
      for (let i = 0; i < 201; i++) {
        performanceService.startMark(`op-${i}`);
        performanceService.endMark(`op-${i}`);
      }

      const metrics = performanceService.getMetrics();
      expect(metrics.length).toBe(200);
    });

    it('should keep most recent metrics when buffer is full', () => {
      // Add 201 entries
      for (let i = 0; i < 201; i++) {
        performanceService.startMark(`op-${i}`);
        performanceService.endMark(`op-${i}`);
      }

      const metrics = performanceService.getMetrics();

      // First entry should be 'op-1' (op-0 was dropped)
      expect(metrics[0].label).toBe('op-1');
      // Last entry should be 'op-200'
      expect(metrics[metrics.length - 1].label).toBe('op-200');
    });
  });

  describe('subscribe', () => {
    it('should notify listener when new metric is added', () => {
      const listener = vi.fn();
      performanceService.subscribe(listener);

      performanceService.startMark('test');
      performanceService.endMark('test');

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          label: 'test',
          duration: expect.any(Number),
          timestamp: expect.any(Number),
        }),
      );
    });

    it('should notify multiple listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      performanceService.subscribe(listener1);
      performanceService.subscribe(listener2);

      performanceService.startMark('test');
      performanceService.endMark('test');

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });

    it('should return unsubscribe function', () => {
      const listener = vi.fn();
      const unsubscribe = performanceService.subscribe(listener);

      unsubscribe();

      performanceService.startMark('test');
      performanceService.endMark('test');

      expect(listener).not.toHaveBeenCalled();
    });

    it('should not notify after unsubscribe', () => {
      const listener = vi.fn();
      const unsubscribe = performanceService.subscribe(listener);

      performanceService.startMark('test1');
      performanceService.endMark('test1');

      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();

      performanceService.startMark('test2');
      performanceService.endMark('test2');

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should handle listener errors gracefully', () => {
      const errorListener = vi.fn(() => {
        throw new Error('Listener error');
      });
      const goodListener = vi.fn();

      performanceService.subscribe(errorListener);
      performanceService.subscribe(goodListener);

      performanceService.startMark('test');
      performanceService.endMark('test');

      expect(logger.error).toHaveBeenCalledWith(
        '[PerformanceService] Listener error:',
        expect.any(Error),
      );
      expect(goodListener).toHaveBeenCalled();
    });
  });

  describe('integration scenarios', () => {
    it('should measure nested operations', () => {
      performanceService.startMark('outer');
      performanceService.startMark('inner');

      performanceService.endMark('inner');
      performanceService.endMark('outer');

      const metrics = performanceService.getMetrics();
      expect(metrics).toHaveLength(2);
      expect(metrics[0].label).toBe('inner');
      expect(metrics[1].label).toBe('outer');
    });

    it('should measure parallel operations', () => {
      performanceService.startMark('op1');
      performanceService.startMark('op2');

      performanceService.endMark('op1');
      performanceService.endMark('op2');

      const metrics = performanceService.getMetrics();
      expect(metrics).toHaveLength(2);
    });

    it('should handle rapid successive measurements', () => {
      for (let i = 0; i < 10; i++) {
        performanceService.startMark(`rapid-${i}`);
        performanceService.endMark(`rapid-${i}`);
      }

      const metrics = performanceService.getMetrics();
      expect(metrics).toHaveLength(10);
    });
  });
});
