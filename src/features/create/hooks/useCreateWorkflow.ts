import { paidJobService } from '@core/services/paidJobService';
import type { PaidJobTask, GenerationTask } from '@core/types';
import { studioRevisionService } from '@core/services/studioRevisionService';
import { projectDocumentService } from '@core/services/projectDocumentService';
import { projectSaveCoordinator } from '@core/services/projectSaveCoordinator';
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
import { resolveProductionReviewMedia } from '@core/services/localMediaResolver';
import {
  getProductionReviewInputIdentity,
  productionRunService,
} from '@core/services/productionRunService';
import { continuityService } from '@core/services/continuityService';
import { videoGenerationService } from '@core/services/videoGenerationService';
import { veoGenerationService } from '@core/services/veoGenerationService';
import { recordCompletedPaidJobCost } from '@core/services/paidJobService';
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
      recordCompletedPaidJobCost(job);
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

  const handleSaveComparisonNotes = async (
    shot: ProductionShot,
    take: ProductionTake,
    notes: string,
  ) => {
    if (!activeRun) throw new Error('The production run is unavailable.');
    const runId = activeRun.id;
    await productionRunService.saveComparisonNotes(runId, shot.id, take.id, notes);
    // Merge only this editorial field into live state; a late save must not
    // restore an old run or overwrite a background generation update.
    useProductionRunStore.setState((state) => {
      if (
        state.activeRun?.id !== runId ||
        useProjectStore.getState().currentProjectId !== activeRun.projectId
      )
        return state;
      const update = (run: typeof activeRun) => ({
        ...run,
        shots: run.shots.map((item) =>
          item.id === shot.id
            ? {
                ...item,
                takes: item.takes.map((candidate) =>
                  candidate.id === take.id ? { ...candidate, comparisonNotes: notes } : candidate,
                ),
              }
            : item,
        ),
      });
      return {
        activeRun: update(state.activeRun),
        runs: state.runs.map((run) => (run.id === runId ? update(run) : run)),
      };
    });
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
  const totalRunCost = useMemo(
    () =>
      activeRun?.shots.reduce(
        (sum, shot) => sum + veoGenerationService.estimateCost(shot.generationRequest),
        0,
      ) ?? 0,
    [activeRun],
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
    const runId = activeRun?.id;
    const projectId = useProjectStore.getState().currentProjectId;
    const useGemini = useGeminiReview;
    if (
      !runId ||
      !projectId ||
      activeRun?.projectId !== projectId ||
      useEditorSessionStore.getState().projectSnapshot?.id !== projectId
    ) {
      setFeedback(t('messages.projectChanged'));
      return;
    }
    const isCurrentProject = () =>
      useProjectStore.getState().currentProjectId === projectId &&
      useEditorSessionStore.getState().projectSnapshot?.id === projectId;
    try {
      const currentRun = await productionRunService.getRun(runId);
      const currentShot = currentRun?.shots.find((item) => item.id === shot.id);
      const currentTake = currentShot?.takes.find((item) => item.id === take.id);
      if (
        !currentRun ||
        currentRun.projectId !== projectId ||
        !currentShot ||
        !currentTake ||
        !isCurrentProject()
      ) {
        setFeedback(t('messages.reviewStale'));
        return;
      }
      const frozenShot = structuredClone(currentShot);
      const frozenTake = structuredClone(currentTake);
      const inputIdentity = getProductionReviewInputIdentity(frozenShot, frozenTake);
      if (
        useGemini &&
        !currentRun.approvals.some(
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
      let referenceImages: VeoExecutionImage[] = [];
      if (useGemini) {
        const resolved = await resolveProductionReviewMedia(
          frozenTake,
          useAppStore.getState().assets,
        );
        video = resolved.video;
        referenceImages = resolved.referenceImages;
      }
      if (!isCurrentProject()) {
        setFeedback(t('messages.reviewStale'));
        return;
      }
      const review = await productionReviewService.reviewTake({
        shot: frozenShot,
        take: frozenTake,
        video,
        referenceImages,
        useGemini,
      });
      const latestRun = await productionRunService.getRun(runId);
      const latestTake = latestRun?.shots
        .find((item) => item.id === shot.id)
        ?.takes.find((item) => item.id === take.id);
      const latestShot = latestRun?.shots.find((item) => item.id === shot.id);
      const latestIdentity =
        latestShot && latestTake ? getProductionReviewInputIdentity(latestShot, latestTake) : null;
      if (
        !isCurrentProject() ||
        latestRun?.projectId !== projectId ||
        latestIdentity !== inputIdentity
      ) {
        setFeedback(t('messages.reviewStale'));
        return;
      }
      await productionRunService.recordReview(runId, shot.id, take.id, review, inputIdentity);
      await refreshActiveRun();
      setFeedback(
        review.source === 'local'
          ? t('flow.reviewCompleteLocal')
          : t('messages.reviewComplete', { score: review.overallScore }),
      );
    } catch (failure) {
      setFeedback(
        useGemini
          ? `${t('messages.aiReviewNotRun', {
              defaultValue:
                'AI review was not run. Review locally or retry after fixing the media or provider issue.',
            })} ${failure instanceof Error ? failure.message : ''}`
          : `${t('flow.reviewFailed')} ${failure instanceof Error ? failure.message : ''}`,
      );
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
    const projectId = useProjectStore.getState().currentProjectId;
    if (
      !projectId ||
      projectId !== activeRun.projectId ||
      useEditorSessionStore.getState().projectSnapshot?.id !== projectId
    ) {
      setFeedback(
        t('messages.projectChanged', {
          defaultValue: 'The project changed. Reopen the intended project and retry.',
        }),
      );
      return;
    }
    const localMediaUrl =
      take.localMediaUrl ||
      (take.localMediaKey ? await mediaAssetService.getObjectUrl(take.localMediaKey) : null) ||
      take.providerMediaUri;
    if (!localMediaUrl) {
      setFeedback(t('messages.noAccessibleMedia'));
      return;
    }

    const timelineState = useAppStore.getState();
    const storyboardShot = timelineState.sbShots.find((item) => item.id === shot.id);
    const sourceAsset = storyboardShot?.generatedVideoUrl
      ? timelineState.assets.find(
          (asset) =>
            asset.url === storyboardShot.generatedVideoUrl ||
            asset.proxyUrl === storyboardShot.generatedVideoUrl,
        )
      : undefined;
    const previousTakeId =
      shot.selectedTakeId ??
      shot.takes.find(
        (item) =>
          item.localMediaUrl === storyboardShot?.generatedVideoUrl ||
          (sourceAsset && item.localMediaKey === sourceAsset.storageKey),
      )?.id;
    const frozenCount = timelineState.freezeTimelineTakeReferences(
      shot.id,
      previousTakeId,
      previousTakeId ? undefined : sourceAsset?.id,
    );
    if (frozenCount > 0) {
      try {
        await projectSaveCoordinator.saveProject(projectId);
      } catch {
        setFeedback(
          t('messages.timelineFreezeSaveFailed', {
            defaultValue:
              'Existing timeline references could not be saved. Retry saving the project before accepting this take.',
          }),
        );
        return;
      }
    }
    if (useProjectStore.getState().currentProjectId !== projectId) {
      setFeedback(
        t('messages.projectChanged', {
          defaultValue: 'The project changed. Reopen the intended project and retry.',
        }),
      );
      return;
    }

    try {
      await productionRunService.acceptTake(activeRun.id, shot.id, take.id);
    } catch (failure) {
      setFeedback(failure instanceof Error ? failure.message : t('flow.reviewFailed'));
      return;
    }
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

  const handlePlaceTake = async (
    shot: ProductionShot,
    take: ProductionTake,
    targetClipId?: string,
  ) => {
    if (!activeRun) return;
    const projectId = useProjectStore.getState().currentProjectId;
    if (!projectId || activeRun.projectId !== projectId) {
      setFeedback(
        t('messages.projectChanged', {
          defaultValue: 'The project changed. Reopen the intended project and retry.',
        }),
      );
      return;
    }
    const run = await productionRunService.getRun(activeRun.id);
    if (!run || run.projectId !== projectId) {
      setFeedback(
        t('messages.projectChanged', {
          defaultValue: 'The project changed. Reopen the intended project and retry.',
        }),
      );
      return;
    }
    const latestShot = run.shots.find((item) => item.id === shot.id);
    const latestTake = latestShot?.takes.find((item) => item.id === take.id);
    if (
      !latestShot ||
      !latestTake ||
      latestShot.selectedTakeId !== take.id ||
      latestTake.localMediaKey !== take.localMediaKey ||
      latestTake.status !== 'accepted'
    ) {
      setFeedback(
        t('messages.takeChanged', {
          defaultValue: 'This accepted take changed. Refresh review before placing it.',
        }),
      );
      return;
    }
    if (!take.localMediaKey) {
      setFeedback(
        t('messages.localMediaRequired', {
          defaultValue: 'Save this take locally before placing it in the timeline.',
        }),
      );
      return;
    }

    const asset = useAppStore
      .getState()
      .assets.find((item) => item.id === take.id || item.storageKey === take.localMediaKey);
    const metadata = await window.electron?.inspectTimelineRenderMedia?.(take.localMediaKey);
    if (metadata && !metadata.available) {
      setFeedback(metadata.reason ?? t('messages.localMediaRequired'));
      return;
    }
    const duration = metadata?.durationSeconds ?? asset?.durationSeconds;
    if (typeof duration !== 'number' || !Number.isFinite(duration) || duration <= 0) {
      setFeedback(
        t('messages.mediaDurationUnverified', {
          defaultValue:
            'The local video duration could not be verified. Reimport the video and retry.',
        }),
      );
      return;
    }
    if (
      useProjectStore.getState().currentProjectId !== projectId ||
      useEditorSessionStore.getState().projectSnapshot?.id !== projectId
    ) {
      setFeedback(
        t('messages.projectChanged', {
          defaultValue: 'The project changed. Reopen the intended project and retry.',
        }),
      );
      return;
    }

    try {
      const clipId = useAppStore.getState().placeProductionTake({
        assetId: asset?.id ?? take.id,
        takeId: take.id,
        label: `${shot.title} · ${take.id.slice(0, 8)}`,
        duration,
        targetClipId,
      });
      await projectSaveCoordinator.saveProject(projectId);
      setFeedback(
        targetClipId
          ? t('messages.takeReplaced', { defaultValue: 'The timeline clip was replaced.' })
          : t('messages.takePlaced', {
              defaultValue: 'The accepted take was added as a separate timeline clip.',
            }),
      );
      useAppStore
        .getState()
        .setCurrentTime(
          useAppStore.getState().clips.find((clip) => clip.id === clipId)?.startTime ?? 0,
        );
    } catch (failure) {
      setFeedback(failure instanceof Error ? failure.message : t('flow.reviewFailed'));
    }
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
    let prompt = shot.prompt;
    if (useRevision) {
      if (take.review?.proposedRevisionPrompt) {
        prompt = take.review.proposedRevisionPrompt;
      } else if (revisionNotes?.trim()) {
        const notes = revisionNotes.trim();
        prompt = shot.prompt.includes('[Revision note:')
          ? shot.prompt.replace(/\[Revision note:[\s\S]*?\]/, `[Revision note: ${notes}]`)
          : `${shot.prompt}\n\n[Revision note: ${notes}]`;
      }
    }
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

  const handleBatchShotSettings = async (
    updates: Partial<Pick<VeoGenerationRequest, 'resolution' | 'aspectRatio' | 'durationSeconds'>>,
  ) => {
    if (!activeRun) return;
    const targetShots = activeRun.shots.filter((shot) =>
      selectedShotIds.length > 0 ? selectedShotIds.includes(shot.id) : shot.status !== 'accepted',
    );
    for (const shot of targetShots) {
      const nextUpdates = { ...updates };
      if (updates.durationSeconds !== undefined) {
        await updateShotRequest(shot.id, nextUpdates);
      } else {
        await updateShotRequest(shot.id, nextUpdates);
      }
    }
    setFeedback(
      t('messages.batchSettingsApplied', {
        defaultValue: 'Applied batch settings to {{count}} shots.',
        count: targetShots.length,
      }),
    );
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
      creatorDelivery: (await projectDocumentService.load(currentProjectId))?.creatorDelivery,
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

  const handleRelinkExportMedia = async (entry: MissingTimelineMedia, assetId: string) => {
    const state = useAppStore.getState();
    const asset = state.assets.find((item) => item.id === assetId);
    const clip = state.clips.find((item) => item.id === entry.clipId);
    if (!asset || !clip || asset.type !== clip.type) return;
    state.updateTimelineClip(clip.id, { resourceId: assetId, selectedTakeId: undefined });
    await projectSaveCoordinator.saveProject(currentProjectId);
    const project = await projectDocumentService.load(currentProjectId);
    if (useProjectStore.getState().currentProjectId !== currentProjectId) return;
    if (!project) throw new Error('Saved project document is unavailable.');
    const check = await preflightProjectOtioExport(project, activeRun);
    if (useProjectStore.getState().currentProjectId !== currentProjectId) return;
    setExportMissingMedia(check.missingMedia);
  };

  const handleExportOtio = async () => {
    if (!activeRun) return;
    try {
      await projectSaveCoordinator.saveProject(currentProjectId);
      const saved = await projectDocumentService.load(currentProjectId);
      if (useProjectStore.getState().currentProjectId !== currentProjectId) return;
      if (!saved) throw new Error('Saved project document is unavailable.');
      const check = await preflightProjectOtioExport(saved, activeRun);
      if (useProjectStore.getState().currentProjectId !== currentProjectId) return;
      setExportMissingMedia(check.missingMedia);
      if (check.missingMedia.length) return;
      const bundle = await exportProjectOtioBundle(saved, activeRun);
      if (useProjectStore.getState().currentProjectId !== currentProjectId) return;
      downloadProjectBlob(bundle, `${projectName}.otio.zip`);
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
    handleSaveComparisonNotes,
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
    totalRunCost,
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
    handlePlaceTake,
    handleReject,
    handlePrepareRetake,
    handleWaiveMediaRisk,
    handleBatchShotSettings,
    handleExport,
  };
}

export type CreateWorkflowController = ReturnType<typeof useCreateWorkflow>;
