import { createRequire } from 'node:module';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { render, screen, waitFor } from '@/test-utils';
import type { GenerationQueueItem, GenerationTask, PaidJobTask } from '@core/types';

import { ActivityPage } from './ActivityPage';

interface NativeJob extends GenerationTask {
  approvedSubmission?: { body: string };
}

interface NativeStore {
  get: (id: string) => Promise<NativeJob | undefined>;
  readAll: () => Promise<NativeJob[]>;
  put: (job: NativeJob) => Promise<void>;
}

interface NativeEngine {
  store: NativeStore;
  active: Map<string, Promise<unknown>>;
  resumeAll: () => Promise<NativeJob[]>;
}

type NativeHandler = (event: unknown, input?: unknown) => Promise<unknown>;

const require = createRequire(import.meta.url);
const { PaidJobEngine } = require('../../../electron/paid-job-engine.cjs') as {
  PaidJobEngine: new (options: Record<string, unknown>) => NativeEngine;
};
const { registerPaidJobsIpc } = require('../../../electron/ipc/paid-jobs-ipc.cjs') as {
  registerPaidJobsIpc: (options: Record<string, unknown>) => void;
};

const { localItems, retryQueueItem } = vi.hoisted(() => ({
  localItems: [] as GenerationQueueItem[],
  retryQueueItem: vi.fn(),
}));

vi.mock('@core/store/useGenerationQueueStore', () => ({
  useGenerationQueueStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      items: localItems,
      activeCount: 0,
      pendingCount: 0,
      cancel: vi.fn(),
      retry: retryQueueItem,
    }),
}));

const legacyJob = (): NativeJob => ({
  id: 'legacy-scene-job',
  status: 'Queued',
  prompt: 'A calm coastal scene.',
  videoUrl: null,
  settings: {},
  timestamp: 1,
  productionRunId: 'run',
  productionShotId: 1,
  productionTakeId: 'take',
  request: {
    modelId: 'veo-3.1-fast',
    mode: 'text-to-video',
    prompt: 'A calm coastal scene.',
    durationSeconds: 8,
    aspectRatio: '16:9',
    resolution: '720p',
    referenceAssetIds: [],
  },
  costApproval: {
    approvalId: 'legacy-approval',
    modelId: 'veo-3.1-fast',
    maximumChargeUsd: 0.8,
    currency: 'USD',
    confidence: 'exact',
    sourceUrl: 'https://ai.google.dev/gemini-api/docs/pricing',
    verifiedDate: '2026-08-01',
    approvedAt: 1,
  },
});

async function desktopFixture(job: NativeJob) {
  const jobs = new Map([[job.id, structuredClone(job)]]);
  const listeners = new Set<(value: PaidJobTask) => void>();
  const store: NativeStore = {
    get: async (id) => structuredClone(jobs.get(id)),
    readAll: async () => structuredClone([...jobs.values()]),
    put: async (value) => {
      jobs.set(value.id, structuredClone(value));
    },
  };
  const post = vi.fn(async () => new Response('Rejected synthetic request', { status: 400 }));
  const engine = new PaidJobEngine({
    store,
    getApiKey: async () => 'synthetic-test-key',
    fetchImpl: post,
    onUpdate: (value: NativeJob) => {
      for (const listener of listeners) listener(structuredClone(value));
    },
  });
  const handlers = new Map<string, NativeHandler>();
  const approve = vi.fn(async () => ({ response: 0 }));
  registerPaidJobsIpc({
    ipcMain: { handle: (name: string, handler: NativeHandler) => handlers.set(name, handler) },
    getEngine: () => engine,
    dialog: { showMessageBox: approve },
    getMainWindow: () => null,
  });
  const retryPaidJob = vi.fn((id: string) => handlers.get('paid-job-retry')!(null, id));
  const submitPaidJob = vi.fn();
  window.electron = {
    listPaidJobs: store.readAll,
    retryPaidJob,
    submitPaidJob,
    onPaidJobUpdate: (listener: (value: PaidJobTask) => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  } as unknown as NonNullable<typeof window.electron>;
  await engine.resumeAll();
  return { engine, store, post, approve, retryPaidJob, submitPaidJob };
}

describe('Activity paid retry through the renderer service and native approval boundary', () => {
  beforeEach(() => {
    localItems.length = 0;
    retryQueueItem.mockClear();
  });

  afterEach(() => {
    delete window.electron;
  });

  it('reapproves an unsent linked legacy scene job from the durable activity card', async () => {
    const desktop = await desktopFixture(legacyJob());
    expect((await desktop.store.get('legacy-scene-job'))?.status).toBe('Error');
    expect(desktop.post).not.toHaveBeenCalled();
    const { user } = render(<ActivityPage />);
    await user.click(await screen.findByRole('button', { name: 'Review and approve retry' }));
    await waitFor(() => expect(desktop.post).toHaveBeenCalledOnce());
    await desktop.engine.active.get('legacy-scene-job');
    expect(desktop.approve).toHaveBeenCalledOnce();
    expect(desktop.retryPaidJob).toHaveBeenCalledWith('legacy-scene-job');
    expect(desktop.submitPaidJob).not.toHaveBeenCalled();
    expect(retryQueueItem).not.toHaveBeenCalled();
    const retried = await desktop.store.get('legacy-scene-job');
    expect(retried?.costApproval?.hashVersion).toBe(2);
    expect(retried?.costApproval?.approvalId).not.toBe('legacy-approval');
    expect(retried?.approvedSubmission?.body).toContain('A calm coastal scene.');
  });

  it('routes the failed local paid queue action to native reapproval instead of re-enqueueing its payload', async () => {
    const original = legacyJob();
    localItems.push({
      id: 'local-wrapper',
      type: 'video',
      label: 'Failed local wrapper',
      payload: original,
      status: 'failed',
      priority: 0,
      progress: 0,
      retryCount: 3,
      queuedOffline: false,
      createdAt: 1,
    });
    const desktop = await desktopFixture(original);
    const { user } = render(<ActivityPage />);
    await screen.findAllByRole('button', { name: 'Review and approve retry' });
    await user.click(screen.getAllByRole('button', { name: 'Review and approve retry' })[0]);
    await waitFor(() => expect(desktop.post).toHaveBeenCalledOnce());
    await desktop.engine.active.get(original.id);
    expect(desktop.retryPaidJob).toHaveBeenCalledWith(original.id);
    expect(desktop.approve).toHaveBeenCalledOnce();
    expect(retryQueueItem).not.toHaveBeenCalled();
    expect(desktop.submitPaidJob).not.toHaveBeenCalled();
  });

  it('offers no reapproval for an uncertain submission with no operation identity', async () => {
    const original = { ...legacyJob(), status: 'Submitting' as const };
    localItems.push({
      id: 'local-uncertain',
      type: 'video',
      label: 'Uncertain local wrapper',
      payload: original,
      status: 'failed',
      priority: 0,
      progress: 0,
      retryCount: 3,
      queuedOffline: false,
      createdAt: 1,
    });
    const desktop = await desktopFixture(original);
    render(<ActivityPage />);
    await screen.findByText(/Submission outcome is uncertain/);
    expect(
      screen.queryByRole('button', { name: 'Review and approve retry' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
    expect(desktop.approve).not.toHaveBeenCalled();
    expect(desktop.post).not.toHaveBeenCalled();
    expect(desktop.retryPaidJob).not.toHaveBeenCalled();
    expect(retryQueueItem).not.toHaveBeenCalled();
  });
});
