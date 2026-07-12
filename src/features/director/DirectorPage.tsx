import React, { useEffect, useMemo, useState } from 'react';

import { creativePackExportService } from '@core/services/creativePackExportService';
import { directorPlanningService } from '@core/services/directorPlanningService';
import { mediaAssetService } from '@core/services/mediaAssetService';
import { productionReviewService } from '@core/services/productionReviewService';
import { productionRunService } from '@core/services/productionRunService';
import { videoGenerationService } from '@core/services/videoGenerationService';
import { veoGenerationService } from '@core/services/veoGenerationService';
import { storeMediator } from '@core/store/mediator';
import { useAppStore } from '@core/store/useAppStore';
import { useProductionRunStore } from '@core/store/useProductionRunStore';
import { useProjectStore } from '@core/store/useProjectStore';
import type {
  Asset,
  ProductionShot,
  ProductionTake,
  VeoExecutionImage,
  VeoExecutionInputs,
  VeoGenerationRequest,
} from '@core/types';
import Icon from '@shared/components/ui/Icon';
import type { ProductionStepId } from '@features/production/hooks/useProductionWorkflow';
import { ProductionPreflightPanel } from '@features/production/components/ProductionPreflightPanel';
import { ModelDecision } from '@features/production/components/ModelDecision';
import { CostApproval } from '@features/production/components/CostApproval';
import { TakeCompare } from '@features/production/components/TakeCompare';
import {
  productionPreflightService,
  type PreflightPatch,
  type PreflightRecommendation,
} from '@core/services/productionPreflightService';

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

const assetToInput = (asset?: Asset): VeoExecutionImage | undefined => {
  if (!asset?.data) return undefined;
  const data = asset.data.includes(',') ? asset.data.split(',')[1] : asset.data;
  return { data, mimeType: asset.mimeType };
};

interface ShotRequestEditorProps {
  shot: ProductionShot;
  imageAssets: Asset[];
  extensionTakes: ProductionTake[];
  onChange: (updates: Partial<VeoGenerationRequest>) => Promise<void>;
}

function ShotRequestEditor({
  shot,
  imageAssets,
  extensionTakes,
  onChange,
}: ShotRequestEditorProps) {
  const request = shot.generationRequest;
  const issues = veoGenerationService.validateRequest(request);
  const fieldClass =
    'rounded-md border border-slate-700 bg-slate-950 px-2 py-2 text-xs text-slate-200';

  return (
    <div className="mt-3 grid gap-3 border-t border-slate-800 pt-3 md:grid-cols-4">
      <label className="flex flex-col gap-1 text-xs text-slate-400">
        Mode
        <select
          className={fieldClass}
          value={request.mode}
          onChange={(event) =>
            void onChange({ mode: event.target.value as VeoGenerationRequest['mode'] })
          }
        >
          <option value="text-to-video">Text to video</option>
          <option value="image-to-video">Image to video</option>
          <option value="interpolation">First + last frames</option>
          <option value="reference-images">Reference images</option>
          <option value="extension">Extend Veo take</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-slate-400">
        Model
        <select
          className={fieldClass}
          value={request.modelId}
          onChange={(event) =>
            void onChange({ modelId: event.target.value as VeoGenerationRequest['modelId'] })
          }
        >
          <option value="veo-3.1-fast">Veo 3.1 Fast</option>
          <option value="veo-3.1-quality">Veo 3.1 Quality</option>
          <option value="veo-3.1-lite">Veo 3.1 Lite</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-slate-400">
        Duration
        <select
          className={fieldClass}
          value={request.durationSeconds}
          onChange={(event) =>
            void onChange({
              durationSeconds: Number(
                event.target.value,
              ) as VeoGenerationRequest['durationSeconds'],
            })
          }
        >
          <option value={4}>4 seconds</option>
          <option value={6}>6 seconds</option>
          <option value={8}>8 seconds</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-slate-400">
        Resolution
        <select
          className={fieldClass}
          value={request.resolution}
          onChange={(event) =>
            void onChange({ resolution: event.target.value as VeoGenerationRequest['resolution'] })
          }
        >
          <option value="720p">720p</option>
          <option value="1080p">1080p</option>
          <option value="4k">4K</option>
        </select>
      </label>

      {(request.mode === 'image-to-video' || request.mode === 'interpolation') && (
        <label className="flex flex-col gap-1 text-xs text-slate-400 md:col-span-2">
          First frame
          <select
            className={fieldClass}
            value={request.firstFrameAssetId ?? ''}
            onChange={(event) =>
              void onChange({ firstFrameAssetId: event.target.value || undefined })
            }
          >
            <option value="">Select an image</option>
            {imageAssets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {request.mode === 'interpolation' && (
        <label className="flex flex-col gap-1 text-xs text-slate-400 md:col-span-2">
          Last frame
          <select
            className={fieldClass}
            value={request.lastFrameAssetId ?? ''}
            onChange={(event) =>
              void onChange({ lastFrameAssetId: event.target.value || undefined })
            }
          >
            <option value="">Select an image</option>
            {imageAssets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {request.mode === 'reference-images' && (
        <label className="flex flex-col gap-1 text-xs text-slate-400 md:col-span-4">
          Reference images — choose up to three
          <select
            multiple
            className={`${fieldClass} min-h-24`}
            value={request.referenceAssetIds}
            onChange={(event) =>
              void onChange({
                referenceAssetIds: Array.from(event.target.selectedOptions).map(
                  (option) => option.value,
                ),
              })
            }
          >
            {imageAssets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {request.mode === 'extension' && (
        <label className="flex flex-col gap-1 text-xs text-slate-400 md:col-span-4">
          Source Veo take
          <select
            className={fieldClass}
            value={request.extensionSourceTakeId ?? ''}
            onChange={(event) => {
              const take = extensionTakes.find((item) => item.id === event.target.value);
              void onChange({
                extensionSourceTakeId: take?.id,
                extensionArtifact: take?.providerArtifact,
                resolution: '720p',
                durationSeconds: 8,
              });
            }}
          >
            <option value="">Select a non-expired Veo take</option>
            {extensionTakes.map((take) => (
              <option key={take.id} value={take.id}>
                {take.id.slice(0, 8)} — expires{' '}
                {new Date(take.providerArtifact!.expiresAt).toLocaleString()}
              </option>
            ))}
          </select>
        </label>
      )}

      {issues.length > 0 && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 md:col-span-4">
          {issues.map((issue) => (
            <p key={`${issue.code}-${issue.field}`}>{issue.message}</p>
          ))}
        </div>
      )}
    </div>
  );
}

export function DirectorPage({ activeStep = 'generate' }: { activeStep?: ProductionStepId }) {
  const promptState = useAppStore((state) => state.promptState);
  const shots = useAppStore((state) => state.sbShots);
  const assets = useAppStore((state) => state.assets);
  const currentProjectId = useProjectStore((state) => state.currentProjectId) ?? 'default';
  const projectName =
    useProjectStore(
      (state) => state.projects.find((project) => project.id === currentProjectId)?.name,
    ) ?? 'Current Project';
  const {
    runs,
    activeRun,
    selectedShotIds,
    isLoading,
    error,
    initialize,
    createLocalPlan,
    selectRun,
    toggleShotSelection,
    selectAllPendingShots,
    approveSelectedShots,
    updateShotRequest,
    splitLongShot,
    refreshActiveRun,
  } = useProductionRunStore();
  const [feedback, setFeedback] = useState('');
  const [useGeminiReview, setUseGeminiReview] = useState(false);
  const [exportPreview, setExportPreview] = useState('');
  const [lastPreflightPatch, setLastPreflightPatch] = useState<PreflightPatch | null>(null);
  const [lastRecommendationId, setLastRecommendationId] = useState<string | null>(null);

  useEffect(() => {
    void initialize(currentProjectId);
  }, [currentProjectId, initialize]);

  const imageAssets = assets.filter((asset) => asset.type === 'image');
  const extensionTakes = useMemo(
    () =>
      (activeRun?.shots.flatMap((shot) => shot.takes) ?? []).filter(
        (take) =>
          Boolean(take.providerArtifact?.mediaUri) &&
          (take.providerArtifact?.expiresAt ?? 0) > Date.now(),
      ),
    [activeRun],
  );
  const selectedCost = useMemo(
    () =>
      activeRun?.shots
        .filter((shot) => selectedShotIds.includes(shot.id))
        .reduce(
          (sum, shot) => sum + veoGenerationService.estimateCost(shot.generationRequest),
          0,
        ) ?? 0,
    [activeRun, selectedShotIds],
  );
  const preflight = useMemo(
    () => (activeRun ? productionPreflightService.analyze({ run: activeRun, assets }) : null),
    [activeRun, assets],
  );

  const applyPreflightPatch = async (
    patch: PreflightPatch,
    recommendation: PreflightRecommendation,
  ) => {
    if (!activeRun) return;
    productionPreflightService.trackAppliedRecommendation(activeRun, recommendation);
    await updateShotRequest(patch.shotId, { [patch.field]: patch.value });
    setLastPreflightPatch(patch);
    setLastRecommendationId(recommendation.id);
    setFeedback(`Applied ${patch.field} suggestion locally. Review before approval.`);
  };

  const undoPreflightPatch = async () => {
    if (!lastPreflightPatch?.previousValue) return;
    await updateShotRequest(lastPreflightPatch.shotId, {
      [lastPreflightPatch.field]: lastPreflightPatch.previousValue,
    });
    setLastPreflightPatch(null);
    if (activeRun && lastRecommendationId) {
      productionPreflightService.discardTrackedRecommendation(activeRun.id, lastRecommendationId);
    }
    setLastRecommendationId(null);
    setFeedback('Local preflight patch undone.');
  };

  const handleCreatePlan = async () => {
    await createLocalPlan({
      projectId: currentProjectId,
      title: `${projectName} Director Run`,
      promptState,
      shots,
      assets,
    });
    setFeedback('Local plan created. No cloud services were called.');
  };

  const handleEnhancePlan = async () => {
    if (!activeRun) return;
    const approval = await productionRunService.approvePlanEnhancement(activeRun.id);
    await productionRunService.consumePlanEnhancementApproval(activeRun.id, approval.id);
    try {
      const enhancedBrief = await directorPlanningService.enhancePlanBrief(activeRun);
      await productionRunService.applyPlanEnhancement(activeRun.id, enhancedBrief);
      await refreshActiveRun();
      setFeedback('Gemini plan enhancement applied from one approved text call.');
    } catch (enhancementError) {
      setFeedback(
        enhancementError instanceof Error
          ? enhancementError.message
          : 'Gemini plan enhancement failed. The approval was consumed and will not retry.',
      );
    }
  };

  const resolveInputs = (request: VeoGenerationRequest): VeoExecutionInputs => ({
    firstFrame: assetToInput(assets.find((asset) => asset.id === request.firstFrameAssetId)),
    lastFrame: assetToInput(assets.find((asset) => asset.id === request.lastFrameAssetId)),
    referenceImages: request.referenceAssetIds
      .map((id) => assetToInput(assets.find((asset) => asset.id === id)))
      .filter((input): input is VeoExecutionImage => Boolean(input)),
    extensionVideoUri: request.extensionArtifact?.mediaUri,
  });

  const handleGenerate = async (shot: ProductionShot) => {
    if (!activeRun) return;
    let take: ProductionTake | null = null;
    try {
      take = await productionRunService.createApprovedTake(activeRun.id, shot.id);
      await videoGenerationService.startGenerationRequest(
        take.request,
        { runId: activeRun.id, shotId: shot.id, takeId: take.id },
        resolveInputs(take.request),
        (message) => setFeedback(message),
      );
      await refreshActiveRun();
    } catch (generationError) {
      if (take) {
        await productionRunService.updateTake(activeRun.id, shot.id, take.id, {
          status: 'failed',
          error:
            generationError instanceof Error
              ? generationError.message
              : 'Failed to queue generation.',
        });
      }
      setFeedback(
        generationError instanceof Error ? generationError.message : 'Failed to queue generation.',
      );
      await refreshActiveRun();
    }
  };

  const handleReview = async (shot: ProductionShot, take: ProductionTake) => {
    if (!activeRun) return;
    let video: { data: string; mimeType: string } | undefined;
    if (useGeminiReview && take.localMediaKey) {
      const record = await mediaAssetService.getRecord(take.localMediaKey);
      if (record) {
        video = { data: await blobToBase64(record.blob), mimeType: record.mimeType };
      }
    }
    const review = await productionReviewService.reviewTake({
      shot,
      take,
      video,
      useGemini: useGeminiReview,
    });
    await productionRunService.recordReview(activeRun.id, shot.id, take.id, review);
    await refreshActiveRun();
    setFeedback(`Review complete: ${review.overallScore}/100.`);
  };

  const handleAccept = async (shot: ProductionShot, take: ProductionTake) => {
    if (!activeRun) return;
    const localMediaUrl =
      take.localMediaUrl ||
      (take.localMediaKey ? await mediaAssetService.getObjectUrl(take.localMediaKey) : null) ||
      take.providerMediaUri;
    if (!localMediaUrl) {
      setFeedback('This take has no accessible media.');
      return;
    }

    await productionRunService.acceptTake(activeRun.id, shot.id, take.id);
    const appState = useAppStore.getState();
    appState.setSbShots((currentShots) => {
      const existing = currentShots.find((item) => item.id === shot.id);
      const nextTakeUrls = existing?.takes.includes(localMediaUrl)
        ? existing.takes
        : [...(existing?.takes ?? []), localMediaUrl];
      if (existing) {
        return currentShots.map((item) =>
          item.id === shot.id
            ? {
                ...item,
                action: shot.prompt,
                camera: shot.camera,
                duration: shot.durationSeconds,
                generatedVideoUrl: localMediaUrl,
                takes: nextTakeUrls,
                selectedTakeIndex: nextTakeUrls.indexOf(localMediaUrl),
              }
            : item,
        );
      }
      return [
        ...currentShots,
        {
          id: shot.id,
          type: 'video',
          action: shot.prompt,
          camera: shot.camera,
          characterId: '',
          generatedVideoUrl: localMediaUrl,
          takes: [localMediaUrl],
          selectedTakeIndex: 0,
          visualLink: false,
          duration: shot.durationSeconds,
          transition: { type: 'cut', duration: 0 },
        },
      ];
    });
    appState.syncTimelineFromShots();
    storeMediator.emit('production:takeAccepted', {
      runId: activeRun.id,
      shotId: shot.id,
      takeId: take.id,
    });
    if (take.localMediaKey) {
      await window.electron?.setDesktopMediaAccepted?.({ key: take.localMediaKey, accepted: true });
    }
    const impacts = productionPreflightService.recordAcceptedTakeImpact(
      activeRun.id,
      shot.id,
      take.id,
      take.review?.overallScore,
    );
    await refreshActiveRun();
    const measured = impacts.find((impact) => impact.scoreDelta !== undefined);
    setFeedback(
      measured
        ? `Shot ${shot.id} accepted. Recommendation impact: ${measured.scoreDelta! >= 0 ? '+' : ''}${measured.scoreDelta} review points.`
        : `Shot ${shot.id} accepted into storyboard and timeline. Recommendation impact baseline recorded.`,
    );
  };

  const handleReject = async (shot: ProductionShot, take: ProductionTake) => {
    if (!activeRun) return;
    await productionRunService.rejectTake(activeRun.id, shot.id, take.id);
    await refreshActiveRun();
    setFeedback(`Shot ${shot.id} take rejected. A new approval is required before retrying.`);
  };

  const handlePrepareRetake = async (
    shot: ProductionShot,
    take: ProductionTake,
    useRevision: boolean,
    revisionNotes?: string,
  ) => {
    const prompt =
      useRevision && (revisionNotes?.trim() || take.review?.proposedRevisionPrompt)
        ? (revisionNotes?.trim() ?? take.review?.proposedRevisionPrompt ?? shot.prompt)
        : shot.prompt;
    await handleReject(shot, take);
    await updateShotRequest(shot.id, { prompt });
    setFeedback(
      useRevision
        ? `Revision prepared for Shot ${shot.id}. Review the prompt and approve the new cost.`
        : `Retake prepared for Shot ${shot.id}. New approval is required.`,
    );
  };

  const handleExport = async () => {
    if (!activeRun) return;
    const pack = creativePackExportService.buildCreativePack({
      projectId: currentProjectId,
      promptState,
      shots: useAppStore.getState().sbShots,
      productionRun: activeRun,
    });
    const text = creativePackExportService.exportCreativePack(pack, 'markdown');
    setExportPreview(text);
    try {
      await navigator.clipboard.writeText(text);
      setFeedback('Creative Pack v2 copied to clipboard.');
    } catch {
      setFeedback(
        'Creative Pack v2 is ready. Clipboard permission was denied; copy from the preview.',
      );
    }
  };

  return (
    <div
      data-production-step={activeStep}
      className="min-h-full bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-8"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-300">
              v8 Creator Core · {activeStep}
            </p>
            <h1 className="mt-1 text-3xl font-semibold text-white">Create</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              Plan locally, approve exact generation costs, review every take, and commit only
              accepted media to your project.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {runs.length > 0 && (
              <select
                aria-label="Production run"
                value={activeRun?.id ?? ''}
                onChange={(event) => selectRun(event.target.value)}
                className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
              >
                {runs.map((run) => (
                  <option key={run.id} value={run.id}>
                    {run.title} — {run.status}
                  </option>
                ))}
              </select>
            )}
            {activeRun && (
              <button
                type="button"
                onClick={() => void handleEnhancePlan()}
                className="inline-flex items-center gap-2 rounded-md border border-violet-500 px-4 py-2 text-sm font-semibold text-violet-200 hover:bg-violet-950"
              >
                Approve 1 Gemini plan call
              </button>
            )}
            <button
              type="button"
              onClick={() => void handleCreatePlan()}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-md bg-violet-600 px-4 py-2 text-sm font-semibold hover:bg-violet-500 disabled:opacity-50"
            >
              <Icon name="sparkles" className="h-4 w-4" />
              New local plan
            </button>
          </div>
        </header>

        {(feedback || error) && (
          <div
            role="status"
            className="rounded-md border border-slate-700 bg-slate-900 p-3 text-sm text-slate-300"
          >
            {error || feedback}
          </div>
        )}

        {!activeRun ? (
          <section className="rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-10 text-center">
            <Icon name="film" className="mx-auto h-10 w-10 text-violet-300" />
            <h2 className="mt-3 text-xl font-semibold">Create the first production run</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-slate-400">
              Director Mode will use the current prompt, scene pack, assets, and storyboard. This
              planning step is local and cannot spend API credits.
            </p>
          </section>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-xs text-slate-500">Run status</p>
                <p className="mt-1 text-lg font-semibold text-violet-300">{activeRun.status}</p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-xs text-slate-500">Shots</p>
                <p className="mt-1 text-lg font-semibold">{activeRun.shots.length}</p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-xs text-slate-500">Plan estimate</p>
                <p className="mt-1 text-lg font-semibold text-emerald-300">
                  ${activeRun.cost.estimatedUsd.toFixed(2)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-xs text-slate-500">Accepted</p>
                <p className="mt-1 text-lg font-semibold">
                  {activeRun.shots.filter((shot) => shot.status === 'accepted').length}/
                  {activeRun.shots.length}
                </p>
              </div>
            </section>

            <section
              hidden={activeStep !== 'brief'}
              className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"
            >
              <h2 className="text-sm font-semibold">Director brief</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">{activeRun.brief}</p>
              <p className="mt-2 text-xs text-slate-500">
                Source: {activeRun.source} · revision {activeRun.planRevision}
              </p>
            </section>

            <CostApproval hidden={activeStep !== 'generate'}>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="font-semibold">Approval preflight</h2>
                  <p className="text-xs text-slate-400">
                    One submission and one review per selected shot. Retakes need new approval.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllPendingShots}
                    className="rounded-md bg-slate-800 px-3 py-2 text-xs font-semibold hover:bg-slate-700"
                  >
                    Select pending
                  </button>
                  <span className="rounded-md border border-slate-700 px-3 py-2 text-xs">
                    Maximum ${selectedCost.toFixed(2)}
                  </span>
                  <button
                    type="button"
                    disabled={selectedShotIds.length === 0 || preflight?.canApprove === false}
                    onClick={() => void approveSelectedShots()}
                    className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold hover:bg-emerald-500 disabled:opacity-40"
                  >
                    Approve {selectedShotIds.length} shot{selectedShotIds.length === 1 ? '' : 's'}
                  </button>
                </div>
              </div>
              {preflight && (
                <ProductionPreflightPanel
                  result={preflight}
                  onApply={(patch, recommendation) =>
                    void applyPreflightPatch(patch, recommendation)
                  }
                  onUndo={() => void undoPreflightPatch()}
                  canUndo={Boolean(lastPreflightPatch?.previousValue)}
                />
              )}
            </CostApproval>

            <section
              hidden={!['scenes', 'assets', 'generate', 'review'].includes(activeStep)}
              className="space-y-4"
              aria-label="Production shots"
            >
              {activeRun.shots.map((shot) => {
                const latestTake = shot.takes.at(-1);
                const issues = veoGenerationService.validateRequest(shot.generationRequest);
                const canGenerate = shot.status === 'approved' && issues.length === 0;
                return (
                  <article
                    key={shot.id}
                    className="rounded-xl border border-slate-800 bg-slate-900/70 p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="flex min-w-0 gap-3">
                        <input
                          hidden={activeStep !== 'generate'}
                          type="checkbox"
                          aria-label={`Select shot ${shot.id}`}
                          checked={selectedShotIds.includes(shot.id)}
                          disabled={shot.status !== 'awaiting-approval'}
                          onChange={() => toggleShotSelection(shot.id)}
                          className="mt-1 h-4 w-4 accent-violet-500"
                        />
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-white">{shot.title}</h3>
                            <span className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-300">
                              {shot.status}
                            </span>
                            <span className="text-xs text-emerald-300">
                              $
                              {veoGenerationService.estimateCost(shot.generationRequest).toFixed(2)}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-slate-300">{shot.prompt}</p>
                          <p className="mt-1 text-xs text-slate-500">Camera: {shot.camera}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        {activeStep === 'generate' && canGenerate && (
                          <button
                            type="button"
                            onClick={() => void handleGenerate(shot)}
                            className="rounded-md bg-cyan-600 px-3 py-2 text-xs font-semibold hover:bg-cyan-500"
                          >
                            Generate approved take
                          </button>
                        )}
                        {activeStep === 'review' &&
                          latestTake &&
                          ['complete', 'media-at-risk'].includes(latestTake.status) &&
                          !latestTake.review && (
                            <button
                              type="button"
                              onClick={() => void handleReview(shot, latestTake)}
                              className="rounded-md bg-violet-600 px-3 py-2 text-xs font-semibold hover:bg-violet-500"
                            >
                              Review take
                            </button>
                          )}
                        {activeStep === 'review' &&
                          latestTake?.status === 'media-at-risk' &&
                          !latestTake.mediaRiskWaived && (
                            <button
                              type="button"
                              onClick={async () => {
                                await productionRunService.waiveMediaRisk(
                                  activeRun.id,
                                  shot.id,
                                  latestTake.id,
                                );
                                await refreshActiveRun();
                              }}
                              className="rounded-md bg-amber-600 px-3 py-2 text-xs font-semibold hover:bg-amber-500"
                            >
                              Accept media risk
                            </button>
                          )}
                        {activeStep === 'review' &&
                          latestTake?.review &&
                          latestTake.status !== 'accepted' && (
                            <>
                              <button
                                type="button"
                                onClick={() => void handleAccept(shot, latestTake)}
                                className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold hover:bg-emerald-500"
                              >
                                Accept take
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleReject(shot, latestTake)}
                                className="rounded-md bg-rose-700 px-3 py-2 text-xs font-semibold hover:bg-rose-600"
                              >
                                Reject take
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  void handlePrepareRetake(
                                    shot,
                                    latestTake,
                                    Boolean(latestTake.review?.proposedRevisionPrompt),
                                  )
                                }
                                className="rounded-md bg-amber-600 px-3 py-2 text-xs font-semibold hover:bg-amber-500"
                              >
                                {latestTake.review.proposedRevisionPrompt
                                  ? 'Prepare revision'
                                  : 'Prepare retake'}
                              </button>
                            </>
                          )}
                      </div>
                    </div>

                    {activeStep !== 'review' && (
                      <details className="mt-3" open={activeStep === 'assets'}>
                        <summary className="cursor-pointer text-xs font-semibold text-slate-400">
                          Advanced shot controls
                        </summary>
                        <ShotRequestEditor
                          shot={shot}
                          imageAssets={imageAssets}
                          extensionTakes={extensionTakes}
                          onChange={(updates) => updateShotRequest(shot.id, updates)}
                        />
                      </details>
                    )}
                    {activeStep === 'generate' && (
                      <ModelDecision request={shot.generationRequest} />
                    )}

                    {activeStep === 'review' && shot.takes.length > 0 && (
                      <div className="mt-3">
                        <TakeCompare
                          takes={shot.takes}
                          onKeep={(take) => void handleAccept(shot, take)}
                          onReject={(take) => void handleReject(shot, take)}
                          onRevise={(take, notes) =>
                            void handlePrepareRetake(shot, take, true, notes)
                          }
                        />
                      </div>
                    )}

                    {shot.durationSeconds > 8 && (
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-700/60 bg-amber-950/30 p-3 text-xs text-amber-100">
                        <span>
                          This {shot.durationSeconds}s shot exceeds one Veo segment. Split it now,
                          or generate eight seconds and use the explicit extension mode from a
                          non-expired Veo take.
                        </span>
                        <button
                          type="button"
                          onClick={() => void splitLongShot(shot.id)}
                          className="rounded-md bg-amber-600 px-3 py-2 font-semibold hover:bg-amber-500"
                        >
                          Split into Veo segments
                        </button>
                      </div>
                    )}

                    {latestTake && (
                      <div className="mt-3 rounded-md border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-400">
                        <p>
                          Latest take: {latestTake.status}
                          {latestTake.providerArtifact?.operationName
                            ? ` · ${latestTake.providerArtifact.operationName}`
                            : ''}
                        </p>
                        {latestTake.error && (
                          <p className="mt-1 text-amber-300">{latestTake.error}</p>
                        )}
                        {latestTake.review && (
                          <div className="mt-2">
                            <p className="font-semibold text-slate-200">
                              Review score: {latestTake.review.overallScore}/100
                            </p>
                            {latestTake.review.proposedRevisionPrompt && (
                              <p className="mt-1 text-slate-400">
                                Revision proposed: {latestTake.review.proposedRevisionPrompt}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </section>

            <section
              hidden={!['review', 'export'].includes(activeStep)}
              className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label
                  hidden={activeStep !== 'review'}
                  className="flex items-center gap-2 text-xs text-slate-400"
                >
                  <input
                    type="checkbox"
                    checked={useGeminiReview}
                    onChange={(event) => setUseGeminiReview(event.target.checked)}
                    className="accent-violet-500"
                  />
                  Use approved Gemini semantic review when reviewing a take
                </label>
                <button
                  hidden={activeStep !== 'export'}
                  type="button"
                  onClick={() => void handleExport()}
                  className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-white"
                >
                  <Icon name="copy" className="h-4 w-4" />
                  Copy Creative Pack v2
                </button>
              </div>
              {activeStep === 'export' && exportPreview && (
                <textarea
                  aria-label="Creative Pack v2 preview"
                  readOnly
                  value={exportPreview}
                  className="mt-3 h-64 w-full rounded-md border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-slate-300"
                />
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
