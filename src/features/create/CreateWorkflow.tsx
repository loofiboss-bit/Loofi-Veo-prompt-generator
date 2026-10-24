import { useTranslation } from 'react-i18next';

import type { ProductionStepId } from '@features/production/hooks/useProductionWorkflow';
import Icon from '@shared/components/ui/Icon';
import { RunSummary } from './components/RunSummary';
import { WorkflowToolbar } from './components/WorkflowToolbar';
import { useCreateWorkflow } from './hooks/useCreateWorkflow';
import { BriefStep } from './steps/BriefStep';
import { GenerateStep } from './steps/GenerateStep';
import { ReviewExportStep } from './steps/ReviewExportStep';
import { ShotsStep } from './steps/ShotsStep';

export function CreateWorkflow({
  activeStep = 'generate',
  onNavigateStep,
}: {
  activeStep?: ProductionStepId;
  onNavigateStep?: (step: ProductionStepId) => void;
}) {
  const { t } = useTranslation('create');
  const workflow = useCreateWorkflow();

  const handleGoToBrief = () => {
    if (onNavigateStep) {
      onNavigateStep('brief');
    } else {
      const briefButton = document.querySelector<HTMLButtonElement>(
        'nav.creator-workflow-nav button',
      );
      briefButton?.click();
    }
  };

  return (
    <div data-production-step={activeStep} className="min-h-full text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <WorkflowToolbar activeStep={activeStep} workflow={workflow} />

        {(workflow.feedback || workflow.error) && (
          <div
            role="status"
            aria-live="polite"
            className="rounded-md border border-slate-700 bg-slate-900 p-3 text-sm text-slate-300"
          >
            {workflow.error || workflow.feedback}
          </div>
        )}

        {activeStep === 'brief' && <BriefStep workflow={workflow} />}

        {!workflow.activeRun ? (
          <section className="rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-10 text-center">
            <Icon name="film" className="mx-auto h-10 w-10 text-blue-300" />
            <h2 className="mt-3 text-xl font-semibold">{t('empty.title')}</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-slate-400">{t('empty.description')}</p>
            <div className="mt-5 flex justify-center">
              <button
                type="button"
                onClick={handleGoToBrief}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
              >
                {t('actions.createPlan', 'Create New Plan')}
              </button>
            </div>
          </section>
        ) : (
          <>
            <RunSummary workflow={workflow} />
            {activeStep === 'generate' && <GenerateStep workflow={workflow} />}
            <ShotsStep activeStep={activeStep} workflow={workflow} />
            <ReviewExportStep activeStep={activeStep} workflow={workflow} />
          </>
        )}
      </div>
    </div>
  );
}
