import { useTranslation } from 'react-i18next';

import { CostApproval } from '@features/production/components/CostApproval';
import { ProductionPreflightPanel } from '@features/production/components/ProductionPreflightPanel';
import type { CreateWorkflowController } from '../hooks/useCreateWorkflow';

export function GenerateStep({ workflow }: { workflow: CreateWorkflowController }) {
  const { t } = useTranslation('create');

  return (
    <CostApproval>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-semibold">{t('labels.approvalPreflight')}</h2>
          <p className="text-xs text-slate-400">{t('labels.approvalRule')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={workflow.selectAllPendingShots}
            className="rounded-md bg-slate-800 px-3 py-2 text-xs font-semibold hover:bg-slate-700"
          >
            {t('actions.selectPending')}
          </button>
          <span className="rounded-md border border-slate-700 px-3 py-2 text-xs">
            {t('labels.maximum', { cost: workflow.selectedCost.toFixed(2) })}
          </span>
          <button
            type="button"
            disabled={
              workflow.selectedShotIds.length === 0 || workflow.preflight?.canApprove === false
            }
            onClick={() => void workflow.approveSelectedShots()}
            className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold hover:bg-emerald-500 disabled:opacity-40"
          >
            {t('actions.approveShots', { count: workflow.selectedShotIds.length })}
          </button>
        </div>
      </div>
      {workflow.preflight && (
        <ProductionPreflightPanel
          result={workflow.preflight}
          onApply={(patch, recommendation) =>
            void workflow.applyPreflightPatch(patch, recommendation)
          }
          onUndo={() => void workflow.undoPreflightPatch()}
          canUndo={workflow.canUndoPreflight}
        />
      )}
    </CostApproval>
  );
}
