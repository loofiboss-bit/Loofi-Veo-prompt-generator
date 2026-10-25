import { create } from 'zustand';
import { createStore, get, keys, update as updateStored } from 'idb-keyval';
import { hashRenderContent } from '@core/services/creatorDeliveryService';
import type { TimelineRenderJobV1, TimelineRenderPlanV1 } from '@core/types/creatorDelivery';
import { useRenderJobsStore } from './useRenderJobsStore';

export interface RenderBatch {
  schemaVersion: 1;
  id: string;
  projectId: string;
  createdAt: number;
  status: 'running' | 'interrupted' | 'failed' | 'complete' | 'cancelled';
  cancelRequested: boolean;
  items: { plan: TimelineRenderPlanV1; jobId?: string; complete: boolean }[];
  error?: string;
}
interface RenderBatchState {
  batches: RenderBatch[];
  hydrate: () => Promise<void>;
  start: (plans: TimelineRenderPlanV1[]) => Promise<string>;
  resume: (id: string) => Promise<void>;
  cancel: (id: string) => Promise<void>;
}
const storage = createStore('veo-render-batches', 'batches-v1');
const active = new Set<string>();
let hydration: Promise<void> | undefined;
let starting = false;
const terminal = (job: TimelineRenderJobV1) =>
  ['complete', 'failed', 'cancelled'].includes(job.status);

/** Persist the plan and intent before each IPC call; no component owns the batch lifecycle. */
export const useRenderBatchStore = create<RenderBatchState>((update, state) => {
  const find = (id: string) => {
    const value = state().batches.find((batch) => batch.id === id);
    if (!value) throw new Error('Saved export batch is unavailable.');
    return value;
  };
  const save = async (batch: RenderBatch, resume = false) => {
    let saved = batch;
    await updateStored<RenderBatch>(
      batch.id,
      (previous) => {
        const cancelled = !resume && (previous?.cancelRequested || batch.cancelRequested);
        saved = cancelled ? { ...batch, cancelRequested: true, status: 'cancelled' } : batch;
        return structuredClone(saved);
      },
      storage,
    );
    update((current) => ({
      batches: [...current.batches.filter((item) => item.id !== batch.id), saved],
    }));
  };
  const run = async (id: string) => {
    if (active.has(id)) return;
    active.add(id);
    try {
      const count = find(id).items.length;
      for (let index = 0; index < count; index++) {
        let batch = find(id);
        if (batch.cancelRequested) break;
        const item = batch.items[index];
        if (item.complete) continue;
        let job = item.jobId
          ? await window.electron?.getTimelineRenderJob?.(item.jobId)
          : undefined;
        if (job && ['failed', 'cancelled'].includes(job.status))
          job = await useRenderJobsStore.getState().retry(job.id);
        else if (!job) job = await useRenderJobsStore.getState().start(item.plan);
        if (!job) throw new Error('The native export job is unavailable.');
        let currentJob: TimelineRenderJobV1 = job;
        // Cancellation may arrive while native start/retry is awaiting its acknowledgement.
        batch = find(id);
        await save({
          ...batch,
          items: batch.items.map((value, i) =>
            i === index ? { ...value, jobId: currentJob!.id } : value,
          ),
        });
        if (find(id).cancelRequested) {
          await useRenderJobsStore.getState().cancel(currentJob.id);
          break;
        }
        while (!terminal(currentJob)) {
          await new Promise((resolve) => setTimeout(resolve, 250));
          if (find(id).cancelRequested) {
            await useRenderJobsStore.getState().cancel(currentJob.id);
            break;
          }
          const latest: TimelineRenderJobV1 | null | undefined =
            await window.electron?.getTimelineRenderJob?.(currentJob.id);
          if (!latest) throw new Error('Export progress is unavailable. Resume the saved batch.');
          useRenderJobsStore.getState().receive(latest);
          currentJob = latest;
        }
        if (find(id).cancelRequested) break;
        if (currentJob.status !== 'complete')
          throw new Error(currentJob.error || 'An export format did not complete.');
        batch = find(id);
        await save({
          ...batch,
          items: batch.items.map((value, i) =>
            i === index ? { ...value, complete: true } : value,
          ),
        });
      }
      const batch = find(id);
      await save({ ...batch, status: batch.cancelRequested ? 'cancelled' : 'complete' });
    } catch (error) {
      const batch = find(id);
      await save({
        ...batch,
        status: batch.cancelRequested ? 'cancelled' : 'failed',
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      active.delete(id);
    }
  };
  return {
    batches: [],
    hydrate: async () => {
      hydration ??= (async () => {
        const stored = await Promise.all(
          (await keys(storage)).map((id) => get<RenderBatch>(id, storage)),
        );
        for (const batch of stored) {
          if (!batch || state().batches.some((item) => item.id === batch.id)) continue;
          await save(batch.status === 'running' ? { ...batch, status: 'interrupted' } : batch);
        }
      })().finally(() => {
        hydration = undefined;
      });
      await hydration;
    },
    start: async (plans) => {
      if (starting) throw new Error('An export batch is already starting.');
      starting = true;
      try {
        if (!plans.length || plans.some((plan) => plan.projectId !== plans[0].projectId))
          throw new Error('An export batch must contain formats from one project.');
        await state().hydrate();
        if (state().batches.some((batch) => batch.status === 'running'))
          throw new Error('An export batch is already running.');
        const id = crypto.randomUUID();
        const items = await Promise.all(
          plans.map(async (plan, index) => {
            const { contentHash: _contentHash, ...base } = plan;
            const snapshot = { ...base, clientRequestId: `${id}:${index}` };
            return {
              plan: { ...snapshot, contentHash: await hashRenderContent(snapshot) },
              complete: false,
            };
          }),
        );
        await save({
          schemaVersion: 1,
          id,
          projectId: plans[0].projectId,
          createdAt: Date.now(),
          status: 'running',
          cancelRequested: false,
          items,
        });
        void run(id).catch((error: unknown) => {
          update((current) => ({
            batches: current.batches.map((batch) =>
              batch.id === id ? { ...batch, status: 'interrupted', error: String(error) } : batch,
            ),
          }));
        });
        return id;
      } finally {
        starting = false;
      }
    },
    resume: async (id) => {
      if (active.has(id)) return;
      if (state().batches.some((batch) => batch.id !== id && batch.status === 'running'))
        throw new Error('An export batch is already running.');
      const batch = find(id);
      if (batch.status === 'complete') return;
      await save({ ...batch, status: 'running', cancelRequested: false, error: undefined }, true);
      void run(id).catch((error: unknown) => {
        update((current) => ({
          batches: current.batches.map((batch) =>
            batch.id === id ? { ...batch, status: 'interrupted', error: String(error) } : batch,
          ),
        }));
      });
    },
    cancel: async (id) => {
      const batch = find(id);
      if (batch.status === 'complete') return;
      await save({ ...batch, cancelRequested: true, status: 'cancelled' });
      const jobId = find(id).items.find((item) => !item.complete && item.jobId)?.jobId;
      if (jobId) await useRenderJobsStore.getState().cancel(jobId);
    },
  };
});
