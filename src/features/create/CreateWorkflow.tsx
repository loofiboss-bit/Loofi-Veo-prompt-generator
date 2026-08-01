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

export function CreateWorkflow({ activeStep = 'generate' }: { activeStep?: ProductionStepId }) {
  const { t } = useTranslation('create');
  const workflow = useCreateWorkflow();

  return (
    <div
      data-production-step={activeStep}
      className="min-h-full bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-8"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
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
