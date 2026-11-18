import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TimelineRenderPlanV1 } from '@core/types/creatorDelivery';
const { data, start, retry, cancel } = vi.hoisted(() => ({
  data: new Map<string, unknown>(),
  start: vi.fn(),
  retry: vi.fn(),
  cancel: vi.fn(),
}));
vi.mock('idb-keyval', () => ({
  createStore: vi.fn(),
  keys: async () => [...data.keys()],
  get: async (id: string) => data.get(id),
  update: async (id: string, change: (value: unknown) => unknown) => {
    data.set(id, change(data.get(id)));
  },
}));
vi.mock('@core/services/creatorDeliveryService', () => ({
  hashRenderContent: async (value: unknown) => JSON.stringify(value),
}));
vi.mock('./useRenderJobsStore', () => ({
  useRenderJobsStore: { getState: () => ({ start, retry, cancel, receive: vi.fn() }) },
}));
const plan = (ratio: '16:9' | '1:1'): TimelineRenderPlanV1 =>
  ({ projectId: 'project', contentHash: ratio, aspectRatio: ratio }) as TimelineRenderPlanV1;
const fresh = async () => {
  vi.resetModules();
  return (await import('./useRenderBatchStore')).useRenderBatchStore;
};
beforeEach(() => {
  data.clear();
  vi.clearAllMocks();
  cancel.mockResolvedValue(undefined);
  delete window.electron;
});
describe('project-scoped durable export batches', () => {
  it('cancels a native job acknowledged after the user cancelled and never submits the next format', async () => {
    let acknowledge: (job: unknown) => void = () => {};
    start.mockImplementation(
      () =>
        new Promise((resolve) => {
          acknowledge = resolve;
        }),
    );
    const store = await fresh();
    const id = await store.getState().start([plan('16:9'), plan('1:1')]);
    await vi.waitFor(() => expect(start).toHaveBeenCalledOnce());
    await store.getState().cancel(id);
    acknowledge({ id: 'late-job', projectId: 'project', status: 'rendering', progress: 0 });
    await vi.waitFor(() => expect(cancel).toHaveBeenCalledWith('late-job'));
    expect(start).toHaveBeenCalledOnce();
    expect(store.getState().batches[0].status).toBe('cancelled');
  });
  it('restores interrupted batches without automatically submitting and skips completed formats on explicit resume', async () => {
    data.set('saved', {
      schemaVersion: 1,
      id: 'saved',
      projectId: 'project',
      status: 'running',
      cancelRequested: false,
      items: [
        { plan: plan('16:9'), complete: true, jobId: 'done' },
        { plan: plan('1:1'), complete: false, jobId: 'failed' },
      ],
    });
    window.electron = {
      getTimelineRenderJob: vi.fn().mockResolvedValue({ id: 'failed', status: 'failed' }),
    } as unknown as NonNullable<typeof window.electron>;
    retry.mockResolvedValue({ id: 'retry', status: 'complete', progress: 1 });
    const store = await fresh();
    await store.getState().hydrate();
    expect(store.getState().batches[0].status).toBe('interrupted');
    expect(start).not.toHaveBeenCalled();
    await store.getState().resume('saved');
    await vi.waitFor(() => expect(store.getState().batches[0].status).toBe('complete'));
    expect(retry).toHaveBeenCalledWith('failed');
    expect(start).not.toHaveBeenCalled();
    expect(store.getState().batches[0].items.every((item) => item.complete)).toBe(true);
  });
  it('rejects plans spanning projects before any native submission', async () => {
    const store = await fresh();
    await expect(
      store.getState().start([plan('16:9'), { ...plan('1:1'), projectId: 'other' }]),
    ).rejects.toThrow('one project');
    expect(start).not.toHaveBeenCalled();
  });
});
