import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger, LogLevel, log } from './loggerService';

beforeEach(() => {
  logger.clearLogs();
  vi.spyOn(console, 'debug').mockImplementation(() => {});
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('logger', () => {
  describe('log levels', () => {
    it('should log info messages by default', () => {
      logger.info('test info');
      const logs = logger.getRecentLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe(LogLevel.INFO);
      expect(logs[0].message).toBe('test info');
    });

    it('should log warn messages', () => {
      logger.warn('test warning');
      const logs = logger.getRecentLogs();
      expect(logs.some((l) => l.message === 'test warning')).toBe(true);
    });

    it('should log error messages', () => {
      logger.error('test error');
      const logs = logger.getRecentLogs();
      expect(logs.some((l) => l.message === 'test error')).toBe(true);
    });

    it('should log fatal messages', () => {
      logger.fatal('test fatal');
      const logs = logger.getRecentLogs();
      expect(logs.some((l) => l.message === 'test fatal')).toBe(true);
    });

    it('should include context when provided', () => {
      logger.info('with context', 'TestContext');
      const logs = logger.getRecentLogs();
      expect(logs[0].context).toBe('TestContext');
    });

    it('should include data when provided', () => {
      logger.info('with data', undefined, { key: 'value' });
      const logs = logger.getRecentLogs();
      expect(logs[0].data).toEqual({ key: 'value' });
    });
  });

  describe('setLogLevel', () => {
    it('should filter logs below minimum level', () => {
      logger.setLogLevel(LogLevel.ERROR);
      logger.info('should be filtered');
      logger.warn('should be filtered too');
      logger.error('should appear');
      const logs = logger.getRecentLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('should appear');
      // Reset
      logger.setLogLevel(LogLevel.INFO);
    });

    it('should allow debug when set to DEBUG', () => {
      logger.setLogLevel(LogLevel.DEBUG);
      logger.debug('debug message');
      const logs = logger.getRecentLogs();
      expect(logs.some((l) => l.message === 'debug message')).toBe(true);
      // Reset
      logger.setLogLevel(LogLevel.INFO);
    });
  });

  describe('getRecentLogs', () => {
    it('should return empty array when no logs', () => {
      expect(logger.getRecentLogs()).toEqual([]);
    });

    it('should limit returned logs by count', () => {
      for (let i = 0; i < 10; i++) {
        logger.info(`log ${i}`);
      }
      const logs = logger.getRecentLogs(3);
      expect(logs).toHaveLength(3);
      expect(logs[0].message).toBe('log 7');
      expect(logs[2].message).toBe('log 9');
    });

    it('should return all logs when count exceeds available', () => {
      logger.info('only one');
      const logs = logger.getRecentLogs(100);
      expect(logs).toHaveLength(1);
    });
  });

  describe('clearLogs', () => {
    it('should clear all logs', () => {
      logger.info('log 1');
      logger.info('log 2');
      expect(logger.getRecentLogs()).toHaveLength(2);
      logger.clearLogs();
      expect(logger.getRecentLogs()).toHaveLength(0);
    });
  });

  describe('exportLogs', () => {
    it('should return valid JSON string', () => {
      logger.info('export test');
      const exported = logger.exportLogs();
      const parsed = JSON.parse(exported);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].message).toBe('export test');
    });

    it('should return empty array JSON when no logs', () => {
      expect(logger.exportLogs()).toBe('[]');
    });
  });

  describe('log entry structure', () => {
    it('should include timestamp in ISO format', () => {
      logger.info('timestamp test');
      const logs = logger.getRecentLogs();
      expect(logs[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should include stack trace for errors', () => {
      const err = new Error('test error');
      logger.error('error with stack', err);
      const logs = logger.getRecentLogs();
      expect(logs[0].stack).toBeDefined();
      expect(logs[0].stack).toContain('test error');
    });
  });

  describe('warn/error overloaded signatures', () => {
    it('should handle warn(msg, data) when data is not a string', () => {
      logger.warn('warn msg', { detail: 'info' });
      const logs = logger.getRecentLogs();
      expect(logs[0].context).toBeUndefined();
      expect(logs[0].data).toEqual({ detail: 'info' });
    });

    it('should handle warn(msg, context, data)', () => {
      logger.warn('warn msg', 'Ctx', { detail: 'info' });
      const logs = logger.getRecentLogs();
      expect(logs[0].context).toBe('Ctx');
      expect(logs[0].data).toEqual({ detail: 'info' });
    });

    it('should handle error(msg, error) when second arg is Error', () => {
      const err = new Error('fail');
      logger.error('error msg', err);
      const logs = logger.getRecentLogs();
      expect(logs[0].stack).toContain('fail');
    });

    it('should handle error(msg, context, error)', () => {
      const err = new Error('fail');
      logger.error('error msg', 'Ctx', err);
      const logs = logger.getRecentLogs();
      expect(logs[0].context).toBe('Ctx');
      expect(logs[0].stack).toContain('fail');
    });
  });

  describe('console output', () => {
    it('should call console.info for INFO level', () => {
      logger.info('info test');
      expect(console.info).toHaveBeenCalled();
    });

    it('should call console.warn for WARN level', () => {
      logger.warn('warn test');
      expect(console.warn).toHaveBeenCalled();
    });

    it('should call console.error for ERROR level', () => {
      logger.error('error test');
      expect(console.error).toHaveBeenCalled();
    });

    it('should call console.error for FATAL level', () => {
      logger.fatal('fatal test');
      expect(console.error).toHaveBeenCalled();
    });
  });
});

describe('log convenience object', () => {
  it('should delegate info to logger', () => {
    log.info('convenience info');
    const logs = logger.getRecentLogs();
    expect(logs.some((l) => l.message === 'convenience info')).toBe(true);
  });

  it('should delegate warn to logger', () => {
    log.warn('convenience warn');
    const logs = logger.getRecentLogs();
    expect(logs.some((l) => l.message === 'convenience warn')).toBe(true);
  });

  it('should delegate error to logger', () => {
    log.error('convenience error');
    const logs = logger.getRecentLogs();
    expect(logs.some((l) => l.message === 'convenience error')).toBe(true);
  });

  it('should delegate fatal to logger', () => {
    log.fatal('convenience fatal');
    const logs = logger.getRecentLogs();
    expect(logs.some((l) => l.message === 'convenience fatal')).toBe(true);
  });
});
