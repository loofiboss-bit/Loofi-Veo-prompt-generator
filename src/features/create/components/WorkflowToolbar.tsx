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
    <div className="flex flex-col gap-4 border-b border-slate-800 pb-5 lg:flex-row lg:items-end lg:justify-end">
      <div className="flex flex-wrap gap-2">
        <a
          href={`https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator/wiki/${STEP_WIKI[activeStep]}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-900"
        >
          {t('help')}
        </a>
        {workflow.runs.length > 0 && (
          <select
            aria-label={t('labels.productionRun')}
            value={workflow.activeRun?.id ?? ''}
            onChange={(event) => workflow.selectRun(event.target.value)}
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
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
            className="inline-flex items-center gap-2 rounded-md border border-blue-500 px-4 py-2 text-sm font-semibold text-blue-200 hover:bg-blue-950"
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
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50"
        >
          <Icon name="sparkles" className="h-4 w-4" />
          {t('actions.newPlan')}
        </button>
      </div>
    </div>
  );
}
