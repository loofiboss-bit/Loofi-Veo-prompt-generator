import type { PaidJobTask } from '@core/types';

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
    return (await window.electron?.listPaidJobs?.()) ?? [];
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
