import React from 'react';
import { DirectorPage } from '@features/director';
import { useProjectStore } from '@core/store/useProjectStore';
import { useProductionRunStore } from '@core/store/useProductionRunStore';
import { PRODUCTION_STEPS, useProductionWorkflow } from './hooks/useProductionWorkflow';

export function ProductionWorkspace() {
  const projectId = useProjectStore((state) => state.currentProjectId) ?? 'default';
  const activeRun = useProductionRunStore((state) => state.activeRun);
  const workflow = useProductionWorkflow(projectId, activeRun);

  return (
    <main className="min-h-full bg-slate-950 text-slate-100">
      <nav
        aria-label="Production workflow"
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
                className={`flex min-w-fit items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold ${
                  selected
                    ? 'border-violet-400 bg-violet-500/20 text-violet-100'
                    : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white'
                }`}
              >
                <span aria-hidden="true">{complete ? '✓' : index + 1}</span>
                {step.label}
              </button>
            );
          })}
          <span className="ml-auto min-w-fit text-xs text-slate-500">
            Autosaved · safe checkpoint{' '}
            {new Date(activeRun?.updatedAt ?? Date.now()).toLocaleTimeString()}
          </span>
        </div>
      </nav>
      <DirectorPage activeStep={workflow.currentStep} />
      <div className="sticky bottom-0 z-20 border-t border-slate-800 bg-slate-950/95 px-6 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl justify-between">
          <button
            type="button"
            onClick={workflow.goBack}
            disabled={workflow.currentIndex === 0}
            className="rounded-md border border-slate-700 px-4 py-2 text-sm disabled:opacity-30"
          >
            Back
          </button>
          <button
            type="button"
            onClick={workflow.goNext}
            disabled={workflow.currentIndex === PRODUCTION_STEPS.length - 1}
            className="rounded-md bg-violet-600 px-4 py-2 text-sm font-semibold disabled:opacity-30"
          >
            Next: {PRODUCTION_STEPS[workflow.currentIndex + 1]?.label ?? 'Complete'}
          </button>
        </div>
      </div>
    </main>
  );
}
