import { useTranslation } from 'react-i18next';

import Icon from '@shared/components/ui/Icon';
import type { ProductionStepId } from '@features/production/hooks/useProductionWorkflow';
import type { CreateWorkflowController } from '../hooks/useCreateWorkflow';

interface ReviewExportStepProps {
  activeStep: ProductionStepId;
  workflow: CreateWorkflowController;
}

export function ReviewExportStep({ activeStep, workflow }: ReviewExportStepProps) {
  const { t } = useTranslation('create');

  if (!['review', 'export'].includes(activeStep)) return null;

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {activeStep === 'review' && (
          <label className="flex items-center gap-2 text-xs text-slate-400">
            <input
              type="checkbox"
              checked={workflow.useGeminiReview}
              onChange={(event) => workflow.setUseGeminiReview(event.target.checked)}
              className="accent-blue-500"
            />
            {t('labels.semanticReview')}
          </label>
        )}
        {activeStep === 'export' && (
          <button
            type="button"
            onClick={() => void workflow.handleExport()}
            className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-white"
          >
            <Icon name="copy" className="h-4 w-4" />
            {t('actions.copyPack')}
          </button>
        )}
      </div>
      {activeStep === 'export' && workflow.exportPreview && (
        <textarea
          aria-label={t('labels.exportPreview')}
          readOnly
          value={workflow.exportPreview}
          className="mt-3 h-64 w-full rounded-md border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-slate-300"
        />
      )}
    </section>
  );
}
