import type { PaidJobTask } from '@core/types';

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
    return (await window.electron?.retryPaidJob?.(id)) ?? false;
  }
}

export const paidJobService = PaidJobService.getInstance();
