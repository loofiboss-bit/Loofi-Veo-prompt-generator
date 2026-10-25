import { useRenderJobsStore } from '@core/store/useRenderJobsStore';
import { useRenderBatchStore } from '@core/store/useRenderBatchStore';
import { getCreatorCaptionOverlaps } from '@core/services/creatorCaptionService';
import type { CreatorDeliveryDiagnostic } from '@core/services/creatorDeliveryService';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Asset, Caption, Project, TimelineClip } from '@core/types';
import type {
  CreatorAspectRatio,
  CreatorDeliveryV1,
  TimelineRenderCapabilities,
  TimelineRenderJobV1,
} from '@core/types/creatorDelivery';
import {
  creatorDeliveryService,
  CreatorRenderError,
  defaultCreatorDelivery,
  hashRenderContent,
  canonicalRenderJson,
} from '@core/services/creatorDeliveryService';
import {
  creatorCaptionService,
  exportCreatorSrt,
  importCreatorSrt,
  validateCreatorCaptions,
} from '@core/services/creatorCaptionService';
import {
  assertClipAudioRequestCurrent,
  creatorAsrService,
  CREATOR_ASR_LANGUAGES,
  type CaptionProposal,
  type ClipAudioRequest,
  type CreatorAsrLanguage,
  type CreatorAsrModelInfo,
} from '@core/services/creatorAsrService';
import {
  buildTimelineChapterTimestamps,
  creatorPublishingService,
  mergeChapterTimestampsIntoDescription,
  type CreatorPublishingText,
} from '@core/services/creatorPublishingService';
import { projectDocumentService } from '@core/services/projectDocumentService';
import { projectSaveCoordinator } from '@core/services/projectSaveCoordinator';
import { downloadProjectBlob } from '@core/services/projectTransferService';
import { resolveOtioSelection } from '@core/services/otioExportService';
import { resolveProjectAssetBlob } from '@core/utils/projectArchiver';
import { useAppStore } from '@core/store/useAppStore';
import { useProjectStore } from '@core/store/useProjectStore';
import { useEditorSessionStore } from '@core/store/useEditorSessionStore';
import { useProductionRunStore } from '@core/store/useProductionRunStore';

const creatorAsrLanguageLabels: Record<CreatorAsrLanguage, string> = {
  auto: 'Auto-detect',
  en: 'English',
  sv: 'Swedish',
  es: 'Spanish',
  fr: 'French',
  ja: 'Japanese',
  ar: 'Arabic',
};

export function CreatorDeliveryPanel() {
  const { t, i18n } = useTranslation('creator');
  const projectId = useProjectStore((state) => state.currentProjectId);
  const projectName =
    useProjectStore((state) => state.projects.find((item) => item.id === projectId)?.name) ??
    'Project';
  const clips = useAppStore((state) => state.clips);
  const assets = useAppStore((state) => state.assets);
  const currentTime = useAppStore((state) => state.currentTime);
  const [settings, setSettings] = useState<CreatorDeliveryV1 | null>(null);
  const [capabilities, setCapabilities] = useState<TimelineRenderCapabilities>({
    available: false,
  });
  const jobs = useRenderJobsStore((state) => state.jobs);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const projectJobs = jobs.filter((item) => item.projectId === projectId);
  const job = projectJobs.find((item) => item.id === selectedJobId) ?? projectJobs.at(-1) ?? null;
  const setJob = (value: TimelineRenderJobV1 | null) => {
    setSelectedJobId(value?.id ?? null);
    if (value) useRenderJobsStore.getState().receive(value);
  };
  const [diagnosticBinding, setDiagnosticBinding] = useState('');
  const [diagnostics, setDiagnostics] = useState<CreatorDeliveryDiagnostic[] | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewBinding, setPreviewBinding] = useState('');
  const [previewHash, setPreviewHash] = useState('');
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [shift, setShift] = useState(0);
  const [error, setError] = useState('');
  const [errorClip, setErrorClip] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [resolution, setResolution] = useState<'720p' | '1080p'>('1080p');
  const batches = useRenderBatchStore((state) => state.batches);
  const batch = batches.filter((item) => item.projectId === projectId).at(-1);
  const batchProgress =
    batch?.status === 'running'
      ? {
          current: Math.min(
            batch.items.filter((item) => item.complete).length + 1,
            batch.items.length,
          ),
          total: batch.items.length,
          format:
            batch.items.find((item) => !item.complete)?.plan.aspectRatio ??
            batch.items.at(-1)!.plan.aspectRatio,
        }
      : null;
  const anyBatchRunning = batches.some((item) => item.status === 'running');
  const [audioId, setAudioId] = useState('');
  const [asrClipId, setAsrClipId] = useState('');
  const [asrLanguage, setAsrLanguage] = useState<CreatorAsrLanguage>('auto');
  const [asrModelInfo, setAsrModelInfo] = useState<CreatorAsrModelInfo | null>(null);
  const [asrModelError, setAsrModelError] = useState('');
  const [asrInstallConfirm, setAsrInstallConfirm] = useState(false);
  const [asrRemoveConfirm, setAsrRemoveConfirm] = useState(false);
  const [asrInstalling, setAsrInstalling] = useState(false);
  const [asrInstallPhase, setAsrInstallPhase] = useState<'downloading' | 'verifying' | 'ready'>(
    'downloading',
  );
  const [asrInstallProgress, setAsrInstallProgress] = useState({ loadedBytes: 0, totalBytes: 0 });
  const [asrBusy, setAsrBusy] = useState(false);
  const [asrStatus, setAsrStatus] = useState('');
  const [asrProposal, setAsrProposal] = useState<{
    proposal: CaptionProposal;
    binding: string;
    captions: Caption[];
  } | null>(null);
  const [consent, setConsent] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [publishProposal, setPublishProposal] = useState<{
    text: CreatorPublishingText;
    binding: string;
  } | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const [proposal, setProposal] = useState<{
    captions: Caption[];
    binding: string;
    sourceClipId?: string;
    kind?: 'time-blocks' | 'provider';
  } | null>(null);
  const idRef = useRef(projectId);
  idRef.current = projectId;
  const busyRef = useRef(false);
  const audioRef = useRef(audioId);
  audioRef.current = audioId;
  const jobRef = useRef(job);
  jobRef.current = job;
  const duration = Math.max(
    0,
    ...clips.filter((clip) => clip.type !== 'text').map((clip) => clip.startTime + clip.duration),
  );
  const captionClips = clips.filter((clip) => clip.type === 'text' && clip.caption);
  const captions = captionClips.map((clip) => ({
    ...clip.caption!,
    startTime: clip.startTime,
    endTime: clip.startTime + clip.duration,
  }));
  const binding = () =>
    JSON.stringify({
      id: idRef.current,
      audioId: audioRef.current,
      clips: useAppStore.getState().clips,
    });
  const getAssetForTimelineClip = (clip: TimelineClip | undefined): Asset | undefined => {
    if (!clip) return undefined;
    const resourceId = String(clip.resourceId);
    return assets.find((asset) => asset.id === resourceId || asset.storageKey === resourceId);
  };
  const refreshAsrModelInfo = useCallback(async () => {
    try {
      setAsrModelInfo(await creatorAsrService.getModelInfo());
      setAsrModelError('');
    } catch (reason) {
      setAsrModelInfo(null);
      setAsrModelError(
        window.electron?.getCreatorAsrModelInfo
          ? reason instanceof Error
            ? reason.message
            : String(reason)
          : '',
      );
    }
  }, []);
  const formatBytes = (bytes: number) => {
    if (!Number.isFinite(bytes) || bytes < 0) return '0 MB';
    return bytes >= 1024 ** 3
      ? `${(bytes / 1024 ** 3).toFixed(1)} GB`
      : `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  };
  const asrSourceClips = clips.filter(
    (clip) =>
      (clip.type === 'audio' || clip.type === 'video') &&
      Boolean(getAssetForTimelineClip(clip)) &&
      clip.offset >= 0 &&
      clip.duration > 0,
  );
  const selectedAsrClip = asrSourceClips.find((clip) => clip.id === asrClipId);
  const selectedAsrAsset = getAssetForTimelineClip(selectedAsrClip);
  const publicationBinding = async (id: string | null): Promise<string> => {
    const snapshot = canonicalRenderJson({ projectId: id, settings: settingsRef.current });
    const hash = await hashRenderContent(JSON.parse(snapshot));
    if (
      snapshot !== canonicalRenderJson({ projectId: idRef.current, settings: settingsRef.current })
    )
      throw new Error(
        t('delivery.publishStale', 'Publication text or project changed. Request a new proposal.'),
      );
    return `${hash}:${snapshot}`;
  };
  useEffect(() => {
    let live = true;
    setSettings(null);
    setJob(null);
    setProposal(null);
    setAsrProposal(null);
    setPublishProposal(null);
    setConsent(false);
    setError('');
    setDiagnostics(null);
    setPreviewUrl('');
    setPreviewBinding('');
    setPreviewHash('');
    setBusy(false);
    if (projectId)
      void projectDocumentService
        .load(projectId)
        .then((project) => {
          if (live && project) {
            const current = useEditorSessionStore.getState().projectSnapshot;
            setSettings(
              (current?.id === projectId ? current.creatorDelivery : undefined) ??
                project.creatorDelivery ??
                defaultCreatorDelivery(project),
            );
          }
        })
        .catch((reason: unknown) => {
          if (live) setError(String(reason));
        });
    return () => {
      live = false;
    };
  }, [projectId]);
  useEffect(() => {
    void refreshAsrModelInfo();
    // Model status is app-scoped and is refreshed after explicit install/removal actions.
  }, [refreshAsrModelInfo]);
  useEffect(
    () =>
      useEditorSessionStore.subscribe((state, previous) => {
        if (
          state.transitionVersion !== previous.transitionVersion &&
          state.phase === 'ready' &&
          state.lastOperation === 'load' &&
          state.projectSnapshot?.id === projectId
        ) {
          const next =
            state.projectSnapshot.creatorDelivery ?? defaultCreatorDelivery(state.projectSnapshot);
          settingsRef.current = next;
          setSettings(next);
        }
      }),
    [projectId],
  );
  useEffect(() => {
    let live = true;
    if (window.electron?.getTimelineRenderCapabilities)
      void window.electron
        .getTimelineRenderCapabilities()
        .then((result) => {
          if (live) setCapabilities(result);
        })
        .catch(() => {
          if (live)
            setCapabilities({
              available: false,
              reason: 'Local rendering could not be initialized.',
            });
        });
    void useRenderBatchStore
      .getState()
      .hydrate()
      .catch((reason: unknown) => {
        if (live) setError(String(reason));
      });
    void useRenderJobsStore
      .getState()
      .hydrate()
      .catch((reason: unknown) => {
        if (live) setError(reason instanceof Error ? reason.message : String(reason));
      });
    return () => {
      live = false;
    };
  }, []);

  const change = (updates: Partial<CreatorDeliveryV1>) => {
    const value = settingsRef.current;
    if (!value || !projectId) return;
    const next = { ...value, ...updates, revision: value.revision + 1, updatedAt: Date.now() };
    settingsRef.current = next;
    setSettings(next);
    const snapshot = useEditorSessionStore.getState().projectSnapshot;
    if (snapshot?.id === projectId)
      useEditorSessionStore.setState({ projectSnapshot: { ...snapshot, creatorDelivery: next } });
  };
  const act = async (operation: (id: string) => Promise<void>) => {
    if (!projectId || busyRef.current) return;
    busyRef.current = true;
    const id = projectId;
    setBusy(true);
    setError('');
    setErrorClip(undefined);
    try {
      await operation(id);
    } catch (reason) {
      if (idRef.current === id) {
        setError(reason instanceof Error ? reason.message : String(reason));
        if (reason instanceof CreatorRenderError) setErrorClip(reason.clipId);
      }
    } finally {
      busyRef.current = false;
      if (idRef.current === id) setBusy(false);
    }
  };
  const capture = async (id: string): Promise<Project> => {
    const document = useEditorSessionStore
      .getState()
      .captureCurrentProjectDocument({ id, name: projectName });
    await projectDocumentService.save(document);
    if (idRef.current !== id) throw new Error('Project changed.');
    const saved = await projectDocumentService.load(id);
    if (!saved) throw new Error('Save this project before exporting.');
    return saved;
  };
  const timelineBinding = () =>
    canonicalRenderJson({
      projectId: idRef.current,
      clips: useAppStore.getState().clips,
      tracks: useAppStore.getState().tracks,
      shots: useAppStore.getState().sbShots,
      settings: settingsRef.current ? { ...settingsRef.current, revision: 0, updatedAt: 0 } : null,
      assets: useAppStore
        .getState()
        .assets.map(({ id, storageKey, url }) => ({ id, storageKey, url })),
    });
  const check = () =>
    act(async (id) => {
      const before = timelineBinding();
      const snapshot = useEditorSessionStore
        .getState()
        .captureCurrentProjectDocument({ id, name: projectName });
      snapshot.creatorDelivery = settingsRef.current!;
      const run = useProductionRunStore.getState().activeRun;
      const result = await creatorDeliveryService.preflight(
        snapshot,
        assets,
        run?.projectId === id ? run : null,
      );
      if (idRef.current === id && timelineBinding() === before) {
        setDiagnostics(result);
        setDiagnosticBinding(before);
      } else throw new Error(t('v16.changed', 'The edit changed. Check the delivery again.'));
    });
  const render = (purpose: 'delivery' | 'preview' = 'delivery') =>
    act(async (id) => {
      if (!settings || !window.electron?.startTimelineRender)
        throw new Error('Local export requires the desktop app.');
      const requested = settingsRef.current!;
      await projectSaveCoordinator.saveProject(id);
      if (idRef.current !== id) return;
      await capture(id);
      const savedSettings = await creatorDeliveryService.saveSettings(id, requested);
      if (idRef.current !== id || settingsRef.current !== requested) return;
      setSettings(savedSettings);
      settingsRef.current = savedSettings;
      const project = (await projectDocumentService.load(id))!;
      const run = useProductionRunStore.getState().activeRun;
      const check = await creatorDeliveryService.preflight(
        project,
        assets,
        run?.projectId === id ? run : null,
      );
      if (idRef.current !== id) return;
      setDiagnostics(check);
      setDiagnosticBinding(timelineBinding());
      if (check.length) return;
      const frozenBinding = timelineBinding();
      const plan = await creatorDeliveryService.buildPlan(
        project,
        assets,
        run?.projectId === id ? run : null,
        purpose === 'preview' ? '720p' : resolution,
        purpose,
      );
      if (idRef.current !== id || timelineBinding() !== frozenBinding) return;
      const started = await useRenderJobsStore.getState().start(plan);
      if (idRef.current !== id) return;
      setJob(started);
      jobRef.current = started;
      if (purpose === 'preview') {
        setPreviewUrl('');
        setPreviewBinding(frozenBinding);
        setPreviewHash(plan.contentHash);
      }
      const latest = await window.electron.getTimelineRenderJob?.(started.id);
      if (latest && idRef.current === id) setJob(latest);
    });
  const renderBatch = () =>
    act(async (id) => {
      if (!settings || !window.electron?.startTimelineRender)
        throw new Error('Local export requires the desktop app.');
      const requested = settingsRef.current!;
      const targetFormats = (
        requested.batchFormats?.length ? requested.batchFormats : [requested.aspectRatio]
      ) as CreatorAspectRatio[];
      await projectSaveCoordinator.saveProject(id);
      if (idRef.current !== id) return;
      await capture(id);
      const savedSettings = await creatorDeliveryService.saveSettings(id, requested);
      if (idRef.current !== id || settingsRef.current !== requested) return;
      setSettings(savedSettings);
      settingsRef.current = savedSettings;
      const project = (await projectDocumentService.load(id))!;
      const run = useProductionRunStore.getState().activeRun;
      const check = await creatorDeliveryService.preflight(
        project,
        assets,
        run?.projectId === id ? run : null,
      );
      if (idRef.current !== id) return;
      setDiagnostics(check);
      setDiagnosticBinding(timelineBinding());
      if (check.length) return;
      const frozenBinding = timelineBinding();
      const plans = await creatorDeliveryService.buildBatchPlans(
        project,
        assets,
        targetFormats,
        run?.projectId === id ? run : null,
        resolution,
        'delivery',
      );
      if (idRef.current !== id || timelineBinding() !== frozenBinding) return;

      await useRenderBatchStore.getState().start(plans);
    });
  const addCaptions = (
    values: Caption[],
    mode: 'append' | 'replace' = 'append',
    sourceClipId?: string,
  ) => {
    validateCreatorCaptions(values, duration);
    useAppStore.getState().importTimelineCaptions(values, mode, sourceClipId);
  };
  const createAsrProposal = async () => {
    const sourceClip = selectedAsrClip;
    const sourceAsset = selectedAsrAsset;
    const projectIdAtStart = projectId;
    if (!sourceClip || !sourceAsset || !projectIdAtStart) return;
    if (!asrModelInfo?.status.installed) {
      setAsrModelError(
        t('delivery.asrInstallFirst', 'Install the local speech model before transcribing.'),
      );
      return;
    }
    if (!window.electron?.extractTimelineAudio || !window.electron.inspectTimelineRenderMedia) {
      setAsrModelError(
        t('delivery.asrDesktopOnly', 'Local speech transcription is available in the desktop app.'),
      );
      return;
    }
    const mediaId = sourceAsset.storageKey || sourceAsset.id;
    const clipsAtStart = structuredClone(useAppStore.getState().clips);
    const selectionBinding = JSON.stringify({
      projectId: projectIdAtStart,
      clips: clipsAtStart,
      selectedClipId: sourceClip.id,
      mediaId,
      language: asrLanguage,
    });
    setAsrBusy(true);
    setAsrStatus(t('delivery.asrPreparing', 'Preparing the selected local clip…'));
    setAsrModelError('');
    setError('');
    setAsrProposal(null);
    try {
      const project = await projectDocumentService.load(projectIdAtStart);
      if (!project)
        throw new Error(
          t('delivery.asrProjectMissing', 'The current project could not be loaded.'),
        );
      const inspection = await window.electron.inspectTimelineRenderMedia(mediaId);
      if (!inspection.available || !inspection.streamTypes?.includes('audio'))
        throw new Error(
          t('delivery.asrNoAudio', 'The selected clip has no readable audio stream.'),
        );
      const extracted = await window.electron.extractTimelineAudio({
        mediaId,
        offsetSeconds: sourceClip.offset,
        durationSeconds: sourceClip.duration,
      });
      if (inspection.sha256 && extracted.mediaSha256 !== inspection.sha256)
        throw new Error(
          t('delivery.asrMediaChanged', 'The source media changed. Select it again.'),
        );
      if (
        idRef.current !== projectIdAtStart ||
        JSON.stringify({
          projectId: idRef.current,
          clips: useAppStore.getState().clips,
          selectedClipId: asrClipId,
          mediaId,
          language: asrLanguage,
        }) !== selectionBinding
      )
        throw new Error(
          t(
            'delivery.asrStale',
            'The project or selected clip changed. Start a new transcription.',
          ),
        );

      const request: ClipAudioRequest = {
        requestId: crypto.randomUUID(),
        projectId: projectIdAtStart,
        projectRevision: project.documentRevision ?? 0,
        clipId: sourceClip.id,
        mediaId,
        mediaSha256: extracted.mediaSha256,
        offsetSeconds: sourceClip.offset,
        durationSeconds: sourceClip.duration,
        language: asrLanguage,
      };
      setAsrStatus(t('delivery.asrLoading', 'Loading the local speech model…'));
      const result = await creatorAsrService.transcribe(extracted.pcm, asrLanguage, (status) => {
        setAsrStatus(
          status === 'loading-model'
            ? t('delivery.asrLoading', 'Loading the local speech model…')
            : t('delivery.asrTranscribing', 'Transcribing on this device…'),
        );
      });
      if (
        idRef.current !== projectIdAtStart ||
        JSON.stringify({
          projectId: idRef.current,
          clips: useAppStore.getState().clips,
          selectedClipId: asrClipId,
          mediaId,
          language: asrLanguage,
        }) !== selectionBinding
      )
        throw new Error(
          t(
            'delivery.asrStale',
            'The project or selected clip changed. Start a new transcription.',
          ),
        );
      const captions = result.segments.map((caption) => ({
        ...caption,
        startTime: sourceClip.startTime + caption.startTime,
        endTime: sourceClip.startTime + caption.endTime,
      }));
      validateCreatorCaptions(captions, duration);
      setAsrProposal({
        proposal: {
          request,
          modelId: result.modelId,
          modelRevision: result.modelRevision,
          segments: result.segments,
          transcript: result.transcript,
        },
        binding: selectionBinding,
        captions,
      });
      setAsrStatus(t('delivery.asrReview', 'Review and edit the transcript before accepting it.'));
    } catch (reason) {
      setAsrModelError(reason instanceof Error ? reason.message : String(reason));
      setAsrStatus('');
    } finally {
      setAsrBusy(false);
    }
  };
  const acceptAsrProposal = async () => {
    const current = asrProposal;
    if (!current || !window.electron?.inspectTimelineRenderMedia) return;
    setAsrBusy(true);
    setAsrModelError('');
    try {
      const request = current.proposal.request;
      const latestClip = useAppStore.getState().clips.find((clip) => clip.id === request.clipId);
      const latestAsset = getAssetForTimelineClip(latestClip);
      if (
        idRef.current !== request.projectId ||
        asrClipId !== request.clipId ||
        !latestClip ||
        !latestAsset ||
        (latestAsset.storageKey || latestAsset.id) !== request.mediaId ||
        latestClip.offset !== request.offsetSeconds ||
        latestClip.duration !== request.durationSeconds
      )
        throw new Error(
          t(
            'delivery.asrStale',
            'The project or selected clip changed. Start a new transcription.',
          ),
        );
      const inspection = await window.electron.inspectTimelineRenderMedia(request.mediaId);
      if (!inspection.available || !inspection.sha256)
        throw new Error(
          t('delivery.asrMediaChanged', 'The source media changed. Select it again.'),
        );
      const latestProject = await projectDocumentService.load(request.projectId);
      if (!latestProject)
        throw new Error(
          t('delivery.asrProjectMissing', 'The current project could not be loaded.'),
        );
      assertClipAudioRequestCurrent(request, {
        projectId: idRef.current ?? '',
        projectRevision: latestProject.documentRevision ?? 0,
        clipId: latestClip.id,
        mediaId: latestAsset.storageKey || latestAsset.id,
        mediaSha256: inspection.sha256,
        offsetSeconds: latestClip.offset,
        durationSeconds: latestClip.duration,
      });
      if (
        JSON.stringify({
          projectId: idRef.current,
          clips: useAppStore.getState().clips,
          selectedClipId: asrClipId,
          mediaId: request.mediaId,
          language: asrLanguage,
        }) !== current.binding
      )
        throw new Error(
          t(
            'delivery.asrStale',
            'The project or selected clip changed. Start a new transcription.',
          ),
        );
      addCaptions(current.captions, 'append', request.clipId);
      setAsrProposal(null);
      setAsrStatus('');
    } catch (reason) {
      setAsrModelError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setAsrBusy(false);
    }
  };
  useEffect(() => {
    if (!projectId || !settings || !job || job.status !== 'complete' || job.purpose !== 'preview')
      return;
    let live = true;
    const before = timelineBinding();
    void (async () => {
      const media = await window.electron?.getTimelineRenderPreview?.(job.id);
      if (!live || !media || media.contentHash !== job.contentHash) return;
      setPreviewUrl(media.url);
      if (previewHash === job.contentHash) return;
      // Reopening a completed preview requires matching its frozen plan to the current edit.
      const snapshot = useEditorSessionStore
        .getState()
        .captureCurrentProjectDocument({ id: projectId, name: projectName });
      snapshot.creatorDelivery = settings;
      const run = useProductionRunStore.getState().activeRun;
      const plan = await creatorDeliveryService.buildPlan(
        snapshot,
        assets,
        run?.projectId === projectId ? run : null,
        '720p',
        'preview',
      );
      if (live && before === timelineBinding() && plan.contentHash === media.contentHash) {
        setPreviewHash(media.contentHash);
        setPreviewBinding(before);
      }
    })().catch((reason: unknown) => {
      if (live) setError(reason instanceof Error ? reason.message : String(reason));
    });
    return () => {
      live = false;
    };
    // Current edits change the stale label; they must not overwrite a preview's frozen binding.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.id, job?.status, projectId, !!settings]);
  if (!projectId || !settings)
    return (
      <p className="p-4">
        {t('delivery.saveProject', 'Open a saved project to prepare a video delivery.')}
      </p>
    );
  const running = job && ['queued', 'rendering', 'verifying'].includes(job.status);
  const failedClip = job?.error ? clips.find((clip) => job.error!.includes(clip.id)) : undefined;
  const selectedAudio = assets.find((asset) => asset.id === audioId);
  const selectedAudioClip = clips.find(
    (clip) => clip.type === 'audio' && clip.resourceId === audioId,
  );
  const inputClass = 'rounded border border-slate-600 bg-slate-950 p-2 text-slate-100';
  const buttonClass = 'rounded border border-slate-500 px-3 py-2 disabled:opacity-50';
  return (
    <section
      aria-labelledby="creator-delivery-title"
      className="space-y-4 rounded-xl border border-slate-700 bg-slate-900 p-4 text-slate-100"
    >
      <h2 id="creator-delivery-title" className="text-xl font-semibold">
        {t('delivery.title', 'Export video')}
      </h2>
      {!capabilities.available && (
        <p role="status">
          {t(
            'delivery.desktopRequired',
            'Local MP4 export requires the desktop app with its bundled renderer.',
          )}
          {capabilities.reason ? ` ${capabilities.reason}` : ''}
        </p>
      )}
      <div className="flex flex-wrap gap-4">
        <label>
          {t('delivery.ratio', 'Format')}{' '}
          <select
            aria-label={t('delivery.ratio', 'Format')}
            className={inputClass}
            value={settings.aspectRatio}
            onChange={(event) =>
              change({ aspectRatio: event.target.value as CreatorDeliveryV1['aspectRatio'] })
            }
          >
            {['9:16', '16:9', '1:1'].map((ratio) => (
              <option key={ratio}>{ratio}</option>
            ))}
          </select>
        </label>
        <label>
          {t('delivery.resolution', 'Resolution')}{' '}
          <select
            aria-label={t('delivery.resolution', 'Resolution')}
            className={inputClass}
            value={resolution}
            onChange={(event) => setResolution(event.target.value as typeof resolution)}
          >
            <option>1080p</option>
            <option>720p</option>
          </select>
        </label>
        <label>
          {t('delivery.margin', 'Safe margin')}{' '}
          <input
            aria-label={t('delivery.margin', 'Safe margin')}
            type="range"
            min="0.02"
            max="0.2"
            step="0.01"
            value={settings.safeMargin}
            onChange={(event) => change({ safeMargin: Number(event.target.value) })}
          />{' '}
          {Math.round(settings.safeMargin * 100)}%
        </label>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-400">
            {t('delivery.batchFormats', 'Batch export formats')}
          </span>
          <div className="flex items-center gap-3">
            {(['9:16', '16:9', '1:1'] as const).map((ratio) => {
              const active = settings.batchFormats ?? [settings.aspectRatio];
              const checked = active.includes(ratio);
              return (
                <label key={ratio} className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-slate-700 bg-slate-800 text-sky-500 focus:ring-sky-500"
                    checked={checked}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...active, ratio]
                        : active.filter((r) => r !== ratio);
                      change({ batchFormats: next.length ? next : [ratio] });
                    }}
                  />
                  <span>{ratio}</span>
                </label>
              );
            })}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-400">
            {t('delivery.coverPoster', 'Poster cover frame')}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={buttonClass}
              onClick={() => change({ coverTimestamp: currentTime })}
            >
              {t('delivery.setPosterAtPlayhead', 'Set at playhead')} ({currentTime.toFixed(2)}s)
            </button>
            {settings.coverTimestamp !== undefined && (
              <button
                type="button"
                className={buttonClass}
                onClick={() => change({ coverTimestamp: undefined })}
              >
                {t('delivery.resetPoster', 'Reset to 0s')}
              </button>
            )}
            <span className="text-xs text-slate-400">
              {settings.coverTimestamp !== undefined
                ? `${settings.coverTimestamp.toFixed(2)}s`
                : 'Start (0.00s)'}
            </span>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-6 rounded-lg bg-slate-950/40 p-3 text-sm text-slate-300">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="rounded border-slate-700 bg-slate-800 text-sky-500 focus:ring-sky-500"
            checked={settings.audioProcessing?.normalizeLoudness ?? true}
            onChange={(event) =>
              change({
                audioProcessing: {
                  ...settings.audioProcessing,
                  normalizeLoudness: event.target.checked,
                },
              })
            }
          />
          <span>{t('delivery.normalizeLoudness', 'Normalize loudness (EBU R128 -14 LUFS)')}</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="rounded border-slate-700 bg-slate-800 text-sky-500 focus:ring-sky-500"
            checked={settings.audioProcessing?.speechDucking ?? false}
            onChange={(event) =>
              change({
                audioProcessing: {
                  ...settings.audioProcessing,
                  speechDucking: event.target.checked,
                },
              })
            }
          />
          <span>{t('delivery.speechDucking', 'Lower music during speech (-12 dB)')}</span>
        </label>
      </div>
      <p>
        {t('delivery.limit', 'Up to 180 seconds · 30 fps · H.264/AAC · no watermark')}:{' '}
        {duration.toFixed(1)}s
      </p>
      <details>
        <summary>{t('delivery.crop', 'Preview crop and safe margins')}</summary>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clips
            .filter((clip) => clip.type === 'video' || clip.type === 'image')
            .map((clip) => {
              const crop = (settings.crops ?? {})[clip.id] ?? {
                mode: 'fit' as const,
                x: 0.5,
                y: 0.5,
              };
              const activeRun = useProductionRunStore.getState().activeRun;
              const selected = resolveOtioSelection(
                clip.resourceId,
                clip.selectedTakeId,
                activeRun?.projectId === projectId ? activeRun : null,
                clip.type,
              );
              const asset = assets.find((item) => item.id === selected.mediaKey);
              const shot = useAppStore
                .getState()
                .sbShots.find((item) => item.id === clip.resourceId);
              const source =
                asset?.url ??
                selected.take?.localMediaUrl ??
                shot?.generatedVideoUrl ??
                shot?.takes?.[shot.selectedTakeIndex];
              return (
                <div key={clip.id} className="space-y-2">
                  <p>{clip.label}</p>
                  <div
                    className="relative overflow-hidden bg-black"
                    style={{ aspectRatio: settings.aspectRatio.replace(':', '/') }}
                  >
                    {source &&
                      (clip.type === 'image' ? (
                        <img
                          src={source}
                          alt={clip.label}
                          className="h-full w-full"
                          style={{
                            objectFit: crop.mode === 'fit' ? 'contain' : 'cover',
                            objectPosition: `${crop.x * 100}% ${crop.y * 100}%`,
                          }}
                        />
                      ) : (
                        <video
                          src={source}
                          controls
                          preload="metadata"
                          className="h-full w-full"
                          style={{
                            objectFit: crop.mode === 'fit' ? 'contain' : 'cover',
                            objectPosition: `${crop.x * 100}% ${crop.y * 100}%`,
                          }}
                        />
                      ))}
                    <div
                      className="pointer-events-none absolute text-center text-sm font-semibold"
                      style={{
                        left: `${settings.safeMargin * 100}%`,
                        right: `${settings.safeMargin * 100}%`,
                        bottom: `${settings.safeMargin * 100}%`,
                        fontFamily: settings.style?.fontFamily ?? 'Noto Sans',
                        color: settings.style?.textColor ?? '#ffffff',
                        backgroundColor:
                          settings.captionStyle === 'pop'
                            ? (settings.style?.primaryColor ?? '#334155')
                            : 'transparent',
                        textShadow:
                          settings.captionStyle === 'classic'
                            ? '1px 1px 2px black, -1px -1px 2px black'
                            : undefined,
                      }}
                    >
                      {settings.captionStyle === 'karaoke' ? (
                        <>
                          <span style={{ color: settings.style?.primaryColor ?? '#facc15' }}>
                            {
                              (captions[0]?.text ?? t('delivery.newCaption', 'Your caption')).split(
                                ' ',
                              )[0]
                            }
                          </span>{' '}
                          {(captions[0]?.text ?? t('delivery.newCaption', 'Your caption'))
                            .split(' ')
                            .slice(1)
                            .join(' ')}
                        </>
                      ) : (
                        (captions[0]?.text ?? t('delivery.newCaption', 'Your caption'))
                      )}
                    </div>
                    {settings.style?.logoAssetId &&
                      assets.find((asset) => asset.id === settings.style?.logoAssetId)?.url && (
                        <img
                          src={
                            assets.find((asset) => asset.id === settings.style?.logoAssetId)!.url
                          }
                          alt=""
                          className="pointer-events-none absolute w-12"
                          style={{
                            top: `${settings.safeMargin * 100}%`,
                            right: `${settings.safeMargin * 100}%`,
                          }}
                        />
                      )}
                    <div
                      aria-hidden
                      className="pointer-events-none absolute border border-dashed border-amber-300"
                      style={{ inset: `${settings.safeMargin * 100}%` }}
                    />
                  </div>
                  <label>
                    {t('delivery.cropMode', 'Crop mode')}{' '}
                    <select
                      aria-label={t('delivery.cropMode', 'Crop mode')}
                      className={inputClass}
                      value={crop.mode}
                      onChange={(event) =>
                        change({
                          crops: {
                            ...(settings.crops ?? {}),
                            [clip.id]: { ...crop, mode: event.target.value as 'fit' | 'fill' },
                          },
                        })
                      }
                    >
                      <option value="fit">{t('delivery.fit', 'Fit entire image')}</option>
                      <option value="fill">{t('delivery.fill', 'Crop to fill')}</option>
                    </select>
                  </label>
                  {crop.mode === 'fill' &&
                    ['x', 'y'].map((axis) => (
                      <label key={axis}>
                        {axis.toUpperCase()}{' '}
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={crop[axis as 'x' | 'y']}
                          onChange={(event) =>
                            change({
                              crops: {
                                ...(settings.crops ?? {}),
                                [clip.id]: { ...crop, [axis]: Number(event.target.value) },
                              },
                            })
                          }
                        />
                      </label>
                    ))}
                </div>
              );
            })}
        </div>
      </details>
      <details>
        <summary>{t('delivery.audioMix', 'Audio levels and fades')}</summary>
        {clips
          .filter((clip) => clip.type === 'audio')
          .map((clip) => {
            const fades = settings.audioFades?.[clip.id] ?? { inSeconds: 0, outSeconds: 0 };
            return (
              <div key={clip.id} className="my-3 flex flex-wrap gap-3">
                <p>{clip.label}</p>
                <label>
                  {t('delivery.volume', 'Volume')}{' '}
                  <input
                    className={`${inputClass} w-24`}
                    type="number"
                    min="0"
                    max="2"
                    step="0.1"
                    value={clip.volume ?? 1}
                    onChange={(event) =>
                      useAppStore
                        .getState()
                        .updateTimelineClip(clip.id, { volume: Number(event.target.value) })
                    }
                  />
                </label>
                {(['inSeconds', 'outSeconds'] as const).map((field) => (
                  <label key={field}>
                    {field === 'inSeconds'
                      ? t('delivery.fadeIn', 'Fade in (seconds)')
                      : t('delivery.fadeOut', 'Fade out (seconds)')}{' '}
                    <input
                      className={`${inputClass} w-24`}
                      type="number"
                      min="0"
                      max={clip.duration / 2}
                      step="0.1"
                      value={fades[field]}
                      onChange={(event) =>
                        change({
                          audioFades: {
                            ...settings.audioFades,
                            [clip.id]: { ...fades, [field]: Number(event.target.value) },
                          },
                        })
                      }
                    />
                  </label>
                ))}
              </div>
            );
          })}
      </details>
      <details open>
        <summary>{t('delivery.captions', 'Captions')}</summary>
        <div className="my-3 flex flex-wrap gap-3">
          <label>
            {t('delivery.captionStyle', 'Style')}{' '}
            <select
              aria-label={t('delivery.captionStyle', 'Style')}
              className={inputClass}
              value={settings.captionStyle}
              onChange={(event) =>
                change({ captionStyle: event.target.value as CreatorDeliveryV1['captionStyle'] })
              }
            >
              {['classic', 'pop', 'karaoke'].map((style) => (
                <option key={style} value={style}>
                  {t(
                    `delivery.styles.${style}`,
                    style === 'classic' ? 'Classic' : style === 'pop' ? 'Pop' : 'Karaoke',
                  )}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('delivery.captionMode', 'Output')}{' '}
            <select
              aria-label={t('delivery.captionMode', 'Output')}
              className={inputClass}
              value={settings.captionsMode}
              onChange={(event) =>
                change({ captionsMode: event.target.value as CreatorDeliveryV1['captionsMode'] })
              }
            >
              <option value="sidecar">{t('delivery.sidecar', 'SRT sidecar')}</option>
              <option value="burn-in">{t('delivery.burnIn', 'Burn into video')}</option>
            </select>
          </label>
        </div>
        <section className="my-4 space-y-3 rounded-lg border border-slate-700 p-3">
          <div>
            <h3 className="font-semibold">
              {t('delivery.asrTitle', 'Local speech transcription')}
            </h3>
            <p className="text-sm text-slate-300">
              {t(
                'delivery.asrPrivacy',
                'Whisper runs on this device. After the model is installed, transcription works offline and sends no audio to a provider.',
              )}
            </p>
          </div>
          {asrModelError && <p role="alert">{asrModelError}</p>}
          {!window.electron?.getCreatorAsrModelInfo && (
            <p role="status" className="text-sm text-slate-300">
              {t(
                'delivery.asrDesktopOnly',
                'Use the desktop app to install the local speech model and transcribe clips.',
              )}
            </p>
          )}
          {asrModelInfo && !asrModelInfo.status.installed && !asrInstalling && (
            <div className="space-y-2">
              <p role={asrModelInfo.status.state === 'corrupt' ? 'alert' : 'status'}>
                {asrModelInfo.status.state === 'corrupt'
                  ? t(
                      'delivery.asrModelCorrupt',
                      'The installed speech model failed its integrity check. Reinstall the verified model.',
                    )
                  : t(
                      'delivery.asrModelMissing',
                      'The local Whisper Base q8 model is not installed.',
                    )}{' '}
                {formatBytes(asrModelInfo.manifest.totalBytes)}
              </p>
              {!asrInstallConfirm ? (
                <button
                  type="button"
                  className={buttonClass}
                  onClick={() => setAsrInstallConfirm(true)}
                >
                  {t('delivery.asrPrepareInstall', 'Review model download')}
                </button>
              ) : (
                <div
                  className="space-y-2 rounded border border-slate-600 p-3"
                  role="group"
                  aria-label={t('delivery.asrConfirmGroup', 'Confirm local speech model download')}
                >
                  <p>
                    {t(
                      'delivery.asrConfirmDownload',
                      'Download the pinned Whisper Base q8 model ({{size}}) from Hugging Face? It is stored locally and used only for offline transcription.',
                      { size: formatBytes(asrModelInfo.manifest.totalBytes) },
                    )}
                  </p>
                  <a href={asrModelInfo.manifest.source} target="_blank" rel="noreferrer">
                    {t('delivery.asrModelSource', 'Model source and revision')}
                  </a>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={buttonClass}
                      onClick={() => {
                        setAsrInstalling(true);
                        setAsrInstallConfirm(false);
                        setAsrInstallProgress({
                          loadedBytes: 0,
                          totalBytes: asrModelInfo.manifest.totalBytes,
                        });
                        void creatorAsrService
                          .installModel(asrModelInfo.manifest, (progress) => {
                            setAsrInstallProgress({
                              loadedBytes: progress.loadedBytes,
                              totalBytes: progress.totalBytes,
                            });
                            setAsrInstallPhase(progress.status);
                          })
                          .then(async () => {
                            await refreshAsrModelInfo();
                            setAsrModelError('');
                          })
                          .catch((reason: unknown) =>
                            setAsrModelError(
                              reason instanceof Error ? reason.message : String(reason),
                            ),
                          )
                          .finally(() => setAsrInstalling(false));
                      }}
                    >
                      {t('delivery.asrConfirmInstall', 'Download and install')}
                    </button>
                    <button
                      type="button"
                      className={buttonClass}
                      onClick={() => setAsrInstallConfirm(false)}
                    >
                      {t('delivery.discard', 'Cancel')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          {asrInstalling && (
            <div className="space-y-2">
              <p role="status">
                {asrInstallPhase === 'verifying'
                  ? t('delivery.asrVerifying', 'Verifying downloaded model files…')
                  : t('delivery.asrDownloading', 'Downloading local model…')}{' '}
                {formatBytes(asrInstallProgress.loadedBytes)} /{' '}
                {formatBytes(asrInstallProgress.totalBytes)}
              </p>
              <progress
                className="w-full"
                max={asrInstallProgress.totalBytes || 1}
                value={asrInstallProgress.loadedBytes}
                aria-label={t('delivery.asrDownloadProgress', 'Model download progress')}
              />
              <button
                type="button"
                className={buttonClass}
                onClick={() => void creatorAsrService.cancelInstall()}
              >
                {t('delivery.asrCancelDownload', 'Cancel download')}
              </button>
            </div>
          )}
          {asrModelInfo?.status.installed && (
            <div className="flex flex-wrap items-center gap-2">
              <p role="status">
                {t('delivery.asrModelReady', 'Whisper Base q8 is installed for offline use.')} ·{' '}
                {formatBytes(asrModelInfo.status.totalBytes)}
              </p>
              {!asrRemoveConfirm ? (
                <button
                  type="button"
                  className={buttonClass}
                  disabled={asrBusy}
                  onClick={() => setAsrRemoveConfirm(true)}
                >
                  {t('delivery.asrRemoveModel', 'Remove model')}
                </button>
              ) : (
                <span className="flex gap-2">
                  <button
                    type="button"
                    className={buttonClass}
                    disabled={asrBusy}
                    onClick={() => {
                      void creatorAsrService
                        .removeModel()
                        .then(async () => {
                          setAsrRemoveConfirm(false);
                          setAsrProposal(null);
                          await refreshAsrModelInfo();
                        })
                        .catch((reason: unknown) =>
                          setAsrModelError(
                            reason instanceof Error ? reason.message : String(reason),
                          ),
                        );
                    }}
                  >
                    {t('delivery.asrConfirmRemove', 'Confirm removal')}
                  </button>
                  <button
                    type="button"
                    className={buttonClass}
                    onClick={() => setAsrRemoveConfirm(false)}
                  >
                    {t('delivery.discard', 'Cancel')}
                  </button>
                </span>
              )}
            </div>
          )}
          {asrModelInfo?.status.installed && (
            <div className="flex flex-wrap gap-3">
              <label>
                {t('delivery.asrClipOccurrence', 'Clip occurrence')}{' '}
                <select
                  className={inputClass}
                  aria-label={t('delivery.asrClipOccurrence', 'Clip occurrence')}
                  value={asrClipId}
                  disabled={asrBusy}
                  onChange={(event) => {
                    setAsrClipId(event.target.value);
                    setAsrProposal(null);
                    setAsrStatus('');
                    setAsrModelError('');
                  }}
                >
                  <option value="">—</option>
                  {asrSourceClips.map((clip) => {
                    const asset = getAssetForTimelineClip(clip);
                    return (
                      <option key={clip.id} value={clip.id}>
                        {asset?.name ?? clip.label} ·{' '}
                        {clip.type === 'video'
                          ? t('delivery.asrVideoAudio', 'video audio')
                          : t('delivery.asrAudio', 'audio')}{' '}
                        {clip.startTime.toFixed(1)}s
                      </option>
                    );
                  })}
                </select>
              </label>
              <label>
                {t('delivery.asrLanguage', 'Speech language')}{' '}
                <select
                  className={inputClass}
                  aria-label={t('delivery.asrLanguage', 'Speech language')}
                  value={asrLanguage}
                  disabled={asrBusy}
                  onChange={(event) => {
                    setAsrLanguage(event.target.value as CreatorAsrLanguage);
                    setAsrProposal(null);
                  }}
                >
                  {CREATOR_ASR_LANGUAGES.map((language) => (
                    <option key={language} value={language}>
                      {t(
                        `delivery.asrLanguageOptions.${language}`,
                        creatorAsrLanguageLabels[language],
                      )}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className={buttonClass}
                disabled={asrBusy || !selectedAsrClip || !window.electron?.extractTimelineAudio}
                onClick={() => void createAsrProposal()}
              >
                {asrBusy
                  ? t('delivery.asrWorking', 'Working…')
                  : t('delivery.asrTranscribe', 'Transcribe selected clip locally')}
              </button>
            </div>
          )}
          {asrModelInfo?.status.installed && asrSourceClips.length === 0 && (
            <p role="status">
              {t(
                'delivery.asrNoClips',
                'Add a local audio or video clip to the timeline to transcribe it.',
              )}
            </p>
          )}
          {asrStatus && <p role="status">{asrStatus}</p>}
          {asrProposal && (
            <div className="space-y-3 rounded-lg border border-slate-600 p-3">
              <p className="font-semibold">
                {t('delivery.asrReview', 'Review and edit the transcript before accepting it.')}
              </p>
              <p className="text-sm text-slate-300">
                {asrProposal.proposal.modelId} · {asrProposal.proposal.modelRevision} ·{' '}
                {t(
                  `delivery.asrLanguageOptions.${asrProposal.proposal.request.language}`,
                  creatorAsrLanguageLabels[asrProposal.proposal.request.language],
                )}
              </p>
              <details>
                <summary>{t('delivery.asrTranscript', 'Full transcript')}</summary>
                <p className="whitespace-pre-wrap">{asrProposal.proposal.transcript}</p>
              </details>
              <div className="max-h-72 space-y-2 overflow-y-auto">
                {asrProposal.captions.map((caption, index) => (
                  <div key={caption.id} className="grid grid-cols-[1fr_auto_auto] gap-2">
                    <input
                      type="text"
                      aria-label={t('delivery.asrCaptionText', 'Caption {{number}} text', {
                        number: index + 1,
                      })}
                      className={inputClass}
                      value={caption.text}
                      onChange={(event) => {
                        const next = [...asrProposal.captions];
                        next[index] = { ...caption, text: event.target.value };
                        setAsrProposal({ ...asrProposal, captions: next });
                      }}
                    />
                    <input
                      type="number"
                      aria-label={t('delivery.asrCaptionStart', 'Caption {{number}} start', {
                        number: index + 1,
                      })}
                      className={`${inputClass} w-24`}
                      min={selectedAsrClip?.startTime ?? 0}
                      max={duration}
                      step="0.01"
                      value={caption.startTime}
                      onChange={(event) => {
                        const next = [...asrProposal.captions];
                        next[index] = { ...caption, startTime: Number(event.target.value) };
                        setAsrProposal({ ...asrProposal, captions: next });
                      }}
                    />
                    <input
                      type="number"
                      aria-label={t('delivery.asrCaptionEnd', 'Caption {{number}} end', {
                        number: index + 1,
                      })}
                      className={`${inputClass} w-24`}
                      min={selectedAsrClip?.startTime ?? 0}
                      max={duration}
                      step="0.01"
                      value={caption.endTime}
                      onChange={(event) => {
                        const next = [...asrProposal.captions];
                        next[index] = { ...caption, endTime: Number(event.target.value) };
                        setAsrProposal({ ...asrProposal, captions: next });
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={buttonClass}
                  disabled={asrBusy || asrProposal.captions.some((caption) => !caption.text.trim())}
                  onClick={() => void acceptAsrProposal()}
                >
                  {t('delivery.asrAccept', 'Accept captions')}
                </button>
                <button
                  type="button"
                  className={buttonClass}
                  disabled={asrBusy}
                  onClick={() => setAsrProposal(null)}
                >
                  {t('delivery.discard', 'Discard')}
                </button>
              </div>
            </div>
          )}
        </section>
        {captionClips.map((clip) => (
          <div key={clip.id} className="my-2 flex flex-wrap gap-2">
            <label>
              {t('delivery.captionText', 'Text')}
              <textarea
                aria-label={t('delivery.captionText', 'Text')}
                className={inputClass}
                value={clip.caption!.text}
                onChange={(event) =>
                  useAppStore.getState().updateTimelineClip(clip.id, {
                    caption: { ...clip.caption!, text: event.target.value },
                    label: event.target.value,
                  })
                }
              />
            </label>
            <label>
              {t('delivery.startTime', 'Start (seconds)')}
              <input
                className={`${inputClass} w-24`}
                type="number"
                min="0"
                step="0.1"
                value={clip.startTime}
                onChange={(event) =>
                  useAppStore
                    .getState()
                    .updateTimelineClip(clip.id, { startTime: Number(event.target.value) })
                }
              />
            </label>
            <label>
              {t('delivery.endTime', 'End (seconds)')}
              <input
                className={`${inputClass} w-24`}
                type="number"
                min="0"
                step="0.1"
                value={clip.startTime + clip.duration}
                onChange={(event) =>
                  useAppStore.getState().updateTimelineClip(clip.id, {
                    duration: Number(event.target.value) - clip.startTime,
                  })
                }
              />
            </label>
            <label>
              {t('v16.linkCaption', 'Linked source clip')}
              <select
                className={inputClass}
                aria-label={t('v16.linkCaption', 'Linked source clip')}
                value={clip.sourceClipId ?? ''}
                onChange={(event) =>
                  useAppStore
                    .getState()
                    .updateTimelineClip(clip.id, { sourceClipId: event.target.value || undefined })
                }
              >
                <option value="">{t('v16.independent', 'Independent caption')}</option>
                {clips
                  .filter((item) => item.type !== 'text')
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
              </select>
            </label>
            <button
              className={buttonClass}
              disabled={clip.duration <= 2 / 30}
              onClick={() => useAppStore.getState().splitTimelineClip(clip.id, clip.duration / 2)}
            >
              {t('v16.splitCaption', 'Split caption')}
            </button>
            <button
              className={buttonClass}
              disabled={
                !captionClips.some(
                  (next) =>
                    next.startTime >= clip.startTime + clip.duration &&
                    next.trackId === clip.trackId &&
                    next.sourceClipId === clip.sourceClipId,
                )
              }
              onClick={() => {
                const next = [...captionClips]
                  .sort((a, b) => a.startTime - b.startTime)
                  .find(
                    (item) =>
                      item.startTime >= clip.startTime + clip.duration &&
                      item.trackId === clip.trackId &&
                      item.sourceClipId === clip.sourceClipId,
                  );
                if (next) useAppStore.getState().mergeTimelineCaptions([clip.id, next.id]);
              }}
            >
              {t('v16.mergeCaption', 'Merge with next caption')}
            </button>
            <button
              className={buttonClass}
              onClick={() => useAppStore.getState().removeTimelineClip(clip.id)}
            >
              {t('delivery.remove', 'Remove')}
            </button>
          </div>
        ))}
        <div className="flex flex-wrap gap-3">
          <button
            className={buttonClass}
            disabled={duration <= 0}
            onClick={() =>
              addCaptions([
                {
                  id: crypto.randomUUID(),
                  text: t('delivery.newCaption', 'Your caption'),
                  startTime: 0,
                  endTime: Math.min(3, duration),
                  style: settings.captionStyle,
                },
              ])
            }
          >
            {t('delivery.addCaption', 'Add caption')}
          </button>
          <label>
            {t('v16.srtMode', 'SRT import mode')}
            <select
              className={inputClass}
              aria-label={t('v16.srtMode', 'SRT import mode')}
              value={importMode}
              onChange={(event) => setImportMode(event.target.value as 'append' | 'replace')}
            >
              <option value="append">{t('v16.append', 'Add captions')}</option>
              <option value="replace">{t('v16.replace', 'Replace captions')}</option>
            </select>
          </label>
          <label>
            {t('delivery.importSrt', 'Import SRT')}
            <input
              type="file"
              accept=".srt"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file)
                  void act(async (id) => {
                    const values = importCreatorSrt(await file.text(), duration);
                    if (idRef.current !== id) throw new Error('Project changed.');
                    addCaptions(values, importMode);
                  });
                event.target.value = '';
              }}
            />
          </label>
          <button
            className={buttonClass}
            disabled={!captions.length}
            onClick={() =>
              void act(async () => {
                validateCreatorCaptions(captions, duration);
                downloadProjectBlob(
                  new Blob([exportCreatorSrt(captions)], { type: 'application/x-subrip' }),
                  `${settings.title}.srt`,
                );
              })
            }
          >
            {t('delivery.exportSrt', 'Download SRT')}
          </button>
        </div>
        <div className="my-3 flex flex-wrap gap-3">
          <label>
            {t('v16.shiftSeconds', 'Shift captions (seconds)')}
            <input
              className={inputClass}
              type="number"
              step="0.1"
              value={shift}
              onChange={(event) => setShift(Number(event.target.value))}
            />
          </label>
          <button
            className={buttonClass}
            disabled={
              !captions.length ||
              !Number.isFinite(shift) ||
              shift === 0 ||
              captions.some(
                (caption) => caption.startTime + shift < 0 || caption.endTime + shift > duration,
              )
            }
            onClick={() =>
              useAppStore.getState().shiftTimelineCaptions(
                captionClips.map((clip) => clip.id),
                shift,
              )
            }
          >
            {t('v16.shiftApply', 'Shift all captions')}
          </button>
        </div>
        {getCreatorCaptionOverlaps(captions).length > 0 && (
          <p role="status">
            {t('v16.overlaps', 'Some captions overlap. Review their timing before delivery.')}
          </p>
        )}
        <div className="my-4 space-y-2">
          <label>
            {t('delivery.audio', 'Audio to transcribe')}{' '}
            <select
              aria-label={t('delivery.audio', 'Audio to transcribe')}
              className={inputClass}
              value={audioId}
              onChange={(event) => {
                setAudioId(event.target.value);
                setAudioDuration(0);
                setConsent(false);
                setProposal(null);
              }}
            >
              <option value="">—</option>
              {assets
                .filter(
                  (asset) =>
                    asset.type === 'audio' &&
                    clips.some((clip) => clip.type === 'audio' && clip.resourceId === asset.id),
                )
                .map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.name}
                  </option>
                ))}
            </select>
          </label>
          <p>
            {t(
              'delivery.consentText',
              'Gemini receives the complete selected audio file shown below; captions are mapped to its timeline trim. Its provider may charge for this request. The desktop approval dialog shows the maximum charge before sending.',
            )}
            {selectedAudio && ` ${selectedAudio.name} · ${audioDuration.toFixed(1)}s`}
            {selectedAudio && (
              <audio
                controls
                preload="metadata"
                src={selectedAudio.url}
                onLoadedMetadata={(event) =>
                  setAudioDuration(
                    Number.isFinite(event.currentTarget.duration)
                      ? event.currentTarget.duration
                      : 0,
                  )
                }
              />
            )}
          </p>
          <label>
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
            />{' '}
            {t('delivery.consent', 'I approve sending this audio for a caption proposal.')}
          </label>
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              className={buttonClass}
              disabled={busy || !selectedAudio || !selectedAudioClip || audioDuration <= 0}
              onClick={() =>
                void act(async (id) => {
                  const before = binding();
                  const audioClip = selectedAudioClip!;
                  const sourceCaptions = await creatorCaptionService.createTimeBlocks({
                    mediaId: selectedAudio!.storageKey || selectedAudio!.id,
                    clipOffset: audioClip.offset,
                    clipDuration: audioClip.duration,
                  });
                  const values = sourceCaptions.map((caption) => ({
                    ...caption,
                    startTime: audioClip.startTime + caption.startTime,
                    endTime: audioClip.startTime + caption.endTime,
                  }));
                  if (idRef.current === id && before === binding())
                    setProposal({
                      captions: values,
                      binding: before,
                      sourceClipId: audioClip.id,
                      kind: 'time-blocks',
                    });
                  else
                    throw new Error('Project or captions changed. Create the time blocks again.');
                })
              }
            >
              {t('delivery.createTimeBlocks', 'Create time blocks')}
            </button>
            <button
              type="button"
              className={buttonClass}
              disabled={
                busy ||
                !consent ||
                !selectedAudio ||
                !selectedAudioClip ||
                audioDuration <= 0 ||
                !window.electron?.approveProviderCost
              }
              onClick={() =>
                void act(async (id) => {
                  const before = binding();
                  const blob = await resolveProjectAssetBlob(selectedAudio!);
                  if (!blob) throw new Error('Local audio is missing.');
                  const sourceCaptions = await creatorCaptionService.propose(blob, audioDuration);
                  const audioClip = selectedAudioClip!;
                  const values = sourceCaptions
                    .filter(
                      (caption) =>
                        caption.endTime > audioClip.offset &&
                        caption.startTime < audioClip.offset + audioClip.duration,
                    )
                    .map((caption) => ({
                      ...caption,
                      startTime:
                        audioClip.startTime + Math.max(0, caption.startTime - audioClip.offset),
                      endTime:
                        audioClip.startTime +
                        Math.min(audioClip.duration, caption.endTime - audioClip.offset),
                    }));
                  validateCreatorCaptions(values, duration);
                  if (idRef.current === id && before === binding())
                    setProposal({
                      captions: values,
                      binding: before,
                      sourceClipId: audioClip.id,
                      kind: 'provider',
                    });
                  else throw new Error('Project or captions changed. Request a new proposal.');
                })
              }
            >
              {t('delivery.propose', 'Request Gemini proposal')}
            </button>
          </div>
        </div>
        {proposal && (
          <div className="space-y-3 rounded-lg bg-slate-800/40 p-3 border border-slate-700/60 my-3">
            <p className="font-semibold text-sm text-slate-200">
              {proposal.kind === 'time-blocks'
                ? t(
                    'delivery.timeBlocksNeedText',
                    'These are silence-based timing blocks, not recognized speech. Enter caption text before accepting.',
                  )
                : t('delivery.reviewProposal', 'Review caption proposal before accepting')}
            </p>
            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
              {proposal.captions.map((caption, idx) => (
                <div key={caption.id} className="flex items-center gap-2">
                  <span className="font-mono text-xs text-sky-400 shrink-0">
                    {caption.startTime.toFixed(2)}s–{caption.endTime.toFixed(2)}s:
                  </span>
                  <input
                    type="text"
                    value={caption.text}
                    onChange={(e) => {
                      const next = [...proposal.captions];
                      next[idx] = { ...next[idx], text: e.target.value };
                      setProposal({ ...proposal, captions: next });
                    }}
                    className={`${inputClass} text-xs flex-1 py-1`}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                className={buttonClass}
                disabled={proposal.captions.some((caption) => !caption.text.trim())}
                onClick={() => {
                  if (proposal.binding !== binding())
                    setError(
                      t(
                        'delivery.staleProposal',
                        'Project or captions changed. Request a new proposal.',
                      ),
                    );
                  else {
                    addCaptions(
                      proposal.captions,
                      'append',
                      proposal.sourceClipId ?? selectedAudioClip?.id,
                    );
                    setProposal(null);
                  }
                }}
              >
                {t('delivery.acceptProposal', 'Accept proposal')}
              </button>
              <button type="button" className={buttonClass} onClick={() => setProposal(null)}>
                {t('delivery.discard', 'Discard')}
              </button>
            </div>
          </div>
        )}
      </details>
      <label className="block">
        {t('delivery.publishTitle', 'Publication title')}
        <input
          className={`${inputClass} block w-full`}
          value={settings.title}
          onChange={(event) => change({ title: event.target.value })}
        />
      </label>
      <label className="block">
        {t('delivery.description', 'Description')}
        <textarea
          className={`${inputClass} block w-full`}
          value={settings.description}
          onChange={(event) => change({ description: event.target.value })}
        />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={buttonClass}
          disabled={
            busy ||
            !clips.some(
              (clip) => (clip.type === 'video' || clip.type === 'image') && clip.duration > 0,
            )
          }
          onClick={() => {
            const chaptersText = buildTimelineChapterTimestamps(clips);
            if (!chaptersText) return;
            change({
              description: mergeChapterTimestampsIntoDescription(
                settings.description,
                chaptersText,
              ),
            });
          }}
        >
          {t('delivery.insertClipChapters', 'Insert clip chapters (0 tokens)')}
        </button>
      </div>
      <p>
        {t(
          'delivery.publishAiConsent',
          'Only the publication title and description shown above are sent to Gemini. The desktop approval dialog shows the maximum charge before sending.',
        )}
      </p>
      <button
        className={buttonClass}
        disabled={
          busy ||
          !settings.title.trim() ||
          !settings.description.trim() ||
          !window.electron?.approveProviderCost
        }
        onClick={() =>
          void act(async (id) => {
            const before = await publicationBinding(id);
            const text = await creatorPublishingService.propose(
              { title: settings.title, description: settings.description },
              i18n?.resolvedLanguage ?? i18n?.language ?? 'en',
            );
            const after = await publicationBinding(idRef.current);
            if (idRef.current === id && before === after)
              setPublishProposal({ text, binding: before });
            else
              throw new Error(
                t(
                  'delivery.publishStale',
                  'Publication text or project changed. Request a new proposal.',
                ),
              );
          })
        }
      >
        {t('delivery.publishAi', 'Request publication text proposal')}
      </button>
      {publishProposal && (
        <div>
          <p>{t('delivery.publishProposal', 'Review publication text proposal')}</p>
          <p>{publishProposal.text.title}</p>
          <p className="whitespace-pre-wrap">{publishProposal.text.description}</p>
          <button
            className={buttonClass}
            disabled={busy}
            onClick={() =>
              void act(async (id) => {
                const current = await publicationBinding(id);
                if (current !== publishProposal.binding)
                  throw new Error(
                    t(
                      'delivery.publishStale',
                      'Publication text or project changed. Request a new proposal.',
                    ),
                  );
                change(publishProposal.text);
                setPublishProposal(null);
              })
            }
          >
            {t('delivery.acceptPublish', 'Accept publication text')}
          </button>
          <button className={buttonClass} onClick={() => setPublishProposal(null)}>
            {t('delivery.discard', 'Discard')}
          </button>
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        <button className={buttonClass} disabled={busy} onClick={() => void check()}>
          {t('v16.checkDelivery', 'Check delivery')}
        </button>
        <button
          className={buttonClass}
          disabled={busy || !!running || anyBatchRunning || !capabilities.available}
          onClick={() => void render('preview')}
        >
          {t('v16.reviewDelivery', 'Review delivery')}
        </button>
        <button
          className={buttonClass}
          disabled={busy}
          onClick={() =>
            void act(async (id) => {
              const requested = settingsRef.current!;
              await capture(id);
              const saved = await creatorDeliveryService.saveSettings(id, requested);
              if (idRef.current === id && settingsRef.current === requested) setSettings(saved);
            })
          }
        >
          {t('delivery.saveSettings', 'Save delivery settings')}
        </button>
        <button
          className={buttonClass}
          aria-label={t('delivery.render', 'Export video')}
          disabled={busy || !!running || anyBatchRunning || !capabilities.available}
          onClick={() => void render()}
        >
          {t('delivery.render', 'Export video')}
        </button>
        {(settings.batchFormats?.length ?? 1) > 1 && (
          <button
            className={buttonClass}
            disabled={busy || !!running || anyBatchRunning || !capabilities.available}
            onClick={() => void renderBatch()}
          >
            {t('delivery.renderBatch', 'Batch export')} ({settings.batchFormats?.length} formats)
          </button>
        )}
        {(running || batchProgress !== null) && (
          <button
            className={buttonClass}
            onClick={() => {
              if (batch?.status === 'running') {
                void useRenderBatchStore
                  .getState()
                  .cancel(batch.id)
                  .catch((reason: unknown) => setError(String(reason)));
              } else if (job) void useRenderJobsStore.getState().cancel(job.id);
            }}
          >
            {t('delivery.cancel', 'Cancel export')}
          </button>
        )}
        {job?.status === 'complete' && job.purpose !== 'preview' && (
          <>
            {[false, true].map((pack) => (
              <button
                key={String(pack)}
                className={buttonClass}
                disabled={busy}
                onClick={() =>
                  void act(async () => {
                    const result = await window.electron?.saveTimelineRender?.({
                      id: job.id,
                      package: pack,
                    });
                    if (result?.saved) setJob({ ...job, savedName: result.name });
                  })
                }
              >
                {pack
                  ? t('delivery.package', 'Save publication package')
                  : t('delivery.saveMp4', 'Save MP4')}
              </button>
            ))}
          </>
        )}
      </div>
      {diagnostics && (
        <div role="status">
          {diagnosticBinding !== timelineBinding() && (
            <p>{t('v16.changed', 'The edit changed. Check the delivery again.')}</p>
          )}
          {!diagnostics.length ? (
            <p>
              {t('v16.ready', 'Delivery checks passed. Review the rendered video before saving.')}
            </p>
          ) : (
            <ul>
              {diagnostics.map((item, index) => (
                <li key={`${item.clipId ?? 'project'}-${index}`}>
                  {item.message} {item.action}
                  {item.clipId && (
                    <button
                      className={buttonClass}
                      onClick={() => {
                        const clip = clips.find((candidate) => candidate.id === item.clipId);
                        if (clip) useAppStore.getState().setCurrentTime(clip.startTime);
                      }}
                    >
                      {t('delivery.locateClip', 'Locate affected clip')}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {previewUrl && job?.purpose === 'preview' && (
        <div>
          <p role="status">
            {previewBinding && previewBinding === timelineBinding()
              ? t('v16.reviewCurrent', 'This review matches the current edit.')
              : t(
                  'v16.reviewStale',
                  'The edit changed. Render a new review before final delivery.',
                )}
          </p>
          <video controls src={previewUrl} className="max-h-96 w-full bg-black" />
        </div>
      )}
      {!!projectJobs.length && (
        <label>
          {t('v16.exportJobs', 'Export jobs')}
          <select
            className={inputClass}
            value={job?.id ?? ''}
            onChange={(event) => {
              setSelectedJobId(event.target.value);
              setPreviewUrl('');
              setPreviewBinding('');
              setPreviewHash('');
            }}
          >
            {projectJobs.map((item) => (
              <option key={item.id} value={item.id}>
                {item.purpose === 'preview'
                  ? t('v16.reviewDelivery', 'Review delivery')
                  : t('delivery.render', 'Export video')}
                {item.aspectRatio ? ` (${item.aspectRatio})` : ''} —{' '}
                {t(`delivery.status.${item.status}`, item.status)} —{' '}
                {item.createdAt
                  ? new Date(item.createdAt).toLocaleString(i18n?.language)
                  : projectJobs.indexOf(item) + 1}
              </option>
            ))}
          </select>
        </label>
      )}
      {batch && ['interrupted', 'failed', 'cancelled'].includes(batch.status) && (
        <div role="status">
          <p>
            {t(
              'delivery.batchInterrupted',
              'The saved export batch stopped. Completed formats are retained.',
            )}
          </p>
          {batch.error && <p>{batch.error}</p>}
          <button
            className={buttonClass}
            disabled={anyBatchRunning || !!running}
            onClick={() =>
              void act(async () => {
                await useRenderBatchStore.getState().resume(batch.id);
              })
            }
          >
            {t('delivery.resumeBatch', 'Resume saved batch')}
          </button>
        </div>
      )}
      {batchProgress && (
        <div
          role="status"
          className="rounded-lg bg-sky-950/40 p-3 border border-sky-800 text-sky-200"
        >
          <p className="font-medium text-sm">
            {t('delivery.batchExporting', 'Batch exporting')}: {batchProgress.current} of{' '}
            {batchProgress.total} ({batchProgress.format})
          </p>
        </div>
      )}
      {job && ['failed', 'cancelled'].includes(job.status) && (
        <button
          className={buttonClass}
          disabled={busy || !!running}
          onClick={() =>
            void act(async (id) => {
              const retry = await useRenderJobsStore.getState().retry(job.id);
              if (idRef.current === id) setJob(retry);
            })
          }
        >
          {t('v16.retryFrozen', 'Retry saved render plan')}
        </button>
      )}
      {job && (
        <div role="status">
          <p>
            {t(`delivery.status.${job.status}`, job.status)}: {Math.round(job.progress * 100)}%{' '}
            {job.savedName}
          </p>
          <progress
            aria-label={t('delivery.progress', 'Export progress')}
            max="1"
            value={job.progress}
          />
          {job.error && (
            <div role="alert">
              {job.error}
              {failedClip && (
                <button
                  className={buttonClass}
                  onClick={() => useAppStore.getState().setCurrentTime(failedClip.startTime)}
                >
                  {t('delivery.locateClip', 'Locate affected clip')}
                </button>
              )}
            </div>
          )}
        </div>
      )}
      {error && (
        <div role="alert">
          {error}
          {errorClip && (
            <button
              className={`${buttonClass} ml-2`}
              onClick={() => {
                const clip = clips.find((item) => item.id === errorClip);
                if (clip) useAppStore.getState().setCurrentTime(clip.startTime);
              }}
            >
              {t('delivery.locateClip', 'Locate affected clip')}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
