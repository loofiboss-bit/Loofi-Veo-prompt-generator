import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PaidJobTask } from '@core/types';

import { paidJobService } from './paidJobService';

describe('paidJobService', () => {
  beforeEach(() => {
    delete window.electron;
  });

  it('fails safely when the desktop bridge is unavailable', async () => {
    expect(await paidJobService.list()).toEqual([]);
    expect(await paidJobService.cancel('job-1')).toBe(false);
    expect(await paidJobService.retry('job-1')).toBe(false);
    expect(() => paidJobService.subscribe(() => {})).not.toThrow();
  });

  it('lists, observes, cancels, and retries durable jobs through the narrow bridge', async () => {
    const job = {
      id: 'job-1',
      status: 'Queued',
      videoUrl: null,
      prompt: 'Durable video',
      settings: {},
      timestamp: 1,
    } satisfies PaidJobTask;
    const callback = vi.fn();
    const unsubscribe = vi.fn();
    const listPaidJobs = vi.fn().mockResolvedValue([job]);
    const cancelPaidJob = vi.fn().mockResolvedValue(true);
    const retryPaidJob = vi.fn().mockResolvedValue(true);
    const onPaidJobUpdate = vi.fn().mockReturnValue(unsubscribe);
    window.electron = {
      listPaidJobs,
      cancelPaidJob,
      retryPaidJob,
      onPaidJobUpdate,
    } as unknown as NonNullable<typeof window.electron>;

    await expect(paidJobService.list()).resolves.toEqual([job]);
    expect(paidJobService.subscribe(callback)).toBe(unsubscribe);
    expect(onPaidJobUpdate).toHaveBeenCalledWith(callback);
    await expect(paidJobService.cancel('job-1')).resolves.toBe(true);
    await expect(paidJobService.retry('job-1')).resolves.toBe(true);
  });
});
