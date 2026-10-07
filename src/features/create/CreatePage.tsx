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
import { ContinuitySummary } from './components/ContinuitySummary';

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
        <ContinuitySummary />
        <MusicGenerator />
        {content}
      </AssetsStep>
    ),
    generate: <GenerateStep>{content}</GenerateStep>,
    review: <ReviewStep>{content}</ReviewStep>,
    export: <ExportStep>{content}</ExportStep>,
  }[workflow.currentStep];

  return (
    <main className="min-h-full bg-transparent text-slate-100">
      <header className="border-b border-slate-800/60 bg-slate-950/40 backdrop-blur-md px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-blue-500/10 border border-blue-500/20 text-blue-300 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            {t('brand')}
          </div>
          <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-slate-100 via-slate-200 to-slate-400 bg-clip-text text-transparent">
            {t('title')}
          </h1>
          <p className="mt-1.5 max-w-3xl text-sm text-slate-400 font-normal leading-relaxed">
            {t('description')}
          </p>
        </div>
      </header>
      <nav
        aria-label={t('workflowLabel')}
        className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/90 px-4 py-3.5 backdrop-blur-xl sm:px-6 lg:px-8 shadow-lg shadow-black/20"
      >
        <div className="mx-auto flex max-w-7xl items-center gap-2.5 overflow-x-auto no-scrollbar">
          {PRODUCTION_STEPS.map((step, index) => {
            const selected = workflow.currentStep === step.id;
            const complete = workflow.completion[step.id];
            return (
              <button
                key={step.id}
                type="button"
                aria-current={selected ? 'step' : undefined}
                onClick={() => workflow.setCurrentStep(step.id)}
                className={`group flex min-w-fit items-center gap-2.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                  selected
                    ? 'border-blue-400/80 bg-gradient-to-r from-blue-600/30 to-indigo-600/20 text-blue-100 shadow-[0_0_16px_rgba(59,130,246,0.25)] ring-1 ring-blue-400/30'
                    : complete
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15 shadow-sm'
                      : 'border-slate-800/90 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:text-slate-200 hover:bg-slate-900/70'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold transition-transform group-hover:scale-105 ${
                    selected
                      ? 'bg-blue-500 text-white shadow-sm'
                      : complete
                        ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {complete ? '✓' : index + 1}
                </span>
                <span>{t(`steps.${step.id}.title`)}</span>
              </button>
            );
          })}
          <div className="ms-auto min-w-fit flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/60 border border-slate-800/80 text-xs text-slate-400 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>
              {t('autosaved', {
                time: new Date(activeRun?.updatedAt ?? Date.now()).toLocaleTimeString(),
              })}
            </span>
          </div>
        </div>
      </nav>
      <div className="mx-auto w-full max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">{activeContent}</div>
      <footer className="sticky bottom-0 z-20 mt-8 border-t border-slate-800/80 bg-slate-950/85 backdrop-blur-xl px-6 py-4 shadow-2xl">
        <div className="mx-auto flex max-w-7xl justify-between items-center">
          <button
            type="button"
            onClick={workflow.goBack}
            disabled={workflow.currentIndex === 0}
            className="rounded-xl border border-slate-700/80 bg-slate-900/60 px-5 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-all disabled:opacity-30 disabled:pointer-events-none"
          >
            {t('back')}
          </button>
          <button
            type="button"
            onClick={workflow.goNext}
            disabled={workflow.currentIndex === PRODUCTION_STEPS.length - 1}
            className="rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 hover:from-blue-500 hover:to-indigo-500 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:opacity-30 disabled:pointer-events-none active:scale-[0.99]"
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
