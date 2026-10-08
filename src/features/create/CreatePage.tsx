import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';

import { useProjectStore } from '@core/store/useProjectStore';
import { useProductionRunStore } from '@core/store/useProductionRunStore';
import { useAppStore } from '@core/store/useAppStore';
import { usePromptStudioDraftStore } from '@core/store/usePromptStudioDraftStore';
import { useEditorSessionStore } from '@core/store/useEditorSessionStore';
import { projectDocumentService } from '@core/services/projectDocumentService';
import { productionRunService } from '@core/services/productionRunService';
import { hydrateProjectMedia } from '@core/services/projectTransferService';
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
  const [params] = useSearchParams();
  const requestedRunId = params.get('run');
  const requestedShotId = params.get('shot');
  const projectId = useProjectStore((state) => state.currentProjectId) ?? 'default';
  const activeRun = useProductionRunStore((state) => state.activeRun);
  const loading = useProductionRunStore((state) => state.isLoading);
  const persistenceError = useProductionRunStore((state) => state.error);
  const hydratedProjectId = useProductionRunStore((state) => state.hydratedProjectId);
  const runs = useProductionRunStore((state) => state.runs);
  const [linkedRun, setLinkedRun] = useState<{ id: string; projectId: string } | null>(null);
  const [linkError, setLinkError] = useState(false);
  const assets = useAppStore((state) => state.assets);
  const workflow = useProductionWorkflow(projectId, activeRun, assets);
  const [actionFocus, setActionFocus] = useState<{ shotId: number; sequence: number } | null>(null);
  useEffect(() => {
    let cancelled = false;
    setLinkedRun(null);
    setLinkError(false);
    if (!requestedRunId) return;
    void (async () => {
      try {
        const run = await productionRunService.getRun(requestedRunId);
        if (!run) throw new Error('Linked production run is unavailable.');
        if (cancelled) return;
        const projects = useProjectStore.getState();
        const originalProjectId = projects.currentProjectId;
        const stillOpening = () =>
          !cancelled && useProjectStore.getState().currentProjectId === originalProjectId;
        if (projects.currentProjectId !== run.projectId) {
          if (!(await usePromptStudioDraftStore.getState().flush()))
            throw new Error('Save the current Studio draft before changing projects.');
          if (!stillOpening()) return;
          const current = projects.projects.find((item) => item.id === projects.currentProjectId);
          if (current)
            await projectDocumentService.save(
              useEditorSessionStore.getState().captureCurrentProjectDocument(current),
            );
          const document = await projectDocumentService.load(run.projectId);
          if (!document || cancelled) throw new Error('Linked project is unavailable.');
          if (!stillOpening()) return;
          await hydrateProjectMedia(document);
          if (!stillOpening()) return;
          if (!(await projects.setCurrentProject(run.projectId)))
            throw new Error('Linked project could not be opened.');
          if (cancelled || useProjectStore.getState().currentProjectId !== run.projectId) return;
          useEditorSessionStore.getState().commitProjectDocument(document, 'load');
        }
        if (!cancelled) setLinkedRun({ id: run.id, projectId: run.projectId });
      } catch {
        if (!cancelled) setLinkError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [requestedRunId]);
  useEffect(() => {
    if (!linkedRun || loading || hydratedProjectId !== linkedRun.projectId) return;
    if (!runs.some((run) => run.id === linkedRun.id)) {
      setLinkError(true);
      return;
    }
    useProductionRunStore.getState().selectRun(linkedRun.id);
    workflow.setCurrentStep('generate');
    const shotId = Number(requestedShotId);
    if (requestedShotId && Number.isFinite(shotId))
      setActionFocus((previous) => ({ shotId, sequence: (previous?.sequence ?? 0) + 1 }));
    setLinkedRun(null);
  }, [linkedRun, loading, hydratedProjectId, runs, requestedShotId, workflow]);
  useEffect(() => {
    document.getElementById(`${workflow.currentStep}-step-title`)?.focus();
  }, [workflow.currentStep]);
  useEffect(() => {
    if (actionFocus) document.getElementById(`production-shot-${actionFocus.shotId}`)?.focus();
  }, [actionFocus, workflow.currentStep]);
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
    <section className="creator-page min-h-full text-slate-100">
      <header className="creator-page-header border-b border-slate-800 px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold">{t('title')}</h1>
            <p className="mt-1 text-sm text-slate-400">{t('description')}</p>
          </div>
          <p role="status" className="text-xs text-slate-400">
            {persistenceError
              ? t('saveStatus.failed')
              : loading
                ? t('saveStatus.loading')
                : activeRun
                  ? t('saveStatus.savedPlan', {
                      time: new Date(activeRun.updatedAt).toLocaleTimeString(),
                    })
                  : t('saveStatus.noPlan')}
          </p>
        </div>
      </header>
      <nav
        aria-label={t('workflowLabel')}
        className="creator-workflow-nav border-b border-slate-800 px-4 py-3 sm:px-6 lg:px-8"
      >
        <div className="mx-auto flex max-w-7xl flex-wrap gap-2">
          {PRODUCTION_STEPS.map((step, index) => {
            const selected = workflow.currentStep === step.id;
            const complete = workflow.completion[step.id];
            return (
              <button
                key={step.id}
                type="button"
                aria-current={selected ? 'step' : undefined}
                onClick={() => workflow.setCurrentStep(step.id)}
                className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                  selected
                    ? 'border-blue-400 bg-blue-500/10 text-blue-300'
                    : 'border-slate-700 text-slate-400 hover:text-slate-100'
                }`}
              >
                <span aria-hidden="true">{complete ? '✓' : index + 1}</span>
                <span>{t(`steps.${step.id}.title`)}</span>
              </button>
            );
          })}
        </div>
      </nav>
      <div className="mx-auto w-full max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        {linkError && (
          <p role="alert" className="mb-4 text-sm">
            {t('flow.openFailed')}
          </p>
        )}
        {workflow.nextAction && (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-slate-700 p-3">
            <span className="text-sm font-medium">{t('flow.nextAction')}</span>
            <button
              type="button"
              className="rounded-md border border-slate-600 px-3 py-2 text-sm"
              onClick={() => {
                const action = workflow.nextAction;
                if (!action) return;
                workflow.setCurrentStep(action.step);
                setActionFocus((previous) => ({
                  shotId: action.shotId,
                  sequence: (previous?.sequence ?? 0) + 1,
                }));
              }}
            >
              {t(`flow.${workflow.nextAction.kind}`)} ·{' '}
              {activeRun?.shots.find((shot) => shot.id === workflow.nextAction?.shotId)?.title}
            </button>
          </div>
        )}
        {activeContent}
      </div>
      <footer className="mt-6 border-t border-slate-800 px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-wrap justify-between items-center gap-2">
          <button
            type="button"
            onClick={workflow.goBack}
            disabled={workflow.currentIndex === 0}
            className="rounded-md border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-30"
          >
            {t('back')}
          </button>
          <button
            type="button"
            onClick={workflow.goNext}
            disabled={workflow.currentIndex === PRODUCTION_STEPS.length - 1}
            className="rounded-md border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:opacity-30"
          >
            {t('next', {
              step: PRODUCTION_STEPS[workflow.currentIndex + 1]
                ? t(`steps.${PRODUCTION_STEPS[workflow.currentIndex + 1].id}.title`)
                : t('complete'),
            })}
          </button>
        </div>
      </footer>
    </section>
  );
}
