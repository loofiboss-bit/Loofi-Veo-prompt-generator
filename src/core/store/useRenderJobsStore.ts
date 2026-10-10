import { create } from 'zustand';
import type { TimelineRenderJobV1, TimelineRenderPlanV1 } from '@core/types/creatorDelivery';

interface RenderJobsState {
  jobs: TimelineRenderJobV1[];
  hydrate: () => Promise<void>;
  start: (plan: TimelineRenderPlanV1) => Promise<TimelineRenderJobV1>;
  retry: (id: string) => Promise<TimelineRenderJobV1>;
  cancel: (id: string) => Promise<void>;
  receive: (job: TimelineRenderJobV1) => void;
}
let subscribed = false;
/** Native owns persistence and execution. This store survives route and panel lifecycles. */
export const useRenderJobsStore = create<RenderJobsState>((set, get) => ({
  jobs: [],
  receive: (job) =>
    set((state) => {
      const previous = state.jobs.find((item) => item.id === job.id);
      const rank = { queued: 0, rendering: 1, verifying: 2, complete: 3, failed: 3, cancelled: 3 };
      // A start/get reply may arrive after a newer native progress event.
      if (
        previous &&
        (rank[previous.status] > rank[job.status] ||
          (previous.status === job.status && previous.progress > job.progress))
      )
        return state;
      return { jobs: [...state.jobs.filter((item) => item.id !== job.id), job] };
    }),
  hydrate: async () => {
    if (!subscribed && window.electron?.onTimelineRenderUpdate) {
      window.electron.onTimelineRenderUpdate((job) => get().receive(job));
      subscribed = true;
    }
    const jobs = await window.electron?.listTimelineRenderJobs?.();
    // Merge with events that may have arrived while the journal was being read.
    if (jobs)
      set((state) => ({
        jobs: [
          ...jobs.filter((job) => !state.jobs.some((item) => item.id === job.id)),
          ...state.jobs,
        ],
      }));
  },
  start: async (plan) => {
    if (!window.electron?.startTimelineRender) throw new Error('Desktop rendering is unavailable.');
    await get().hydrate();
    const job = await window.electron.startTimelineRender(plan);
    get().receive(job);
    return job;
  },
  retry: async (id) => {
    if (!window.electron?.retryTimelineRender) throw new Error('Desktop rendering is unavailable.');
    await get().hydrate();
    const job = await window.electron.retryTimelineRender(id);
    get().receive(job);
    return job;
  },
  cancel: async (id) => {
    await window.electron?.cancelTimelineRender?.(id);
    const job = await window.electron?.getTimelineRenderJob?.(id);
    if (job) get().receive(job);
  },
}));
