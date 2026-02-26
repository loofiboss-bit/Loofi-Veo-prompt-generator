import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@core/services/performanceService', () => ({
  performanceService: {
    startMark: vi.fn(),
    endMark: vi.fn(),
    getMetrics: vi.fn(() => []),
    clearMetrics: vi.fn(),
    subscribe: vi.fn(),
  },
}));

import { markStart, markEnd, PERF_MARKS } from './performanceMarks';
import { performanceService } from '@core/services/performanceService';

describe('performanceMarks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export all expected milestone constants', () => {
    expect(PERF_MARKS.APP_STARTUP).toBe('app-startup');
    expect(PERF_MARKS.STORE_HYDRATION).toBe('store-hydration');
    expect(PERF_MARKS.FIRST_RENDER).toBe('first-render');
    expect(PERF_MARKS.FIRST_INTERACTIVE).toBe('first-interactive');
    expect(PERF_MARKS.CRITICAL_BOOTSTRAP).toBe('critical-bootstrap');
    expect(PERF_MARKS.DB_INIT).toBe('db-init');
    expect(PERF_MARKS.SETTINGS_MIGRATION).toBe('settings-migration');
    expect(PERF_MARKS.PROJECT_STORE_INIT).toBe('project-store-init');
    expect(PERF_MARKS.PLUGIN_INIT).toBe('plugin-init');
    expect(PERF_MARKS.JOB_QUEUE_HYDRATE).toBe('job-queue-hydrate');
    expect(PERF_MARKS.QUEUE_REPLAY_SYNC).toBe('queue-replay-sync');
    expect(PERF_MARKS.ONLINE_RESUME_HANDOFF).toBe('online-resume-handoff');
    expect(PERF_MARKS.DEFERRED_SERVICES).toBe('deferred-services');
  });

  it('should delegate markStart to performanceService.startMark', () => {
    markStart(PERF_MARKS.APP_STARTUP);

    expect(performanceService.startMark).toHaveBeenCalledWith('app-startup');
    expect(performanceService.startMark).toHaveBeenCalledTimes(1);
  });

  it('should delegate markEnd to performanceService.endMark', () => {
    markEnd(PERF_MARKS.STORE_HYDRATION);

    expect(performanceService.endMark).toHaveBeenCalledWith('store-hydration');
    expect(performanceService.endMark).toHaveBeenCalledTimes(1);
  });

  it('should work with all defined mark names', () => {
    const allMarks = Object.values(PERF_MARKS);
    expect(allMarks.length).toBe(13);

    allMarks.forEach((mark) => {
      markStart(mark);
      markEnd(mark);
    });

    expect(performanceService.startMark).toHaveBeenCalledTimes(13);
    expect(performanceService.endMark).toHaveBeenCalledTimes(13);
  });
});
