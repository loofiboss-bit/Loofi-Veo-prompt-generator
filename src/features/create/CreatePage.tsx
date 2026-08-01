import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useProjectStore } from '@core/store/useProjectStore';
import { useProductionRunStore } from '@core/store/useProductionRunStore';
import { CreateWorkflow } from './CreateWorkflow';
import {
  PRODUCTION_STEPS,
  useProductionWorkflow,
} from '@features/production/hooks/useProductionWorkflow';
import { AssetsStep } from '@features/production/steps/AssetsStep';
import { BriefStep } from '@features/production/steps/BriefStep';
import { ExportStep } from '@features/production/steps/ExportStep';
import { GenerateStep } from '@features/production/steps/GenerateStep';
import { ReviewStep } from '@features/production/steps/ReviewStep';
import { ScenesStep } from '@features/production/steps/ScenesStep';
import { MusicGenerator } from './components/MusicGenerator';

export function CreatePage() {
  const { t } = useTranslation('create');
  const projectId = useProjectStore((state) => state.currentProjectId) ?? 'default';
  const activeRun = useProductionRunStore((state) => state.activeRun);
  const workflow = useProductionWorkflow(projectId, activeRun);
  useEffect(() => {
    document.getElementById(`${workflow.currentStep}-step-title`)?.focus();
  }, [workflow.currentStep]);
  const content = <CreateWorkflow activeStep={workflow.currentStep} />;
  const activeContent = {
    brief: <BriefStep>{content}</BriefStep>,
    scenes: <ScenesStep>{content}</ScenesStep>,
    assets: (
      <AssetsStep>
        <MusicGenerator />
        {content}
      </AssetsStep>
    ),
    generate: <GenerateStep>{content}</GenerateStep>,
    review: <ReviewStep>{content}</ReviewStep>,
    export: <ExportStep>{content}</ExportStep>,
  }[workflow.currentStep];

  return (
    <main className="min-h-full bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-300">
            {t('brand')}
          </p>
          <h1 className="mt-1 text-3xl font-semibold">{t('title')}</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">{t('description')}</p>
        </div>
      </header>
      <nav
        aria-label={t('workflowLabel')}
        className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-8"
      >
        <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto">
          {PRODUCTION_STEPS.map((step, index) => {
            const selected = workflow.currentStep === step.id;
            const complete = workflow.completion[step.id];
            return (
              <button
                key={step.id}
                type="button"
                aria-current={selected ? 'step' : undefined}
                onClick={() => workflow.setCurrentStep(step.id)}
                className={`flex min-w-fit items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                  selected
                    ? 'border-blue-400 bg-blue-500/20 text-blue-100'
                    : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white'
                }`}
              >
                <span aria-hidden="true">{complete ? '✓' : index + 1}</span>
                {t(`steps.${step.id}.title`)}
              </button>
            );
          })}
          <span className="ms-auto min-w-fit text-xs text-slate-500">
            {t('autosaved', {
              time: new Date(activeRun?.updatedAt ?? Date.now()).toLocaleTimeString(),
            })}
          </span>
        </div>
      </nav>
      <div className="mx-auto w-full max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">{activeContent}</div>
      <footer className="mt-8 border-t border-slate-800 bg-slate-950 px-6 py-4">
        <div className="mx-auto flex max-w-7xl justify-between">
          <button
            type="button"
            onClick={workflow.goBack}
            disabled={workflow.currentIndex === 0}
            className="rounded-md border border-slate-700 px-4 py-2 text-sm disabled:opacity-30"
          >
            {t('back')}
          </button>
          <button
            type="button"
            onClick={workflow.goNext}
            disabled={workflow.currentIndex === PRODUCTION_STEPS.length - 1}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:opacity-30"
          >
            {t('next', {
              step: PRODUCTION_STEPS[workflow.currentIndex + 1]
                ? t(`steps.${PRODUCTION_STEPS[workflow.currentIndex + 1].id}.title`)
                : t('complete'),
            })}
          </button>
        </div>
      </footer>
    </main>
  );
}
