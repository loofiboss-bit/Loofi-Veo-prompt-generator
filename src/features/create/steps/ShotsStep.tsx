import { useTranslation } from 'react-i18next';

import { veoGenerationService } from '@core/services/veoGenerationService';
import { ModelDecision } from '@features/production/components/ModelDecision';
import { TakeCompare } from '@features/production/components/TakeCompare';
import type { ProductionStepId } from '@features/production/hooks/useProductionWorkflow';
import { ShotRequestEditor } from '../components/ShotRequestEditor';
import type { CreateWorkflowController } from '../hooks/useCreateWorkflow';

interface ShotsStepProps {
  activeStep: ProductionStepId;
  workflow: CreateWorkflowController;
}

export function ShotsStep({ activeStep, workflow }: ShotsStepProps) {
  const { t } = useTranslation('create');
  const { activeRun } = workflow;

  if (!activeRun || !['scenes', 'assets', 'generate', 'review'].includes(activeStep)) return null;

  return (
    <section className="space-y-4" aria-label={t('labels.productionShots')}>
      {activeRun.shots.map((shot) => {
        const latestTake = shot.takes.at(-1);
        const reviewIsCurrent =
          !latestTake?.review ||
          !shot.continuitySnapshot?.snapshotHash ||
          latestTake.review.continuitySnapshotHash === shot.continuitySnapshot.snapshotHash;
        const displayTakes = shot.takes.map((take) => {
          const takeReviewIsCurrent =
            !take.review ||
            !shot.continuitySnapshot?.snapshotHash ||
            take.review.continuitySnapshotHash === shot.continuitySnapshot.snapshotHash;
          return takeReviewIsCurrent ? take : { ...take, review: undefined };
        });
        const issues = veoGenerationService.validateRequest(shot.generationRequest);
        const canGenerate = shot.status === 'approved' && issues.length === 0;

        return (
          <article key={shot.id} className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="flex min-w-0 gap-3">
                {activeStep === 'generate' && (
                  <input
                    type="checkbox"
                    aria-label={t('labels.selectShot', { id: shot.id })}
                    checked={workflow.selectedShotIds.includes(shot.id)}
                    disabled={shot.status !== 'awaiting-approval'}
                    onChange={() => workflow.toggleShotSelection(shot.id)}
                    className="mt-1 h-4 w-4 accent-blue-500"
                  />
                )}
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-white">{shot.title}</h3>
                    <span className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-300">
                      {shot.status}
                    </span>
                    <span className="text-xs text-emerald-300">
                      ${veoGenerationService.estimateCost(shot.generationRequest).toFixed(2)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">{shot.prompt}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {t('labels.camera', { camera: shot.camera })}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {activeStep === 'generate' && canGenerate && (
                  <button
                    type="button"
                    onClick={() => void workflow.handleGenerate(shot)}
                    className="rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold hover:bg-blue-500"
                  >
                    {t('actions.generateTake')}
                  </button>
                )}
                {activeStep === 'review' &&
                  latestTake &&
                  ['complete', 'media-at-risk'].includes(latestTake.status) &&
                  (!latestTake.review || !reviewIsCurrent) && (
                    <button
                      type="button"
                      onClick={() => void workflow.handleReview(shot, latestTake)}
                      className="rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold hover:bg-blue-500"
                    >
                      {t('actions.reviewTake')}
                    </button>
                  )}
                {activeStep === 'review' &&
                  latestTake?.status === 'media-at-risk' &&
                  !latestTake.mediaRiskWaived && (
                    <button
                      type="button"
                      onClick={() => void workflow.handleWaiveMediaRisk(shot, latestTake)}
                      className="rounded-md bg-amber-600 px-3 py-2 text-xs font-semibold hover:bg-amber-500"
                    >
                      {t('actions.acceptRisk')}
                    </button>
                  )}
                {activeStep === 'review' &&
                  latestTake?.review &&
                  reviewIsCurrent &&
                  latestTake.status !== 'accepted' && (
                    <>
                      <button
                        type="button"
                        onClick={() => void workflow.handleAccept(shot, latestTake)}
                        className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold hover:bg-emerald-500"
                      >
                        {t('actions.acceptTake')}
                      </button>
                      <button
                        type="button"
                        onClick={() => void workflow.handleReject(shot, latestTake)}
                        className="rounded-md bg-rose-700 px-3 py-2 text-xs font-semibold hover:bg-rose-600"
                      >
                        {t('actions.rejectTake')}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void workflow.handlePrepareRetake(
                            shot,
                            latestTake,
                            Boolean(latestTake.review?.proposedRevisionPrompt),
                          )
                        }
                        className="rounded-md bg-amber-600 px-3 py-2 text-xs font-semibold hover:bg-amber-500"
                      >
                        {latestTake.review.proposedRevisionPrompt
                          ? t('actions.prepareRevision')
                          : t('actions.prepareRetake')}
                      </button>
                    </>
                  )}
              </div>
            </div>

            {activeStep !== 'review' && (
              <details className="mt-3" open={activeStep === 'assets'}>
                <summary className="cursor-pointer text-xs font-semibold text-slate-400">
                  {t('labels.advancedControls')}
                </summary>
                <ShotRequestEditor
                  shot={shot}
                  imageAssets={workflow.imageAssets}
                  extensionTakes={workflow.extensionTakes}
                  productionBible={workflow.productionBible}
                  onChange={(updates) => workflow.updateShotRequest(shot.id, updates)}
                  onBindingChange={(binding) =>
                    workflow.updateShotContinuityBinding(shot.id, binding)
                  }
                />
              </details>
            )}
            {activeStep === 'generate' && <ModelDecision request={shot.generationRequest} />}

            {activeStep === 'review' && shot.takes.length > 0 && (
              <div className="mt-3">
                <TakeCompare
                  takes={displayTakes}
                  onKeep={(take) => void workflow.handleAccept(shot, take)}
                  onReject={(take) => void workflow.handleReject(shot, take)}
                  onRevise={(take, notes) =>
                    void workflow.handlePrepareRetake(shot, take, true, notes)
                  }
                />
              </div>
            )}

            {shot.durationSeconds > 8 && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-700/60 bg-amber-950/30 p-3 text-xs text-amber-100">
                <span>{t('messages.longShot', { duration: shot.durationSeconds })}</span>
                <button
                  type="button"
                  onClick={() => void workflow.splitLongShot(shot.id)}
                  className="rounded-md bg-amber-600 px-3 py-2 font-semibold hover:bg-amber-500"
                >
                  {t('actions.split')}
                </button>
              </div>
            )}

            {latestTake && (
              <div className="mt-3 rounded-md border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-400">
                <p>
                  {t('labels.latestTake', { status: latestTake.status })}
                  {latestTake.providerArtifact?.operationName
                    ? ` · ${latestTake.providerArtifact.operationName}`
                    : ''}
                </p>
                {latestTake.error && <p className="mt-1 text-amber-300">{latestTake.error}</p>}
                {latestTake.review && reviewIsCurrent && (
                  <div className="mt-2">
                    <p className="font-semibold text-slate-200">
                      {t('labels.reviewScore', { score: latestTake.review.overallScore })}
                    </p>
                    {latestTake.review.proposedRevisionPrompt && (
                      <p className="mt-1 text-slate-400">
                        {t('labels.revisionProposed', {
                          prompt: latestTake.review.proposedRevisionPrompt,
                        })}
                      </p>
                    )}
                  </div>
                )}
                {latestTake.review && !reviewIsCurrent && (
                  <p className="mt-2 text-amber-300">
                    {t(
                      'messages.reviewStale',
                      'This review is from an older continuity snapshot. Review the current take again.',
                    )}
                  </p>
                )}
              </div>
            )}
          </article>
        );
      })}
    </section>
  );
}
