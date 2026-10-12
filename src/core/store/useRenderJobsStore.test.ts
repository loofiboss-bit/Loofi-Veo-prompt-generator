import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRenderJobsStore } from './useRenderJobsStore';
import type { TimelineRenderJobV1, TimelineRenderPlanV1 } from '@core/types/creatorDelivery';

const job: TimelineRenderJobV1 = {
  id: 'job',
  projectId: 'p',
  contentHash: 'hash',
  status: 'rendering',
  progress: 0.2,
};
describe('native render job store', () => {
  beforeEach(() => useRenderJobsStore.setState({ jobs: [] }));
  it('retains jobs outside panel lifecycle and restores the native journal', async () => {
    Object.defineProperty(window, 'electron', {
      configurable: true,
      value: { listTimelineRenderJobs: vi.fn().mockResolvedValue([{ ...job, status: 'failed' }]) },
    });
    await useRenderJobsStore.getState().hydrate();
    expect(useRenderJobsStore.getState().jobs[0].status).toBe('failed');
    useRenderJobsStore.getState().receive({ ...job, status: 'complete', progress: 1 });
    await useRenderJobsStore.getState().hydrate();
    expect(useRenderJobsStore.getState().jobs[0].status).toBe('complete');
  });
  it('only explicit cancel invokes cancellation and retains terminal status', async () => {
    const cancel = vi.fn().mockResolvedValue(true);
    Object.defineProperty(window, 'electron', {
      configurable: true,
      value: {
        cancelTimelineRender: cancel,
        getTimelineRenderJob: vi.fn().mockResolvedValue({ ...job, status: 'cancelled' }),
      },
    });
    useRenderJobsStore.getState().receive(job);
    expect(cancel).not.toHaveBeenCalled();
    await useRenderJobsStore.getState().cancel(job.id);
    expect(cancel).toHaveBeenCalledWith(job.id);
    expect(useRenderJobsStore.getState().jobs[0].status).toBe('cancelled');
  });
  it('subscribes before starting and retries saved native plans', async () => {
    let receive: (value: TimelineRenderJobV1) => void = () => {};
    const retry = vi.fn().mockResolvedValue({ ...job, id: 'retried' });
    Object.defineProperty(window, 'electron', {
      configurable: true,
      value: {
        onTimelineRenderUpdate: vi.fn().mockImplementation((listener) => {
          receive = listener;
          return vi.fn();
        }),
        listTimelineRenderJobs: vi.fn().mockResolvedValue([]),
        startTimelineRender: vi.fn().mockResolvedValue(job),
        retryTimelineRender: retry,
      },
    });
    await useRenderJobsStore.getState().start({ contentHash: 'hash' } as TimelineRenderPlanV1);
    receive({ ...job, status: 'complete', progress: 1 });
    expect(useRenderJobsStore.getState().jobs[0].status).toBe('complete');
    await useRenderJobsStore.getState().retry(job.id);
    expect(retry).toHaveBeenCalledWith(job.id);
    expect(useRenderJobsStore.getState().jobs).toHaveLength(2);
  });
});
