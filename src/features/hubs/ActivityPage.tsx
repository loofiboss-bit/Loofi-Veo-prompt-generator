import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { paidJobService } from '@core/services/paidJobService';
import { useGenerationQueueStore } from '@core/store/useGenerationQueueStore';
import type { PaidJobTask } from '@core/types';

const ACTIVE_DURABLE_STATUSES = new Set([
  'Queued',
  'Init',
  'Processing',
  'Polling',
  'Fetching',
  'Submitting',
]);
const ATTENTION_DURABLE_STATUSES = new Set(['Error', 'RecoveryRequired', 'MediaAtRisk']);

const jobTimestamp = (job: PaidJobTask): number => {
  if ('updatedAt' in job && typeof job.updatedAt === 'number') return job.updatedAt;
  if ('createdAt' in job && typeof job.createdAt === 'number') return job.createdAt;
  return job.timestamp;
};

const mergeDurableJobs = (current: PaidJobTask[], incoming: PaidJobTask[]): PaidJobTask[] => {
  const jobs = new Map(current.map((job) => [job.id, job]));
  for (const job of incoming) {
    const existing = jobs.get(job.id);
    if (!existing || jobTimestamp(job) >= jobTimestamp(existing)) jobs.set(job.id, job);
  }
  return [...jobs.values()].sort((left, right) => jobTimestamp(right) - jobTimestamp(left));
};

export function ActivityPage() {
  const { t } = useTranslation('common');
  const queueItems = useGenerationQueueStore((state) => state.items);
  const activeCount = useGenerationQueueStore((state) => state.activeCount);
  const pendingCount = useGenerationQueueStore((state) => state.pendingCount);
  const cancelQueueItem = useGenerationQueueStore((state) => state.cancel);
  const retryQueueItem = useGenerationQueueStore((state) => state.retry);
  const [durableJobs, setDurableJobs] = useState<PaidJobTask[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);

  const refreshDurableJobs = useCallback(async () => {
    try {
      const jobs = await paidJobService.list();
      setDurableJobs((current) => mergeDurableJobs(current, jobs));
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const unsubscribe = paidJobService.subscribe((job) => {
      if (active) setDurableJobs((current) => mergeDurableJobs(current, [job]));
    });
    void refreshDurableJobs();
    return () => {
      active = false;
      unsubscribe();
    };
  }, [refreshDurableJobs]);

  const durableActiveCount = useMemo(
    () => durableJobs.filter((job) => ACTIVE_DURABLE_STATUSES.has(job.status)).length,
    [durableJobs],
  );
  const durableAttentionCount = useMemo(
    () => durableJobs.filter((job) => ATTENTION_DURABLE_STATUSES.has(job.status)).length,
    [durableJobs],
  );

  const runDurableAction = async (action: 'cancel' | 'retry', id: string) => {
    setPendingActionId(id);
    try {
      const changed = await paidJobService[action](id);
      if (changed) await refreshDurableJobs();
    } finally {
      setPendingActionId(null);
    }
  };

  return (
    <main id="main-content" className="min-h-full bg-slate-950 px-6 py-8 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <header className="border-b border-slate-800 pb-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-300">
            {t('activity.queueEyebrow')}
          </p>
          <h1 className="mt-1 text-3xl font-semibold">{t('sidebar.activity')}</h1>
          <p className="mt-2 text-sm text-slate-400">{t('activity.consolidatedDescription')}</p>
        </header>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            [t('activity.localRunning'), activeCount],
            [t('activity.localQueued'), pendingCount],
            [t('activity.durableActive'), durableActiveCount],
            [t('activity.needsAttention'), durableAttentionCount],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              className="rounded-xl border border-slate-800 bg-slate-900 p-4"
            >
              <p className="text-sm text-slate-400">{label}</p>
              <p className="mt-1 text-2xl font-semibold text-blue-300">{value}</p>
            </div>
          ))}
        </div>

        <section aria-labelledby="local-queue-heading" className="mt-8">
          <h2 id="local-queue-heading" className="text-lg font-semibold">
            {t('activity.localQueue')}
          </h2>
          <div className="mt-3 space-y-3" aria-live="polite" aria-relevant="additions text">
            {queueItems.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-700 p-6 text-slate-400">
                {t('activity.noLocalQueue')}
              </p>
            ) : (
              queueItems.map((item) => (
                <article
                  key={item.id}
                  className="rounded-xl border border-slate-800 bg-slate-900 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold">{item.label}</h3>
                      <p className="mt-1 text-sm text-slate-400">
                        {t('activity.progress', { progress: item.progress })}
                      </p>
                    </div>
                    <span className="rounded bg-slate-800 px-2 py-1 text-xs">{item.status}</span>
                  </div>
                  {item.error && <p className="mt-2 text-sm text-amber-300">{item.error}</p>}
                  <div className="mt-3 flex gap-2">
                    {['pending', 'waiting-online', 'active'].includes(item.status) && (
                      <button
                        type="button"
                        className="rounded border border-slate-700 px-3 py-1.5 text-sm hover:border-blue-400"
                        onClick={() => cancelQueueItem(item.id)}
                      >
                        {t('activity.cancel')}
                      </button>
                    )}
                    {item.status === 'failed' && (
                      <button
                        type="button"
                        className="rounded bg-blue-600 px-3 py-1.5 text-sm hover:bg-blue-500"
                        onClick={() => retryQueueItem(item.id)}
                      >
                        {t('activity.retry')}
                      </button>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section aria-labelledby="durable-jobs-heading" className="mt-8">
          <h2 id="durable-jobs-heading" className="text-lg font-semibold">
            {t('activity.durableJobs')}
          </h2>
          {loadError && (
            <p role="alert" className="mt-3 rounded-xl border border-amber-700 p-4 text-amber-200">
              {t('activity.loadFailed')}
            </p>
          )}
          <div className="mt-3 space-y-3" aria-live="polite" aria-relevant="additions text">
            {durableJobs.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-700 p-6 text-slate-400">
                {t('activity.noDurableJobs')}
              </p>
            ) : (
              durableJobs.map((job) => {
                const isMusic = 'jobKind' in job && job.jobKind === 'music';
                const canCancel =
                  ACTIVE_DURABLE_STATUSES.has(job.status) || job.status === 'Queued';
                const canRetry = job.status === 'Error';
                return (
                  <article
                    key={job.id}
                    className="rounded-xl border border-slate-800 bg-slate-900 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wider text-blue-300">
                          {isMusic ? t('activity.music') : t('activity.video')}
                        </p>
                        <h3 className="mt-1 truncate font-semibold">{job.prompt}</h3>
                      </div>
                      <span className="rounded bg-slate-800 px-2 py-1 text-xs">{job.status}</span>
                    </div>
                    {job.error && <p className="mt-2 text-sm text-amber-300">{job.error}</p>}
                    {(canCancel || canRetry) && (
                      <div className="mt-3 flex gap-2">
                        {canCancel && (
                          <button
                            type="button"
                            disabled={pendingActionId === job.id}
                            className="rounded border border-slate-700 px-3 py-1.5 text-sm hover:border-blue-400 disabled:opacity-50"
                            onClick={() => void runDurableAction('cancel', job.id)}
                          >
                            {t('activity.cancel')}
                          </button>
                        )}
                        {canRetry && (
                          <button
                            type="button"
                            disabled={pendingActionId === job.id}
                            className="rounded bg-blue-600 px-3 py-1.5 text-sm hover:bg-blue-500 disabled:opacity-50"
                            onClick={() => void runDurableAction('retry', job.id)}
                          >
                            {t('activity.retry')}
                          </button>
                        )}
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
