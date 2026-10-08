import { Link, useSearchParams } from 'react-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  const [params] = useSearchParams();
  const requestedJob = params.get('job');
  const focusedJob = useRef<string | null>(null);
  const { t } = useTranslation('common');
  const { t: flow } = useTranslation('create');
  const queueItems = useGenerationQueueStore((state) => state.items);
  const activeCount = useGenerationQueueStore((state) => state.activeCount);
  const pendingCount = useGenerationQueueStore((state) => state.pendingCount);
  const cancelQueueItem = useGenerationQueueStore((state) => state.cancel);
  const retryQueueItem = useGenerationQueueStore((state) => state.retry);
  const [durableJobs, setDurableJobs] = useState<PaidJobTask[]>([]);
  const [actionError, setActionError] = useState('');
  const [loadError, setLoadError] = useState(false);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  useEffect(() => {
    if (!requestedJob || focusedJob.current === requestedJob) return;
    const card = document.getElementById(`paid-job-${requestedJob}`);
    if (card) {
      card.focus();
      focusedJob.current = requestedJob;
    }
  }, [requestedJob, durableJobs]);

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
    } catch (failure) {
      setActionError(failure instanceof Error ? failure.message : flow('flow.recoveryUnavailable'));
    } finally {
      setPendingActionId(null);
    }
  };

  return (
    <section className="creator-page min-h-full px-4 py-5 text-slate-100 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="creator-page-header border-b border-slate-800 pb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-300">
            {t('activity.queueEyebrow')}
          </p>
          <h1 className="mt-1 text-lg font-semibold">{t('sidebar.activity')}</h1>
          <p className="mt-2 text-sm text-slate-400">{t('activity.consolidatedDescription')}</p>
        </header>

        <div className="mt-4 grid grid-cols-2 gap-2 xl:grid-cols-4">
          {[
            [t('activity.localRunning'), activeCount],
            [t('activity.localQueued'), pendingCount],
            [t('activity.durableActive'), durableActiveCount],
            [t('activity.needsAttention'), durableAttentionCount],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              className="creator-activity-row rounded-lg border border-slate-800 bg-slate-900 p-3"
            >
              <p className="text-sm text-slate-400">{label}</p>
              <p className="mt-1 text-lg font-semibold text-blue-300">{value}</p>
            </div>
          ))}
        </div>

        <section aria-labelledby="local-queue-heading" className="mt-6">
          <h2 id="local-queue-heading" className="text-lg font-semibold">
            {t('activity.localQueue')}
          </h2>
          <div className="mt-3 space-y-2" aria-live="polite" aria-relevant="additions text">
            {queueItems.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-700 p-6 text-slate-400">
                {t('activity.noLocalQueue')}
              </p>
            ) : (
              queueItems.map((item) => (
                <article
                  key={item.id}
                  className="creator-activity-row rounded-lg border border-slate-800 bg-slate-900 p-3"
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

        <section aria-labelledby="durable-jobs-heading" className="mt-6">
          <h2 id="durable-jobs-heading" className="text-lg font-semibold">
            {t('activity.durableJobs')}
          </h2>
          {actionError && (
            <p role="alert" className="mt-3 text-sm text-amber-300">
              {actionError}
            </p>
          )}
          {loadError && (
            <p role="alert" className="mt-3 rounded-xl border border-amber-700 p-4 text-amber-200">
              {t('activity.loadFailed')}
            </p>
          )}
          <div className="mt-3 space-y-2" aria-live="polite" aria-relevant="additions text">
            {durableJobs.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-700 p-6 text-slate-400">
                {t('activity.noDurableJobs')}
              </p>
            ) : (
              durableJobs.map((job) => {
                const isMusic = 'jobKind' in job && job.jobKind === 'music';
                const canCancel =
                  ACTIVE_DURABLE_STATUSES.has(job.status) || job.status === 'Queued';
                const videoJob =
                  'productionRunId' in job &&
                  job.productionRunId &&
                  job.productionShotId !== undefined &&
                  job.productionTakeId
                    ? job
                    : null;
                const canRecover =
                  videoJob &&
                  videoJob.providerOperationName &&
                  ATTENTION_DURABLE_STATUSES.has(job.status);
                const canRetry = !videoJob && job.status === 'Error';
                return (
                  <article
                    id={`paid-job-${job.id}`}
                    tabIndex={-1}
                    key={job.id}
                    className="creator-activity-row rounded-lg border border-slate-800 bg-slate-900 p-3"
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
                    {videoJob && (
                      <Link
                        to={`/create?run=${encodeURIComponent(videoJob.productionRunId!)}&shot=${videoJob.productionShotId}`}
                        className="mt-2 inline-block text-sm text-blue-300 underline"
                      >
                        {flow('flow.production')}
                      </Link>
                    )}
                    {videoJob &&
                      job.status === 'RecoveryRequired' &&
                      !videoJob.providerOperationName && (
                        <p className="mt-2 text-xs text-amber-300">
                          {flow('flow.recoveryAmbiguous')}
                        </p>
                      )}
                    {(canCancel || canRetry || canRecover) && (
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
                        {canRecover && (
                          <button
                            type="button"
                            disabled={pendingActionId === job.id}
                            className="rounded bg-blue-600 px-3 py-1.5 text-sm disabled:opacity-50"
                            onClick={() => {
                              setPendingActionId(job.id);
                              void paidJobService
                                .recover({
                                  id: job.id,
                                  runId: videoJob!.productionRunId!,
                                  shotId: videoJob!.productionShotId!,
                                  takeId: videoJob!.productionTakeId!,
                                })
                                .then(() => refreshDurableJobs())
                                .finally(() => setPendingActionId(null));
                            }}
                          >
                            {flow('flow.recoveryCheck')}
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
    </section>
  );
}
