import { paidJobService } from '@core/services/paidJobService';
import type { PaidJobTask, GenerationTask } from '@core/types';
import { studioRevisionService } from '@core/services/studioRevisionService';
import { projectDocumentService } from '@core/services/projectDocumentService';
import {
  exportProjectOtioBundle,
  preflightProjectOtioExport,
  type MissingTimelineMedia,
  downloadProjectBlob,
} from '@core/services/projectTransferService';
import { useEditorSessionStore } from '@core/store/useEditorSessionStore';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { requireUsableCostEstimate } from '@core/models/cost';
import { creativePackExportService } from '@core/services/creativePackExportService';
import { promptStudioHandoffService } from '@core/services/promptStudioHandoffService';
import { directorPlanningService } from '@core/services/directorPlanningService';
import { mediaAssetService } from '@core/services/mediaAssetService';
import {
  productionPreflightService,
  type PreflightPatch,
  type PreflightRecommendation,
} from '@core/services/productionPreflightService';
import { productionReviewService } from '@core/services/productionReviewService';
import { productionRunService } from '@core/services/productionRunService';
import { continuityService } from '@core/services/continuityService';
import { videoGenerationService } from '@core/services/videoGenerationService';
import { veoGenerationService } from '@core/services/veoGenerationService';
import { storeMediator } from '@core/store/mediator';
import { useAppStore } from '@core/store/useAppStore';
import { useProductionRunStore } from '@core/store/useProductionRunStore';
import { useProjectStore } from '@core/store/useProjectStore';
import { useLocationStore } from '@core/store/useLocationStore';
import type {
  Asset,
  ContinuityOverrideRecord,
  ProductionShot,
  ProductionTake,
  VeoExecutionImage,
  VeoExecutionInputs,
  VeoGenerationRequest,
} from '@core/types';

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

export function useCreateWorkflow() {
  const { t } = useTranslation('create');
  const promptState = useAppStore((state) => state.promptState);
  const setPromptState = useAppStore((state) => state.setPromptState);
  const shots = useAppStore((state) => state.sbShots);
  const assets = useAppStore((state) => state.assets);
  const storedProductionBible = useAppStore((state) => state.productionBible);
  const productionBible = storedProductionBible ?? continuityService.createEmptyBible(0);
  const characterBank = useAppStore((state) => state.characterBank);
  const visualDNA = useAppStore((state) => state.visualDNA);
  const locations = useLocationStore((state) => state.locations);
  const currentProjectId = useProjectStore((state) => state.currentProjectId) ?? 'default';
  const projectName =
    useProjectStore(
      (state) => state.projects.find((project) => project.id === currentProjectId)?.name,
    ) ?? t('labels.currentProject');
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
    updateShotContinuityBinding,
    splitLongShot,
    refreshActiveRun,
  } = useProductionRunStore();
  const recoveryLock = useRef(false);
  const [durableJobs, setDurableJobs] = useState<PaidJobTask[]>([]);
  const [recoveringJobId, setRecoveringJobId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [useGeminiReview, setUseGeminiReview] = useState(false);
  const [exportMissingMedia, setExportMissingMedia] = useState<MissingTimelineMedia[]>([]);
  const [exportPreview, setExportPreview] = useState('');
  const [lastPreflightPatch, setLastPreflightPatch] = useState<PreflightPatch | null>(null);
  const [lastRecommendationId, setLastRecommendationId] = useState<string | null>(null);
  const [continuityOverrides, setContinuityOverrides] = useState<ContinuityOverrideRecord[]>([]);

  useEffect(() => {
    void initialize(currentProjectId);
  }, [currentProjectId, initialize]);

  useEffect(() => {
    let alive = true;
    const consume = async (job: PaidJobTask) => {
      if (!alive) return;
      setDurableJobs((current) => [...current.filter((item) => item.id !== job.id), job]);
      if (
        !activeRun ||
        !('productionRunId' in job) ||
        job.productionRunId !== activeRun?.id ||
        job.productionShotId === undefined ||
        !job.productionTakeId
      )
        return;
      const take = activeRun.shots
        .find((shot) => shot.id === job.productionShotId)
        ?.takes.find((item) => item.id === job.productionTakeId && item.taskId === job.id);
      if (!take) return;
      const videoJob = job as GenerationTask;
      const status =
        job.status === 'Complete'
          ? take.status === 'accepted'
            ? 'accepted'
            : 'complete'
          : job.status === 'MediaAtRisk'
            ? 'media-at-risk'
            : job.status === 'RecoveryRequired'
              ? 'recovery-required'
              : job.status === 'Error'
                ? 'failed'
                : ['Polling', 'Fetching', 'Processing'].includes(job.status)
                  ? 'generating'
                  : null;
      if (status && (take.status !== status || (videoJob.localMediaKey && !take.localMediaKey))) {
        await productionRunService.updateTake(
          activeRun.id,
          job.productionShotId,
          job.productionTakeId,
          {
            status,
            error: job.error,
            ...(videoJob.localMediaKey
              ? {
                  localMediaKey: videoJob.localMediaPath
                    ? `desktop:${videoJob.localMediaPath}`
                    : videoJob.localMediaKey,
                  localMediaUrl: videoJob.localMediaUrl ?? undefined,
                }
              : {}),
            ...(videoJob.providerMediaUri ? { providerMediaUri: videoJob.providerMediaUri } : {}),
          },
        );
        if (alive) await refreshActiveRun();
      }
    };
    void paidJobService
      .list()
      .then((jobs) => {
        if (alive) {
          setDurableJobs(jobs);
          for (const job of jobs) void consume(job);
        }
      })
      .catch(() => {});
    const unsubscribe = paidJobService.subscribe((job) => {
      void consume(job).catch(() => {});
    });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [activeRun, refreshActiveRun]);

  const handleRecoverJob = async (shot: ProductionShot, take: ProductionTake) => {
    if (!activeRun || !take.taskId || recoveryLock.current) return;
    recoveryLock.current = true;
    setRecoveringJobId(take.taskId);
    try {
      const started = await paidJobService.recover({
        id: take.taskId,
        runId: activeRun.id,
        shotId: shot.id,
        takeId: take.id,
      });
      setFeedback(t(started ? 'flow.recoveryStarted' : 'flow.recoveryUnavailable'));
      setDurableJobs(await paidJobService.list());
      await refreshActiveRun();
    } catch (failure) {
      setFeedback(failure instanceof Error ? failure.message : t('flow.recoveryUnavailable'));
    } finally {
      recoveryLock.current = false;
      setRecoveringJobId(null);
    }
  };

  const handleManualReview = async (shot: ProductionShot, take: ProductionTake, notes: string) => {
    if (!activeRun) return;
    try {
      await productionRunService.confirmManualReview(activeRun.id, shot.id, take.id, notes);
      await refreshActiveRun();
      setFeedback(t('flow.manualConfirmed'));
    } catch (failure) {
      setFeedback(failure instanceof Error ? failure.message : t('flow.reviewFailed'));
    }
  };

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
  const planEnhancementEstimate = useMemo(
    () => productionRunService.estimatePlanEnhancementCost(),
    [],
  );
  const continuityReviewEstimate = useMemo(
    () =>
      typeof productionRunService.estimateContinuityReviewCost === 'function'
        ? productionRunService.estimateContinuityReviewCost(activeRun?.shots.length ?? 1)
        : ({ maximumChargeUsd: null } as ReturnType<
            typeof productionRunService.estimateContinuityReviewCost
          >),
    [activeRun?.shots.length],
  );
  const preflight = useMemo(
    () =>
      activeRun
        ? productionPreflightService.analyze({
            run: activeRun,
            assets,
            continuityOverrides,
          })
        : null,
    [activeRun, assets, continuityOverrides],
  );

  const handleContinuityOverride = async (shotId: number, reason: string) => {
    if (!activeRun) return;
    try {
      const override = productionPreflightService.createContinuityOverride(
        activeRun,
        shotId,
        reason,
      );
      await productionRunService.recordContinuityOverride(activeRun.id, override);
      setContinuityOverrides((current) => [
        ...current.filter(
          (record) =>
            record.shotId !== override.shotId || record.snapshotHash !== override.snapshotHash,
        ),
        override,
      ]);
      await refreshActiveRun();
      setFeedback(t('messages.continuityOverrideRecorded', 'Continuity warning documented.'));
    } catch (overrideError) {
      setFeedback(
        overrideError instanceof Error
          ? overrideError.message
          : t('messages.continuityOverrideFailed', 'Unable to document continuity warning.'),
      );
    }
  };

  const applyPreflightPatch = async (
    patch: PreflightPatch,
    recommendation: PreflightRecommendation,
  ) => {
    if (!activeRun) return;
    productionPreflightService.trackAppliedRecommendation(activeRun, recommendation);
    await updateShotRequest(patch.shotId, { [patch.field]: patch.value });
    setLastPreflightPatch(patch);
    setLastRecommendationId(recommendation.id);
    setFeedback(t('messages.preflightApplied', { field: patch.field }));
  };

  const undoPreflightPatch = async () => {
    if (lastPreflightPatch?.previousValue === undefined) return;
    await updateShotRequest(lastPreflightPatch.shotId, {
      [lastPreflightPatch.field]: lastPreflightPatch.previousValue,
    });
    setLastPreflightPatch(null);
    if (activeRun && lastRecommendationId) {
      productionPreflightService.discardTrackedRecommendation(activeRun.id, lastRecommendationId);
    }
    setLastRecommendationId(null);
    setFeedback(t('messages.preflightUndone'));
  };

  const handleCreatePlan = async () => {
    const normalizedBible = continuityService.normalizeBible({
      productionBible,
      characterBank,
      locationBank: locations,
      visualDNA,
    }).productionBible;
    const setProductionBible = useAppStore.getState().setProductionBible;
    if (typeof setProductionBible === 'function') {
      setProductionBible(normalizedBible);
    }
    await createLocalPlan({
      projectId: currentProjectId,
      title: t('labels.productionRunTitle', { project: projectName }),
      promptState,
      shots,
      assets,
      productionBible: normalizedBible,
    });
    setFeedback(t('messages.planCreated'));
  };

  const handleEnhancePlan = async () => {
    if (!activeRun) return;
    const maximumChargeUsd = requireUsableCostEstimate(
      productionRunService.estimatePlanEnhancementCost(),
    );
    const approval = await productionRunService.approvePlanEnhancement(
      activeRun.id,
      maximumChargeUsd,
    );
    const approvedRun = await productionRunService.consumePlanEnhancementApproval(
      activeRun.id,
      approval.id,
    );
    try {
      const enhancedBrief = await directorPlanningService.enhancePlanBrief(approvedRun);
      await productionRunService.applyPlanEnhancement(activeRun.id, enhancedBrief);
      await refreshActiveRun();
      setFeedback(t('messages.planEnhanced'));
    } catch (enhancementError) {
      setFeedback(
        enhancementError instanceof Error
          ? enhancementError.message
          : t('messages.planEnhancementFailed'),
      );
    }
  };

  const resolveAssetInput = async (id?: string): Promise<VeoExecutionImage | undefined> => {
    if (!id) return undefined;
    const asset = assets.find((item) => item.id === id && item.type === 'image');
    const inline = assetToInput(asset);
    if (inline) return inline;
    if (!asset) throw new Error('Required reference image is missing.');
    if (asset.storageKey) {
      const record = await mediaAssetService.getRecord(asset.storageKey);
      if (record) return { data: await blobToBase64(record.blob), mimeType: record.mimeType };
      const desktop = await window.electron?.readDesktopMedia?.(asset.storageKey);
      if (desktop?.localUrl) {
        const response = await fetch(desktop.localUrl);
        if (!response.ok) throw new Error('Required reference image could not be read.');
        const blob = await response.blob();
        return { data: await blobToBase64(blob), mimeType: asset.mimeType };
      }
    }
    if (asset.url && /^(blob:|data:|loofi-media:)/.test(asset.url)) {
      const response = await fetch(asset.url);
      if (!response.ok) throw new Error('Required reference image could not be read.');
      return { data: await blobToBase64(await response.blob()), mimeType: asset.mimeType };
    }
    throw new Error('Required reference image has no accessible local media.');
  };

  const resolveInputs = async (request: VeoGenerationRequest): Promise<VeoExecutionInputs> => ({
    firstFrame: await resolveAssetInput(request.firstFrameAssetId),
    lastFrame: await resolveAssetInput(request.lastFrameAssetId),
    referenceImages: (await Promise.all(request.referenceAssetIds.map(resolveAssetInput))).filter(
      (input): input is VeoExecutionImage => Boolean(input),
    ),
    extensionVideoUri: request.extensionArtifact?.mediaUri,
  });

  const handleGenerate = async (shot: ProductionShot) => {
    if (!activeRun) return;
    let take: ProductionTake | null = null;
    try {
      const inputs = await resolveInputs(shot.generationRequest);
      take = await productionRunService.createApprovedTake(activeRun.id, shot.id);
      await videoGenerationService.startGenerationRequest(
        take.request,
        { runId: activeRun.id, shotId: shot.id, takeId: take.id },
        inputs,
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
              : t('messages.generationFailed'),
        });
      }
      setFeedback(
        generationError instanceof Error ? generationError.message : t('messages.generationFailed'),
      );
      await refreshActiveRun();
    }
  };

  const handleReview = async (shot: ProductionShot, take: ProductionTake) => {
    if (!activeRun) return;
    if (
      useGeminiReview &&
      !activeRun.approvals.some(
        (approval) =>
          approval.kind === 'continuity-review' &&
          approval.status === 'active' &&
          approval.shotIds.includes(shot.id),
      )
    ) {
      setFeedback(t('messages.continuityReviewRequired'));
      return;
    }
    let video: { data: string; mimeType: string } | undefined;
    if (useGeminiReview && take.localMediaKey) {
      const record = await mediaAssetService.getRecord(take.localMediaKey);
      if (record) {
        video = { data: await blobToBase64(record.blob), mimeType: record.mimeType };
      }
    }
    const referenceImages = (take.continuitySnapshot?.referenceAssetIds ?? [])
      .map((assetId) => assetToInput(assets.find((asset) => asset.id === assetId)))
      .filter((input): input is VeoExecutionImage => Boolean(input));
    try {
      const review = await productionReviewService.reviewTake({
        shot,
        take,
        video,
        referenceImages,
        useGemini: useGeminiReview,
      });
      await productionRunService.recordReview(activeRun.id, shot.id, take.id, review);
      await refreshActiveRun();
      setFeedback(
        review.source === 'local'
          ? t('flow.reviewCompleteLocal')
          : t('messages.reviewComplete', { score: review.overallScore }),
      );
    } catch (failure) {
      setFeedback(t('flow.reviewFailed') + ' ' + (failure instanceof Error ? failure.message : ''));
    }
  };

  const handleApproveContinuityReview = async () => {
    if (!activeRun) return;
    const shotIds = activeRun.shots
      .filter((shot) =>
        shot.takes.some((take) => ['complete', 'media-at-risk'].includes(take.status)),
      )
      .map((shot) => shot.id);
    if (shotIds.length === 0) {
      setFeedback(t('messages.continuityReviewNoTakes'));
      return;
    }
    const maximumChargeUsd = requireUsableCostEstimate(continuityReviewEstimate);
    await productionRunService.approveContinuityReview(activeRun.id, shotIds, maximumChargeUsd);
    await refreshActiveRun();
    setFeedback(t('messages.continuityReviewApproved'));
  };

  const handleAccept = async (shot: ProductionShot, take: ProductionTake) => {
    if (!activeRun) return;
    const localMediaUrl =
      take.localMediaUrl ||
      (take.localMediaKey ? await mediaAssetService.getObjectUrl(take.localMediaKey) : null) ||
      take.providerMediaUri;
    if (!localMediaUrl) {
      setFeedback(t('messages.noAccessibleMedia'));
      return;
    }

    try {
      await productionRunService.acceptTake(activeRun.id, shot.id, take.id);
    } catch (failure) {
      setFeedback(failure instanceof Error ? failure.message : t('flow.reviewFailed'));
      return;
    }
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
      take.review?.source !== 'local' ? take.review?.overallScore : undefined,
    );
    await refreshActiveRun();
    const measured = impacts.find((impact) => impact.scoreDelta !== undefined);
    setFeedback(
      measured
        ? t('messages.takeAcceptedWithImpact', {
            id: shot.id,
            sign: measured.scoreDelta! >= 0 ? '+' : '',
            score: measured.scoreDelta,
          })
        : t('messages.takeAccepted', { id: shot.id }),
    );
  };

  const handleReject = async (shot: ProductionShot, take: ProductionTake) => {
    if (!activeRun) return;
    await productionRunService.rejectTake(activeRun.id, shot.id, take.id);
    await refreshActiveRun();
    setFeedback(t('messages.takeRejected', { id: shot.id }));
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
        ? t('messages.revisionPrepared', { id: shot.id })
        : t('messages.retakePrepared', { id: shot.id }),
    );
  };

  const handleWaiveMediaRisk = async (shot: ProductionShot, take: ProductionTake) => {
    if (!activeRun) return;
    await productionRunService.waiveMediaRisk(activeRun.id, shot.id, take.id);
    await refreshActiveRun();
  };

  const handleExport = async () => {
    if (!activeRun) return;
    const pack = creativePackExportService.buildCreativePack({
      projectId: currentProjectId,
      promptState,
      shots: useAppStore.getState().sbShots,
      productionRun: activeRun,
      productionBible: useAppStore.getState().productionBible ?? productionBible,
      promptArtifacts: await promptStudioHandoffService.listArtifacts(currentProjectId),
      studioRevisions: await studioRevisionService.list(currentProjectId),
      timeline: {
        tracks: useAppStore.getState().tracks,
        clips: useAppStore.getState().clips,
        zoomLevel: useAppStore.getState().zoomLevel,
        currentTime: useAppStore.getState().currentTime,
      },
    });
    const text = creativePackExportService.exportCreativePack(pack, 'markdown');
    setExportPreview(text);
    try {
      await navigator.clipboard.writeText(text);
      setFeedback(t('messages.packCopied'));
    } catch {
      setFeedback(t('messages.packReady'));
    }
  };

  const captureExportProject = () =>
    useEditorSessionStore
      .getState()
      .captureCurrentProjectDocument({ id: currentProjectId, name: projectName });

  const handleRelinkExportMedia = async (entry: MissingTimelineMedia, assetId: string) => {
    const state = useAppStore.getState();
    const asset = state.assets.find((item) => item.id === assetId);
    const clip = state.clips.find((item) => item.id === entry.clipId);
    if (!asset || !clip || asset.type !== clip.type) return;
    state.updateTimelineClip(clip.id, { resourceId: assetId, selectedTakeId: undefined });
    const project = captureExportProject();
    await projectDocumentService.save(project);
    const check = await preflightProjectOtioExport(project, activeRun);
    setExportMissingMedia(check.missingMedia);
  };

  const handleExportOtio = async () => {
    if (!activeRun) return;
    try {
      const document = useEditorSessionStore
        .getState()
        .captureCurrentProjectDocument({ id: currentProjectId, name: projectName });
      await projectDocumentService.save(document);
      const saved = await projectDocumentService.load(currentProjectId);
      if (!saved) throw new Error('Saved project document is unavailable.');
      const check = await preflightProjectOtioExport(saved, activeRun);
      setExportMissingMedia(check.missingMedia);
      if (check.missingMedia.length) return;
      downloadProjectBlob(
        await exportProjectOtioBundle(saved, activeRun),
        `${projectName}.otio.zip`,
      );
      setFeedback(t('messages.otioReady', 'OTIO package downloaded with local media.'));
    } catch (failure) {
      setFeedback(failure instanceof Error ? failure.message : 'OTIO export failed');
    }
  };

  return {
    exportMissingMedia,
    handleRelinkExportMedia,
    durableJobs,
    recoveringJobId,
    handleRecoverJob,
    handleManualReview,
    handleExportOtio,
    promptState,
    productionBible,
    setPromptState,
    runs,
    activeRun,
    selectedShotIds,
    isLoading,
    error,
    feedback,
    imageAssets,
    extensionTakes,
    selectedCost,
    planEnhancementEstimate,
    continuityReviewEstimate,
    preflight,
    canUndoPreflight: lastPreflightPatch?.previousValue !== undefined,
    useGeminiReview,
    setUseGeminiReview,
    exportPreview,
    selectRun,
    toggleShotSelection,
    selectAllPendingShots,
    approveSelectedShots,
    updateShotRequest,
    updateShotContinuityBinding,
    splitLongShot,
    handleCreatePlan,
    handleEnhancePlan,
    applyPreflightPatch,
    undoPreflightPatch,
    handleGenerate,
    handleReview,
    handleApproveContinuityReview,
    handleContinuityOverride,
    handleAccept,
    handleReject,
    handlePrepareRetake,
    handleWaiveMediaRisk,
    handleExport,
  };
}

export type CreateWorkflowController = ReturnType<typeof useCreateWorkflow>;
