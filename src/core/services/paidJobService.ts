import type { PaidJobTask } from '@core/types';
import { costTrackingService } from './costTrackingService';

export async function recordCompletedPaidJobCost(job: PaidJobTask): Promise<void> {
  if (job.status !== 'Complete') return;
  const cost = job.costApproval?.maximumChargeUsd ?? 0;
  if (cost > 0 && job.request) {
    const isMusic = 'jobKind' in job && job.jobKind === 'music';
    const duration = 'durationSeconds' in job.request ? job.request.durationSeconds : undefined;
    await costTrackingService
      .recordPaidJobCost({
        sourceJobId: job.id,
        timestamp: job.timestamp,
        modelId: job.request.modelId,
        endpointId: 'desktop-paid-job',
        inputTokens: 0,
        outputTokens: 0,
        videoDurationSeconds: duration,
        costUsd: cost,
        isEstimated: true,
        description: `${isMusic ? 'Lyria' : 'Veo'} (${job.request.modelId}): ${job.prompt.slice(0, 40)}`,
      })
      .catch(() => {});
  }
}

/** Only a definitive pre-submission/rejected failure can authorize a fresh paid attempt. */
export const canReapprovePaidJob = (job: PaidJobTask): boolean =>
  job.status === 'Error' &&
  !('providerOperationName' in job && job.providerOperationName) &&
  !('providerInteractionId' in job && job.providerInteractionId);

class PaidJobService {
  private static instance: PaidJobService;

  static getInstance(): PaidJobService {
    if (!PaidJobService.instance) PaidJobService.instance = new PaidJobService();
    return PaidJobService.instance;
  }

  async list(): Promise<PaidJobTask[]> {
    const jobs = (await window.electron?.listPaidJobs?.()) ?? [];
    for (const job of jobs) {
      // A ledger failure must not hide the native job or invite another submission.
      await recordCompletedPaidJobCost(job).catch(() => {});
    }
    return jobs;
  }

  subscribe(callback: (job: PaidJobTask) => void): () => void {
    return window.electron?.onPaidJobUpdate?.(callback) ?? (() => {});
  }

  async cancel(id: string): Promise<boolean> {
    return (await window.electron?.cancelPaidJob?.(id)) ?? false;
  }

  async recover(context: {
    id: string;
    runId: string;
    shotId: number;
    takeId: string;
  }): Promise<boolean> {
    return (await window.electron?.recoverPaidJob?.(context)) ?? false;
  }

  async retry(id: string): Promise<boolean> {
    const job = (await this.list()).find((candidate) => candidate.id === id);
    if (!job) return false;
    const recoverable =
      'providerOperationName' in job &&
      job.providerOperationName &&
      ['Error', 'RecoveryRequired', 'MediaAtRisk'].includes(job.status);
    if (!canReapprovePaidJob(job) && !recoverable) return false;
    return (await window.electron?.retryPaidJob?.(id)) ?? false;
  }
}

export const paidJobService = PaidJobService.getInstance();
