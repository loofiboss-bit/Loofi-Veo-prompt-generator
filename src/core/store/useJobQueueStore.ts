/**
 * Job Queue Store
 * Reactive Zustand wrapper around JobQueueService for UI binding.
 * Follows ADR-003: Zustand store pattern.
 *
 * @module useJobQueueStore
 * @since v1.8.0
 */

import { create } from 'zustand';
import {
  jobQueueService,
  type Job,
  type JobType,
  type JobPriority,
} from '@core/services/jobQueueService';

interface JobQueueState {
  /** Snapshot of all jobs (updated via subscription) */
  jobs: ReadonlyArray<Job>;
  /** Whether the service has hydrated from IndexedDB */
  hydrated: boolean;
  /** Count of active + queued jobs (for badge display) */
  pendingCount: number;

  // ── Actions ──────────────────────────────────────────────────────────
  /** Initialize: hydrate from IDB and subscribe to changes */
  initialize: () => Promise<void>;
  /** Enqueue a new job */
  enqueue: (
    type: JobType,
    label: string,
    payload?: unknown,
    priority?: JobPriority,
  ) => Promise<string>;
  /** Cancel a job */
  cancel: (jobId: string) => Promise<boolean>;
  /** Retry a failed job */
  retry: (jobId: string) => Promise<boolean>;
  /** Remove a terminal job from display */
  remove: (jobId: string) => Promise<boolean>;
  /** Clear all completed/failed/cancelled jobs */
  clearHistory: () => Promise<void>;
}

let initialized = false;

export const useJobQueueStore = create<JobQueueState>()((set) => ({
  jobs: [],
  hydrated: false,
  pendingCount: 0,

  initialize: async () => {
    if (initialized) return;
    initialized = true;

    // Subscribe to live updates from the service
    jobQueueService.subscribe((jobs) => {
      const pendingCount = jobs.filter(
        (j) => j.status === 'queued' || j.status === 'processing',
      ).length;
      set({ jobs, pendingCount });
    });

    await jobQueueService.hydrate();
    set({ hydrated: true });
  },

  enqueue: async (type, label, payload, priority) => {
    return jobQueueService.enqueue(type, label, payload, priority);
  },

  cancel: async (jobId) => {
    return jobQueueService.cancel(jobId);
  },

  retry: async (jobId) => {
    return jobQueueService.retry(jobId);
  },

  remove: async (jobId) => {
    return jobQueueService.remove(jobId);
  },

  clearHistory: async () => {
    return jobQueueService.clearHistory();
  },
}));
