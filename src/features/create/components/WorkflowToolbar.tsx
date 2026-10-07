import { useTranslation } from 'react-i18next';

import type { ProductionStepId } from '@features/production/hooks/useProductionWorkflow';
import Icon from '@shared/components/ui/Icon';
import type { CreateWorkflowController } from '../hooks/useCreateWorkflow';

const STEP_WIKI: Record<ProductionStepId, string> = {
  brief: 'Production-Workflow',
  scenes: 'Production-Workflow',
  assets: 'Assets-and-Continuity',
  generate: 'Model-Selection-and-Cost',
  review: 'Review-and-Revision',
  export: 'Export-and-NLE-Handoff',
};

interface WorkflowToolbarProps {
  activeStep: ProductionStepId;
  workflow: CreateWorkflowController;
}

export function WorkflowToolbar({ activeStep, workflow }: WorkflowToolbarProps) {
  const { t } = useTranslation('create');

  return (
    <div className="flex flex-col gap-4 border-b border-slate-800/60 pb-5 lg:flex-row lg:items-center lg:justify-end">
      <div className="flex flex-wrap items-center gap-2.5">
        <a
          href={`https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/wiki/${STEP_WIKI[activeStep]}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700/80 bg-slate-900/50 px-3.5 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-all shadow-sm"
        >
          {t('help')}
        </a>
        {workflow.runs.length > 0 && (
          <select
            aria-label={t('labels.productionRun')}
            value={workflow.activeRun?.id ?? ''}
            onChange={(event) => workflow.selectRun(event.target.value)}
            className="rounded-xl border border-slate-700/80 bg-slate-900/80 px-3.5 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 shadow-sm"
          >
            {workflow.runs.map((run) => (
              <option key={run.id} value={run.id}>
                {run.title} — {run.status}
              </option>
            ))}
          </select>
        )}
        {workflow.activeRun && (
          <button
            type="button"
            onClick={() => void workflow.handleEnhancePlan()}
            title={`${workflow.planEnhancementEstimate.explanation} ${t('labels.source')}: ${workflow.planEnhancementEstimate.source.sourceUrl}`}
            className="inline-flex items-center gap-2 rounded-xl border border-blue-500/50 bg-blue-950/40 backdrop-blur-sm px-4 py-2 text-xs font-semibold text-blue-200 hover:bg-blue-900/50 hover:border-blue-400 transition-all shadow-sm"
          >
            {t('actions.approvePlan', {
              cost: workflow.planEnhancementEstimate.maximumChargeUsd?.toFixed(3),
            })}
          </button>
        )}
        <button
          type="button"
          onClick={() => void workflow.handleCreatePlan()}
          disabled={workflow.isLoading}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:from-blue-500 hover:to-indigo-500 transition-all disabled:opacity-50 active:scale-[0.98]"
        >
          <Icon name="sparkles" className="h-4 w-4" />
          {t('actions.newPlan')}
        </button>
      </div>
    </div>
  );
}
