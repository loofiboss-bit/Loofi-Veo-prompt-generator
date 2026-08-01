import { useTranslation } from 'react-i18next';

import type { CreateWorkflowController } from '../hooks/useCreateWorkflow';

export function RunSummary({ workflow }: { workflow: CreateWorkflowController }) {
  const { t } = useTranslation('create');
  const { activeRun } = workflow;

  if (!activeRun) return null;

  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
        <p className="text-xs text-slate-500">{t('labels.runStatus')}</p>
        <p className="mt-1 text-lg font-semibold text-blue-300">{activeRun.status}</p>
      </div>
      <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
        <p className="text-xs text-slate-500">{t('labels.shots')}</p>
        <p className="mt-1 text-lg font-semibold">{activeRun.shots.length}</p>
      </div>
      <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
        <p className="text-xs text-slate-500">{t('labels.planEstimate')}</p>
        <p className="mt-1 text-lg font-semibold text-emerald-300">
          ${activeRun.cost.estimatedUsd.toFixed(2)}
        </p>
      </div>
      <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
        <p className="text-xs text-slate-500">{t('labels.accepted')}</p>
        <p className="mt-1 text-lg font-semibold">
          {activeRun.shots.filter((shot) => shot.status === 'accepted').length}/
          {activeRun.shots.length}
        </p>
      </div>
    </section>
  );
}
