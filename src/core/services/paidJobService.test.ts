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
    expect(
      await paidJobService.recover({ id: 'job-1', runId: 'run', shotId: 1, takeId: 'take' }),
    ).toBe(false);
    expect(() => paidJobService.subscribe(() => {})).not.toThrow();
  });

  it('lists, observes, cancels, and retries durable jobs through the narrow bridge', async () => {
    const job = {
      id: 'job-1',
      status: 'Error',
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
  it('recovers only through the dedicated scoped bridge without retry/submission', async () => {
    const recoverPaidJob = vi.fn().mockResolvedValue(true);
    const retryPaidJob = vi.fn();
    const submitPaidJob = vi.fn();
    window.electron = { recoverPaidJob, retryPaidJob, submitPaidJob } as unknown as NonNullable<
      typeof window.electron
    >;
    const context = { id: 'job', runId: 'run', shotId: 1, takeId: 'take' };
    expect(await paidJobService.recover(context)).toBe(true);
    expect(recoverPaidJob).toHaveBeenCalledWith(context);
    expect(retryPaidJob).not.toHaveBeenCalled();
    expect(submitPaidJob).not.toHaveBeenCalled();
  });

  it('does not seek another approval for ambiguous, already-interacted, active or missing jobs', async () => {
    const retryPaidJob = vi.fn();
    const job = { id: 'job', status: 'RecoveryRequired', timestamp: 1 };
    const listPaidJobs = vi.fn().mockResolvedValue([job]);
    window.electron = { listPaidJobs, retryPaidJob } as unknown as NonNullable<
      typeof window.electron
    >;
    expect(await paidJobService.retry('job')).toBe(false);
    listPaidJobs.mockResolvedValue([
      { ...job, status: 'Error', providerInteractionId: 'already-sent' },
    ]);
    expect(await paidJobService.retry('job')).toBe(false);
    listPaidJobs.mockResolvedValue([{ ...job, status: 'Submitting' }]);
    expect(await paidJobService.retry('job')).toBe(false);
    expect(await paidJobService.retry('missing')).toBe(false);
    expect(retryPaidJob).not.toHaveBeenCalled();
  });

  it('recovers a known operation through retry without a new submission', async () => {
    const retryPaidJob = vi.fn().mockResolvedValue(true);
    const submitPaidJob = vi.fn();
    const listPaidJobs = vi
      .fn()
      .mockResolvedValue([
        { id: 'known', status: 'RecoveryRequired', providerOperationName: 'operations/known' },
      ]);
    window.electron = { listPaidJobs, retryPaidJob, submitPaidJob } as unknown as NonNullable<
      typeof window.electron
    >;
    expect(await paidJobService.retry('known')).toBe(true);
    expect(retryPaidJob).toHaveBeenCalledWith('known');
    expect(submitPaidJob).not.toHaveBeenCalled();
  });

  it('records cost for completed paid jobs into costTrackingService idempotently', async () => {
    const { costTrackingService } = await import('./costTrackingService');
    const spy = vi.spyOn(costTrackingService, 'recordCost').mockReturnValue({
      id: 'cost-1',
      modelId: 'veo-3.1-fast',
      endpointId: 'desktop-paid-job',
      inputTokens: 0,
      outputTokens: 0,
      description: 'test',
      costUsd: 0.6,
      timestamp: 1,
      isEstimated: false,
    });
    const completeJob = {
      id: 'paid-job-complete-1',
      status: 'Complete' as const,
      prompt: 'A car driving down a mountain pass',
      request: { modelId: 'veo-3.1-fast', durationSeconds: 6 },
      costApproval: {
        maximumChargeUsd: 0.6,
        approvalId: 'app-1',
        modelId: 'veo-3.1-fast',
        currency: 'USD' as const,
        approvedAt: 1,
      },
    };
    const listPaidJobs = vi.fn().mockResolvedValue([completeJob]);
    window.electron = { listPaidJobs } as unknown as NonNullable<typeof window.electron>;
    await paidJobService.list();
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        modelId: 'veo-3.1-fast',
        costUsd: 0.6,
        isEstimated: false,
      }),
    );
    // Calling list again should not duplicate the cost
    spy.mockClear();
    await paidJobService.list();
    expect(spy).not.toHaveBeenCalled();
  });
});
