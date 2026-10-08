import { useTranslation } from 'react-i18next';

import type { CreateWorkflowController } from '../hooks/useCreateWorkflow';

export function RunSummary({ workflow }: { workflow: CreateWorkflowController }) {
  const { t } = useTranslation('create');
  const { activeRun } = workflow;

  if (!activeRun) return null;

  return (
    <section className="creator-run-summary flex flex-wrap gap-x-6 gap-y-2 rounded-lg border border-slate-800 bg-slate-900/70 px-4 py-3">
      <div className="flex items-center gap-2">
        <p className="text-xs text-slate-500">{t('labels.runStatus')}</p>
        <p className="text-sm font-semibold text-blue-300">{activeRun.status}</p>
      </div>
      <div className="flex items-center gap-2">
        <p className="text-xs text-slate-500">{t('labels.shots')}</p>
        <p className="text-sm font-semibold">{activeRun.shots.length}</p>
      </div>
      <div className="flex items-center gap-2">
        <p className="text-xs text-slate-500">{t('labels.planEstimate')}</p>
        <p className="text-sm font-semibold text-emerald-300">
          ${activeRun.cost.estimatedUsd.toFixed(2)}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <p className="text-xs text-slate-500">{t('labels.accepted')}</p>
        <p className="text-sm font-semibold">
          {activeRun.shots.filter((shot) => shot.status === 'accepted').length}/
          {activeRun.shots.length}
        </p>
      </div>
    </section>
  );
}
