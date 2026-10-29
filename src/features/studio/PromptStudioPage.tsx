import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import type {
  Asset,
  PromptArtifactV1,
  VideoPromptArtifactInput,
  VideoPromptVariant,
  MusicPromptVariant,
  MusicPromptArtifactInput,
  VideoPromptMode,
  PromptStudioDraftV1,
  StudioRevisionV1,
  StudioTemplateV1,
  PromptValidationAction,
  StudioFeedbackNavigationState,
} from '@core/types';
import {
  compileMusicPromptArtifact,
  compileVideoPromptArtifact,
  expandMusicDetails,
  expandVideoSceneDetails,
  getLyricSections,
  normalizeMusicPromptInput,
  normalizeVideoPromptInput,
  optimizeFullVideoPack,
  optimizeMusicPromptArtifact,
  optimizeVideoPromptArtifact,
  promptArtifactToProductionState,
  revalidatePromptArtifact,
} from '@core/services/promptStudioService';
import { StudioAiControlBar } from './components/StudioAiControlBar';
import {
  isLyricSectionLocked,
  LyricSectionError,
  resolveLyricSection,
  setLyricSectionLocked,
} from '@core/services/lyricSectionService';
import {
  editStudioVariant,
  preserveLockedLyricSections,
  rewriteStudioLyricSection,
  type StudioVariantEdits,
} from '@core/services/promptStudioEditingService';
import {
  applyBatchLocalMusicTransform,
  applyBatchLocalPromptTransform,
  applyLocalMusicTransform,
  applyLocalPromptTransform,
  hasVariantEditChanges,
  proposeVideoVariantEdit,
  proposeMusicVariantEdit,
  type MusicVariantEditField,
  type MusicVariantEditPatch,
  type MusicVariantEditProposal,
  type LocalMusicTransformId,
  type LocalPromptTransformId,
  type VideoVariantEditField,
  type VideoVariantEditPatch,
  type VideoVariantEditProposal,
} from '@core/services/videoVariantEditService';
import { promptStudioHandoffService } from '@core/services/promptStudioHandoffService';
import { sanitizeStudioTemplate } from '@core/services/studioTemplateService';
import { studioReferenceService } from '@core/services/studioReferenceService';
import { hasApiKeyAsync } from '@core/services/apiKeyService';
import {
  STUDIO_CAPABILITIES,
  studioGenerationBlocker,
  studioVideoRequestIssues,
} from '@core/config/studioCapabilities';
import { getModel } from '@core/models/catalog';
import { openAssetLibrary } from '@shared/utils/assetLibraryEvents';
import { ROUTES } from '@core/config/routes';
import { assertProtectedPromptTextPreserved } from '@core/services/promptTextSegments';
import { usePromptStudioDraftStore } from '@core/store/usePromptStudioDraftStore';
import { useProjectStore } from '@core/store/useProjectStore';
import { useAppStore } from '@core/store/useAppStore';
import { useSettingsStore } from '@core/store/useSettingsStore';
import { useProductionRunStore } from '@core/store/useProductionRunStore';
import { DEFAULT_SPATIAL_CAMERA_RIG } from '@core/services/spatialCameraService';
import { UniversalTargetSelector } from './components/UniversalTargetSelector';
import { ModelArenaModal } from './components/ModelArenaModal';
import { StudioComparison } from './components/StudioComparison';
import { StudioRevisionHistory } from './components/StudioRevisionHistory';
import { StudioTemplateLibrary } from './components/StudioTemplateLibrary';
import { VideoVariantCard } from './components/VideoVariantCard';
import { MusicVariantCard } from './components/MusicVariantCard';
import { ValidationRail } from './components/ValidationRail';
import { ExternalStudioResults } from './components/ExternalStudioResults';
import { VideoVariantEditPanel } from './components/VideoVariantEditPanel';
import { MusicVariantEditPanel } from './components/MusicVariantEditPanel';

const SpatialCameraDirector = lazy(() =>
  import('@features/create/components/SpatialCameraDirector').then((m) => ({
    default: m.SpatialCameraDirector,
  })),
);
const MODES: VideoPromptMode[] = [
  'text-to-video',
  'image-to-video',
  'first-last-frames',
  'ingredients',
  'extend',
];
const VIDEO_FIELDS = [
  'subject',
  'action',
  'environment',
  'camera',
  'lighting',
  'style',
  'audio',
  'dialogue',
  'negativePrompt',
] as const;
const MUSIC_FIELDS = ['genre', 'mood', 'voice', 'tempo', 'instruments'] as const;
const NOTES = [
  'key',
  'timeSignature',
  'energyCurve',
  'vocalRange',
  'voiceNotes',
  'customModelNotes',
  'personaNotes',
  'tasteGuidance',
  'mixNotes',
] as const;

function Field({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <label className="studio-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function focusDraftIdea(element: HTMLTextAreaElement | null) {
  const focused = document.activeElement;
  // A late hydrate must not steal focus after the creator has chosen another control.
  if (focused === document.body || focused === element || focused?.hasAttribute('data-studio-mode'))
    element?.focus();
}

function isStudioFeedbackNavigationState(value: unknown): value is StudioFeedbackNavigationState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<StudioFeedbackNavigationState>;
  const source = state.source;
  const targets = [
    'flow-veo',
    'veo-api',
    'kling',
    'runway-gen3',
    'sora',
    'luma-ray',
    'wan-video',
    'minimax-hailuo',
  ];
  return (
    state.kind === 'studio-feedback' &&
    !!source &&
    typeof source.projectId === 'string' &&
    (source.sourceKind === 'external-result' || source.sourceKind === 'production-take') &&
    typeof source.sourceId === 'string' &&
    (source.variantIndex === 0 || source.variantIndex === 1 || source.variantIndex === 2) &&
    targets.includes(source.target) &&
    typeof source.prompt === 'string' &&
    typeof source.negativePrompt === 'string' &&
    typeof source.settings === 'string' &&
    typeof source.notes === 'string'
  );
}

export function PromptStudioPage() {
  const { t } = useTranslation('studio');
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const projectId = useProjectStore((s) => s.currentProjectId) ?? 'default';
  const store = usePromptStudioDraftStore();
  const studioLoading = store.status === 'loading';
  const assets = useAppStore((s) => s.assets);
  const labs = useSettingsStore((s) => s.enableExperimentalFeatures);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLElement>(null);
  const focusResultRequested = useRef(false);
  const [splitLayout, setSplitLayout] = useState(true);
  const splitLayoutRef = useRef(true);
  const [activeView, setActiveView] = useState<'editor' | 'result'>('editor');
  const [libraryTab, setLibraryTab] = useState<'templates' | 'history' | 'revisions'>('templates');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showRig, setShowRig] = useState(false);
  const [history, setHistory] = useState<PromptArtifactV1[]>([]);
  const [changing, setChanging] = useState(false);
  const changeInFlight = useRef(false);
  const changeDraft = useRef<PromptStudioDraftV1 | null>(null);
  const [revisionRefresh, setRevisionRefresh] = useState(0);
  const [proposal, setProposal] = useState<{
    before: PromptStudioDraftV1;
    artifact: PromptArtifactV1;
    projectId: string;
    revision: number;
    token: number;
  } | null>(null);
  const [expansionProposal, setExpansionProposal] = useState<{
    mode: 'video' | 'music';
    before: VideoPromptArtifactInput | MusicPromptArtifactInput;
    after: VideoPromptArtifactInput | MusicPromptArtifactInput;
    projectId: string;
    revision: number;
  } | null>(null);
  const [allowedPreviousResult, setAllowedPreviousResult] = useState('');
  const [variantProposal, setVariantProposal] = useState<VideoVariantEditProposal | null>(null);
  const [musicVariantProposal, setMusicVariantProposal] = useState<MusicVariantEditProposal | null>(
    null,
  );
  const [feedbackSource, setFeedbackSource] = useState<
    StudioFeedbackNavigationState['source'] | null
  >(null);
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [feedbackFields, setFeedbackFields] = useState<'prompt' | 'both'>('prompt');
  const [feedbackAllowDialogueRewrite, setFeedbackAllowDialogueRewrite] = useState(false);
  const [section, setSection] = useState('[Chorus]');
  const [direction, setDirection] = useState('');
  const [isArenaOpen, setIsArenaOpen] = useState(false);
  const [aiModel, setAiModel] = useState<string>('gemini-3.8-flash');
  const [stylePreset, setStylePreset] = useState<string>('cinematic');
  const [promptLanguage, setPromptLanguage] = useState<'en' | 'sv'>('en');
  const [overwriteAll, setOverwriteAll] = useState<boolean>(false);
  const [sceneDetailsOpen, setSceneDetailsOpen] = useState<boolean>(false);
  const [musicDetailsOpen, setMusicDetailsOpen] = useState<boolean>(false);
  const [expanding, setExpanding] = useState<boolean>(false);
  const ideaRef = useRef<HTMLTextAreaElement>(null);
  const mounted = useRef(true);
  const operation = useRef(0);
  const activeAbort = useRef<AbortController | null>(null);
  const aiRequest = useRef(0);
  const historyRequest = useRef(0);

  useEffect(() => {
    let active = true;
    mounted.current = true;
    void usePromptStudioDraftStore
      .getState()
      .hydrate(projectId)
      .then((ok) => {
        if (!ok || !active) return;
        const requested = params.get('mode');
        const current = usePromptStudioDraftStore.getState();
        if ((requested === 'video' || requested === 'music') && current.draft?.mode !== requested)
          current.setMode(requested);
        focusDraftIdea(ideaRef.current);
      });
    const request = ++historyRequest.current;
    setHistory([]);
    void promptStudioHandoffService
      .listArtifacts(projectId)
      .then((items) => {
        if (active && request === historyRequest.current) setHistory(items);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : t('actionError'));
      });
    setProposal(null);
    setExpansionProposal(null);
    setAllowedPreviousResult('');
    setVariantProposal(null);
    setMusicVariantProposal(null);
    setBusy(false);
    setExpanding(false);
    aiRequest.current = 0;
    setIsArenaOpen(false);
    return () => {
      active = false;
      mounted.current = false;
      activeAbort.current?.abort();
      activeAbort.current = null;
      operation.current += 1;
      void usePromptStudioDraftStore.getState().flush(projectId);
    };
  }, [projectId, params, t]);

  useEffect(() => {
    if (!isStudioFeedbackNavigationState(location.state)) return;
    const { source } = location.state;
    activeAbort.current?.abort();
    activeAbort.current = null;
    operation.current += 1;
    aiRequest.current = operation.current;
    setBusy(false);
    setExpanding(false);
    setProposal(null);
    setExpansionProposal(null);
    setVariantProposal(null);
    setMusicVariantProposal(null);
    setFeedbackSource(structuredClone(source));
    setFeedbackNotes(source.notes);
    setFeedbackFields('prompt');
    setFeedbackAllowDialogueRewrite(false);
    setActiveView('editor');
    navigate(`${ROUTES.STUDIO}?mode=video`, { replace: true, state: null });
  }, [location.key, location.state, navigate]);

  useEffect(() => {
    focusDraftIdea(ideaRef.current);
  }, [store.draft?.mode]);
  useEffect(() => {
    const warnUnsaved = (event: BeforeUnloadEvent) => {
      const state = usePromptStudioDraftStore.getState();
      if (typeof window !== 'undefined' && (window as unknown as { electron?: unknown }).electron) {
        if (state.status === 'saving' || state.status === 'error') {
          void state.flush();
        }
        return;
      }
      if (state.status === 'saving' || state.status === 'error') {
        event.preventDefault();
        event.returnValue = '';
        void state.flush();
      }
    };
    window.addEventListener('beforeunload', warnUnsaved);
    return () => window.removeEventListener('beforeunload', warnUnsaved);
  }, []);

  useEffect(() => {
    if (
      proposal &&
      (proposal.projectId !== store.draft?.projectId || proposal.revision !== store.draft?.revision)
    )
      setProposal(null);
  }, [proposal, store.draft?.projectId, store.draft?.revision]);

  useEffect(() => {
    if (
      expansionProposal &&
      (expansionProposal.projectId !== store.draft?.projectId ||
        expansionProposal.revision !== store.draft?.revision ||
        expansionProposal.mode !== store.draft?.mode)
    )
      setExpansionProposal(null);
  }, [expansionProposal, store.draft?.projectId, store.draft?.revision, store.draft?.mode]);

  useEffect(() => {
    if (
      variantProposal &&
      (variantProposal.projectId !== store.draft?.projectId ||
        variantProposal.revision !== store.draft?.revision ||
        variantProposal.variantIndex !== store.draft?.selectedVariant)
    )
      setVariantProposal(null);
  }, [
    variantProposal,
    store.draft?.projectId,
    store.draft?.revision,
    store.draft?.selectedVariant,
  ]);

  useEffect(() => {
    if (
      musicVariantProposal &&
      (musicVariantProposal.projectId !== store.draft?.projectId ||
        musicVariantProposal.revision !== store.draft?.revision ||
        musicVariantProposal.variantIndex !== store.draft?.selectedVariant)
    )
      setMusicVariantProposal(null);
  }, [
    musicVariantProposal,
    store.draft?.projectId,
    store.draft?.revision,
    store.draft?.selectedVariant,
  ]);

  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const split = entry.contentRect.width >= 960;
      if (!split && splitLayoutRef.current !== split) {
        const focused = document.activeElement;
        // Keep the focused pane visible when the split workspace becomes tabbed.
        if (
          focused &&
          workspace.querySelector('.studio-columns > .studio-brief')?.contains(focused)
        )
          setActiveView('editor');
        else if (focused && resultRef.current?.contains(focused)) setActiveView('result');
      }
      splitLayoutRef.current = split;
      setSplitLayout(split);
    });
    observer.observe(workspace);
    return () => observer.disconnect();
  }, [projectId, store.draft?.projectId, studioLoading]);

  useEffect(() => {
    if (focusResultRequested.current && activeView === 'result' && !changing && !busy) {
      focusResultRequested.current = false;
      if (!splitLayout) resultRef.current?.focus();
    }
  }, [activeView, changing, busy, splitLayout, proposal]);

  const draft = store.draft;
  if (!draft || draft.projectId !== projectId || store.status === 'loading')
    return (
      <div className="studio-workspace" aria-busy="true">
        <p role="status">{store.error ?? t('loading')}</p>
      </div>
    );
  const { video, music, mode, artifact, selectedVariant, lockedSections } = draft;
  const currentArtifact = artifact?.kind === mode ? revalidatePromptArtifact(artifact) : null;
  const feedbackCompatible =
    Boolean(feedbackSource) &&
    feedbackSource?.projectId === projectId &&
    mode === 'video' &&
    video.target === feedbackSource?.target &&
    currentArtifact?.kind === 'video';
  const staleArtifact = currentArtifact
    ? mode === 'video'
      ? JSON.stringify(normalizeVideoPromptInput(video)) !==
        JSON.stringify(normalizeVideoPromptInput(currentArtifact.input as VideoPromptArtifactInput))
      : JSON.stringify({ ...normalizeMusicPromptInput(music), lyrics: undefined }) !==
        JSON.stringify({
          ...normalizeMusicPromptInput(currentArtifact.input as MusicPromptArtifactInput),
          lyrics: undefined,
        })
    : false;

  const currentInput =
    mode === 'video'
      ? normalizeVideoPromptInput(video)
      : { ...normalizeMusicPromptInput(music), lyrics: undefined };
  const builtInput = currentArtifact
    ? mode === 'video'
      ? normalizeVideoPromptInput(currentArtifact.input as VideoPromptArtifactInput)
      : {
          ...normalizeMusicPromptInput(currentArtifact.input as MusicPromptArtifactInput),
          lyrics: undefined,
        }
    : null;
  const changedFields = builtInput
    ? Object.keys(currentInput).filter(
        (key) =>
          JSON.stringify((currentInput as unknown as Record<string, unknown>)[key]) !==
          JSON.stringify((builtInput as unknown as Record<string, unknown>)[key]),
      )
    : [];
  const fieldLabel = (key: string) => {
    const aliases: Record<string, string> = {
      mode: 'recipe',
      durationSeconds: 'length',
      firstFrameAssetId: 'startFrame',
      lastFrameAssetId: 'endFrame',
      referenceAssetIds: 'references',
      extensionSourceTakeId: 'previousClip',
      extensionArtifact: 'previousClip',
      spatialCamera: 'camera',
      rightsChecklist: 'inputLabels.rights',
    };
    const label = aliases[key];
    return label
      ? t(label)
      : t(`inputLabels.${key}`, { defaultValue: t(key, { defaultValue: key }) });
  };
  const previousResultKey = staleArtifact
    ? JSON.stringify([projectId, mode, currentArtifact, currentInput])
    : '';
  const previousResultAllowed = staleArtifact && allowedPreviousResult === previousResultKey;
  const veoDurations = getModel('veo-3.1-fast')?.capabilities.supportedDurationsSeconds ?? [
    4, 6, 8,
  ];

  const revealResult = () => {
    focusResultRequested.current = !splitLayout;
    setActiveView('result');
  };

  const updateVideo = (changes: Partial<VideoPromptArtifactInput>) => {
    setAllowedPreviousResult('');
    store.applyDraft({
      video: { ...usePromptStudioDraftStore.getState().draft!.video, ...changes },
    });
    setError('');
    operation.current += 1;
    aiRequest.current = operation.current;
    activeAbort.current?.abort();
    activeAbort.current = null;
    setBusy(false);
    setExpanding(false);
    setProposal(null);
    setExpansionProposal(null);
    setVariantProposal(null);
    setMusicVariantProposal(null);
  };
  const updateMusic = (changes: Partial<MusicPromptArtifactInput>) => {
    setAllowedPreviousResult('');
    store.applyDraft({
      music: { ...usePromptStudioDraftStore.getState().draft!.music, ...changes },
    });
    setError('');
    operation.current += 1;
    aiRequest.current = operation.current;
    activeAbort.current?.abort();
    activeAbort.current = null;
    setBusy(false);
    setExpanding(false);
    setProposal(null);
    setExpansionProposal(null);
    setVariantProposal(null);
    setMusicVariantProposal(null);
  };
  const scopeArtifact = (value: PromptArtifactV1): PromptArtifactV1 => ({
    ...value,
    id: projectId + ':' + value.id,
    projectId,
  });
  const saveArtifact = async (value: PromptArtifactV1) => {
    if (
      !mounted.current ||
      usePromptStudioDraftStore.getState().draft?.projectId !== projectId ||
      (useProjectStore.getState().currentProjectId ?? 'default') !== projectId
    )
      throw new Error(t('revision.stale'));
    store.setArtifact(value);
    await promptStudioHandoffService.saveArtifact(value);
    if (!(await store.flush(projectId)))
      throw new Error(usePromptStudioDraftStore.getState().error ?? t('saveError'));
    const request = ++historyRequest.current;
    const savedHistory = await promptStudioHandoffService.listArtifacts(projectId);
    if (
      mounted.current &&
      usePromptStudioDraftStore.getState().draft?.projectId === projectId &&
      request === historyRequest.current
    )
      setHistory(savedHistory);
  };
  const run = async (action: () => Promise<void>) => {
    setError('');
    setMessage('');
    try {
      await action();
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return;
      setError(
        e instanceof LyricSectionError
          ? t(`lyricSectionErrors.${e.code}`, { defaultValue: e.message })
          : e instanceof Error
            ? e.message
            : t('actionError'),
      );
    }
  };
  const cancelAIRequest = () => {
    const controller = activeAbort.current;
    if (!controller) return;
    activeAbort.current = null;
    controller.abort();
    operation.current += 1;
    aiRequest.current = operation.current;
    setBusy(false);
    setExpanding(false);
    setProposal(null);
    setExpansionProposal(null);
    setVariantProposal(null);
    setMusicVariantProposal(null);
    setMessage(t('variantEdit.cancelled', { defaultValue: 'AI request cancelled.' }));
  };
  const invalidateFeedbackProposal = () => {
    const controller = activeAbort.current;
    activeAbort.current = null;
    controller?.abort();
    operation.current += 1;
    aiRequest.current = operation.current;
    setBusy(false);
    setExpanding(false);
    setProposal(null);
    setExpansionProposal(null);
    setVariantProposal(null);
    setMusicVariantProposal(null);
    if (controller)
      setMessage(t('variantEdit.cancelled', { defaultValue: 'AI request cancelled.' }));
  };
  const change = async (action: () => Promise<void>) => {
    if (changeInFlight.current) throw new Error(t('revision.wait'));
    changeInFlight.current = true;
    setChanging(true);
    changeDraft.current = usePromptStudioDraftStore.getState().draft;
    operation.current += 1;
    aiRequest.current = operation.current;
    activeAbort.current?.abort();
    activeAbort.current = null;
    setBusy(false);
    setExpanding(false);
    setProposal(null);
    setExpansionProposal(null);
    setVariantProposal(null);
    setMusicVariantProposal(null);
    try {
      await action();
    } finally {
      changeInFlight.current = false;
      if (mounted.current) setChanging(false);
    }
  };
  const checkpoint = async (reason: string) => {
    const baseline = changeDraft.current;
    if (
      !baseline ||
      baseline.projectId !== projectId ||
      (useProjectStore.getState().currentProjectId ?? 'default') !== projectId
    )
      throw new Error(t('revision.stale'));
    if (!(await usePromptStudioDraftStore.getState().checkpoint(reason)))
      throw new Error(usePromptStudioDraftStore.getState().error ?? t('saveError'));
    if (
      !mounted.current ||
      usePromptStudioDraftStore.getState().draft !== baseline ||
      (useProjectStore.getState().currentProjectId ?? 'default') !== projectId
    )
      throw new Error(t('revision.stale'));
    setRevisionRefresh((n) => n + 1);
  };
  const selectTarget = (
    target: VideoPromptArtifactInput['target'],
    compiledArtifact?: PromptArtifactV1,
  ) =>
    change(async () => {
      if (target === video.target && (currentArtifact || !compiledArtifact)) return;
      await checkpoint('target');
      const active = usePromptStudioDraftStore.getState().draft!;
      store.applyDraft({
        video: { ...active.video, target },
        artifact: compiledArtifact ?? null,
        artifacts: { ...active.artifacts, video: compiledArtifact ?? null },
      });
      if (compiledArtifact) {
        await saveArtifact(compiledArtifact);
        revealResult();
        setMessage(t('enhanced'));
      }
      if (!(await usePromptStudioDraftStore.getState().flush(projectId)))
        throw new Error(usePromptStudioDraftStore.getState().error ?? t('saveError'));
    });
  const applyTemplate = (template: StudioTemplateV1) =>
    change(async () => {
      await checkpoint('template');
      const latest = usePromptStudioDraftStore.getState();
      template = sanitizeStudioTemplate(template);
      latest.applyDraft(
        template.kind === 'video'
          ? {
              mode: 'video',
              video: structuredClone(template.input),
              artifact: null,
              artifacts: { ...latest.draft?.artifacts, video: null },
              selectedVariant: 0,
              selectedVariants: { ...latest.draft?.selectedVariants, video: 0 },
            }
          : {
              mode: 'music',
              music: structuredClone(template.input),
              lockedSections: [...template.lockedSections],
              artifact: null,
              artifacts: { ...latest.draft?.artifacts, music: null },
              selectedVariant: 0,
              selectedVariants: { ...latest.draft?.selectedVariants, music: 0 },
            },
      );
      if (!(await latest.flush()))
        throw new Error(usePromptStudioDraftStore.getState().error ?? t('saveError'));
      setMessage(t('revision.templateApplied'));
    });
  const restoreRevision = (revision: StudioRevisionV1) =>
    change(async () => {
      if (!(await usePromptStudioDraftStore.getState().restoreRevision(revision)))
        throw new Error(usePromptStudioDraftStore.getState().error ?? t('saveError'));
      setRevisionRefresh((n) => n + 1);
      setMessage(t('revision.restored'));
    });
  const build = () =>
    void run(() =>
      change(async () => {
        await checkpoint('rebuild');
        const next = scopeArtifact(
          mode === 'video' ? compileVideoPromptArtifact(video) : compileMusicPromptArtifact(music),
        );
        await saveArtifact(next);
        revealResult();
        setMessage(t('built'));
      }),
    );
  const aiReady = async () => {
    if (
      useSettingsStore.getState().promptGenerationProvider === 'gemini' &&
      !(await hasApiKeyAsync())
    ) {
      setError(t('providerNeeded'));
      return false;
    }
    return true;
  };

  const expandScene = () =>
    void run(async () => {
      if (!video.idea?.trim()) {
        setError(t('brief'));
        return;
      }
      const token = ++operation.current;
      aiRequest.current = token;
      const controller = new AbortController();
      activeAbort.current?.abort();
      activeAbort.current = controller;
      setBusy(true);
      setExpanding(true);
      setError('');
      try {
        if (!(await aiReady())) return;
        const expanded = await expandVideoSceneDetails(video, {
          model: aiModel,
          stylePreset,
          language: promptLanguage,
          overwriteAll,
          signal: controller.signal,
        });
        if (
          !mounted.current ||
          operation.current !== token ||
          usePromptStudioDraftStore.getState().draft?.projectId !== projectId ||
          (useProjectStore.getState().currentProjectId ?? 'default') !== projectId ||
          usePromptStudioDraftStore.getState().draft?.revision !== draft.revision
        )
          return;
        setExpansionProposal({
          mode: 'video',
          before: video,
          after: expanded,
          projectId,
          revision: draft.revision,
        });
      } catch (err) {
        if (!mounted.current || operation.current !== token) return;
        setError(err instanceof Error ? err.message : t('actionError'));
      } finally {
        if (mounted.current && operation.current === token) {
          setBusy(false);
          setExpanding(false);
          activeAbort.current = null;
        }
      }
    });

  const expandMusic = () =>
    void run(async () => {
      if (!music.topic?.trim()) {
        setError(t('topic'));
        return;
      }
      const token = ++operation.current;
      aiRequest.current = token;
      const controller = new AbortController();
      activeAbort.current?.abort();
      activeAbort.current = controller;
      setBusy(true);
      setExpanding(true);
      setError('');
      try {
        if (!(await aiReady())) return;
        const expanded = await expandMusicDetails(music, {
          model: aiModel,
          stylePreset,
          language: music.language,
          overwriteAll,
          signal: controller.signal,
        });
        if (
          !mounted.current ||
          operation.current !== token ||
          usePromptStudioDraftStore.getState().draft?.projectId !== projectId ||
          (useProjectStore.getState().currentProjectId ?? 'default') !== projectId ||
          usePromptStudioDraftStore.getState().draft?.revision !== draft.revision
        )
          return;
        setExpansionProposal({
          mode: 'music',
          before: music,
          after: expanded,
          projectId,
          revision: draft.revision,
        });
      } catch (err) {
        if (!mounted.current || operation.current !== token) return;
        setError(err instanceof Error ? err.message : t('actionError'));
      } finally {
        if (mounted.current && operation.current === token) {
          setBusy(false);
          setExpanding(false);
          activeAbort.current = null;
        }
      }
    });
  const proposeVariantEdit = (
    direction: string,
    fields: VideoVariantEditField[],
    allowDialogueRewrite = false,
    feedback?: StudioFeedbackNavigationState['source'],
  ) =>
    void run(async () => {
      const baseline = usePromptStudioDraftStore.getState().draft;
      if (!baseline || baseline.mode !== 'video' || baseline.artifact?.kind !== 'video') return;
      const token = ++operation.current;
      aiRequest.current = token;
      const controller = new AbortController();
      activeAbort.current?.abort();
      activeAbort.current = controller;
      const isCurrent = () =>
        mounted.current &&
        operation.current === token &&
        usePromptStudioDraftStore.getState().draft === baseline &&
        (useProjectStore.getState().currentProjectId ?? 'default') === projectId;
      setProposal(null);
      setVariantProposal(null);
      setMusicVariantProposal(null);
      setBusy(true);
      try {
        if (!(await aiReady()) || !isCurrent()) return;
        const requestDirection = feedback
          ? [
              'Use the frozen reviewed result as context and apply its reviewer notes to the current selected variant.',
              `Reviewer notes: ${feedbackNotes.trim()}`,
              `Frozen source prompt: ${feedback.prompt}`,
              `Frozen source negative prompt: ${feedback.negativePrompt}`,
              `Frozen source settings: ${feedback.settings}`,
            ].join('\n')
          : direction;
        const editArtifact = feedback
          ? {
              ...baseline.artifact,
              input: normalizeVideoPromptInput(baseline.video),
            }
          : baseline.artifact;
        const result = await proposeVideoVariantEdit({
          artifact: editArtifact,
          variantIndex: baseline.selectedVariant,
          direction: requestDirection,
          fields,
          allowDialogueRewrite,
          signal: controller.signal,
        });
        if (!isCurrent()) return;
        setVariantProposal({
          ...result,
          projectId,
          revision: baseline.revision,
          variantIndex: baseline.selectedVariant,
          token,
        });
        revealResult();
        setMessage(t('revision.proposalReady'));
      } catch (cause) {
        if (isCurrent()) throw cause;
      } finally {
        if (activeAbort.current === controller) activeAbort.current = null;
        if (mounted.current && aiRequest.current === token) setBusy(false);
      }
    });
  const proposeMusicEdit = (direction: string, fields: MusicVariantEditField[]) =>
    void run(async () => {
      const baseline = usePromptStudioDraftStore.getState().draft;
      if (!baseline || baseline.mode !== 'music' || baseline.artifact?.kind !== 'music') return;
      const token = ++operation.current;
      aiRequest.current = token;
      const controller = new AbortController();
      activeAbort.current?.abort();
      activeAbort.current = controller;
      const isCurrent = () =>
        mounted.current &&
        operation.current === token &&
        usePromptStudioDraftStore.getState().draft === baseline &&
        (useProjectStore.getState().currentProjectId ?? 'default') === projectId;
      setProposal(null);
      setVariantProposal(null);
      setMusicVariantProposal(null);
      setBusy(true);
      try {
        if (!(await aiReady()) || !isCurrent()) return;
        const editArtifact = {
          ...baseline.artifact,
          input: normalizeMusicPromptInput(baseline.music),
        };
        const result = await proposeMusicVariantEdit({
          artifact: editArtifact,
          variantIndex: baseline.selectedVariant,
          fields,
          direction,
          lockedSections: baseline.lockedSections,
          signal: controller.signal,
        });
        if (!isCurrent()) return;
        setMusicVariantProposal({
          ...result,
          projectId,
          revision: baseline.revision,
          variantIndex: baseline.selectedVariant,
          token,
        });
        revealResult();
        setMessage(t('revision.proposalReady'));
      } catch (cause) {
        if (isCurrent()) throw cause;
      } finally {
        if (activeAbort.current === controller) activeAbort.current = null;
        if (mounted.current && aiRequest.current === token) setBusy(false);
      }
    });
  const handleLocalTransform = (transformId: LocalPromptTransformId, applyToAll = false) =>
    void run(async () => {
      const token = ++operation.current;
      aiRequest.current = token;
      setProposal(null);
      setVariantProposal(null);
      const baseline = usePromptStudioDraftStore.getState().draft;
      if (
        !baseline ||
        baseline.artifact?.kind !== 'video' ||
        baseline.mode !== 'video' ||
        baseline.projectId !== projectId
      )
        return;
      if (applyToAll) {
        const batchResult = applyBatchLocalPromptTransform(baseline.artifact, transformId);
        if (!batchResult.changed) {
          setMessage(
            t('variantEdit.alreadyOptimized', {
              defaultValue: 'Selected variant already matches this rule.',
            }),
          );
          return;
        }
        setProposal({
          before: structuredClone(baseline),
          artifact: scopeArtifact(batchResult.artifact),
          projectId,
          revision: baseline.revision,
          token,
        });
        revealResult();
        setMessage(t('revision.proposalReady'));
        return;
      }
      const result = applyLocalPromptTransform(
        baseline.artifact,
        baseline.selectedVariant,
        transformId,
      );
      if (!hasVariantEditChanges(result)) {
        setMessage(
          t('variantEdit.alreadyOptimized', {
            defaultValue: 'Selected variant already matches this rule.',
          }),
        );
        return;
      }
      setVariantProposal({
        ...result,
        projectId,
        revision: baseline.revision,
        variantIndex: baseline.selectedVariant,
        token,
      });
      revealResult();
      setMessage(t('revision.proposalReady'));
    });
  const handleLocalMusicTransform = (transformId: LocalMusicTransformId, applyToAll = false) =>
    void run(async () => {
      const token = ++operation.current;
      aiRequest.current = token;
      setProposal(null);
      setVariantProposal(null);
      const baseline = usePromptStudioDraftStore.getState().draft;
      if (
        !baseline ||
        baseline.artifact?.kind !== 'music' ||
        baseline.mode !== 'music' ||
        baseline.projectId !== projectId
      )
        return;
      const result = applyToAll
        ? applyBatchLocalMusicTransform(baseline.artifact, transformId, baseline.lockedSections)
        : applyLocalMusicTransform(
            baseline.artifact,
            baseline.selectedVariant,
            transformId,
            baseline.lockedSections,
          );
      if (!result.changed) {
        setMessage(
          t('variantEdit.alreadyOptimized', {
            defaultValue: 'Selected variant already matches this rule.',
          }),
        );
        return;
      }
      setProposal({
        before: structuredClone(baseline),
        artifact: scopeArtifact(result.artifact),
        projectId,
        revision: baseline.revision,
        token,
      });
      revealResult();
      setMessage(t('revision.proposalReady'));
    });
  const acceptVariantEdit = (fields: VideoVariantEditField[]) =>
    void run(async () => {
      const selectedProposal = variantProposal;
      const baseline = usePromptStudioDraftStore.getState().draft;
      if (
        !selectedProposal ||
        !baseline ||
        baseline.artifact?.kind !== 'video' ||
        baseline.mode !== 'video' ||
        baseline.projectId !== projectId ||
        selectedProposal.projectId !== projectId ||
        selectedProposal.revision !== baseline.revision ||
        selectedProposal.variantIndex !== baseline.selectedVariant ||
        selectedProposal.token !== operation.current ||
        !fields.length ||
        fields.some((field) => selectedProposal.patch[field] === undefined)
      )
        throw new Error(t('revision.stale'));
      await change(async () => {
        await checkpoint('ai-variant');
        const patch: VideoVariantEditPatch = {};
        for (const field of fields) patch[field] = selectedProposal.patch[field];
        const accepted = editStudioVariant(
          baseline.artifact!,
          selectedProposal.variantIndex,
          patch,
        );
        accepted.provenance = selectedProposal.provenance;
        const isCurrent = () =>
          mounted.current &&
          usePromptStudioDraftStore.getState().draft === baseline &&
          (useProjectStore.getState().currentProjectId ?? 'default') === projectId;
        if (
          !(await usePromptStudioDraftStore
            .getState()
            .acceptArtifact(accepted, baseline, isCurrent))
        )
          throw new Error(usePromptStudioDraftStore.getState().error ?? t('revision.stale'));
        setMessage(t('enhanced'));
      });
    });
  const acceptMusicVariantEdit = (fields: MusicVariantEditField[]) =>
    void run(async () => {
      const selectedProposal = musicVariantProposal;
      const baseline = usePromptStudioDraftStore.getState().draft;
      if (
        !selectedProposal ||
        !baseline ||
        baseline.artifact?.kind !== 'music' ||
        baseline.mode !== 'music' ||
        baseline.projectId !== projectId ||
        selectedProposal.projectId !== projectId ||
        selectedProposal.revision !== baseline.revision ||
        selectedProposal.variantIndex !== baseline.selectedVariant ||
        selectedProposal.token !== operation.current ||
        !fields.length ||
        fields.some((field) => selectedProposal.patch[field] === undefined)
      )
        throw new Error(t('revision.stale'));
      await change(async () => {
        await checkpoint('ai-variant');
        const patch: MusicVariantEditPatch = {};
        for (const field of fields) patch[field] = selectedProposal.patch[field];
        const accepted = editStudioVariant(
          baseline.artifact!,
          selectedProposal.variantIndex,
          patch,
        );
        accepted.provenance = selectedProposal.provenance;
        const nextMusic = patch.lyrics !== undefined ? { ...music, lyrics: patch.lyrics } : music;
        const isCurrent = () =>
          mounted.current &&
          usePromptStudioDraftStore.getState().draft === baseline &&
          (useProjectStore.getState().currentProjectId ?? 'default') === projectId;
        if (
          !(await usePromptStudioDraftStore
            .getState()
            .acceptArtifact(
              accepted,
              baseline,
              isCurrent,
              patch.lyrics !== undefined ? { music: nextMusic } : undefined,
            ))
        )
          throw new Error(usePromptStudioDraftStore.getState().error ?? t('revision.stale'));
        setMusicVariantProposal(null);
        setMessage(t('enhanced'));
      });
    });
  const optimize = () =>
    void run(async () => {
      const token = ++operation.current;
      aiRequest.current = token;
      const controller = new AbortController();
      activeAbort.current?.abort();
      activeAbort.current = controller;
      setProposal(null);
      setVariantProposal(null);
      setMusicVariantProposal(null);
      const revision = usePromptStudioDraftStore.getState().draft?.revision;
      setBusy(true);
      try {
        if (!(await aiReady())) return;
        const ready = usePromptStudioDraftStore.getState().draft;
        if (
          !mounted.current ||
          token !== operation.current ||
          ready?.projectId !== projectId ||
          ready.revision !== revision
        )
          return;
        let next =
          mode === 'video'
            ? await optimizeVideoPromptArtifact(
                video,
                {
                  optimizeVideo: async (inp, sig) =>
                    optimizeFullVideoPack(inp, {
                      model: aiModel,
                      stylePreset,
                      language: promptLanguage,
                      signal: sig,
                    }),
                  optimizeMusic: async () => ({}),
                },
                controller.signal,
              )
            : await optimizeMusicPromptArtifact(music, undefined, controller.signal);
        const latest = usePromptStudioDraftStore.getState().draft;
        if (
          !mounted.current ||
          operation.current !== token ||
          latest?.projectId !== projectId ||
          latest.revision !== revision
        )
          return;
        if (next.kind === 'video' && currentArtifact?.kind === 'video') {
          const beforeVariants = [
            currentArtifact.primary,
            ...currentArtifact.alternatives,
          ] as VideoPromptVariant[];
          const afterVariants = [next.primary, ...next.alternatives] as VideoPromptVariant[];
          beforeVariants.forEach((variant, index) =>
            assertProtectedPromptTextPreserved(
              variant.prompt,
              afterVariants[index].prompt,
              video.dialogue ?? '',
            ),
          );
        }
        if (next.kind === 'music' && lockedSections.length) {
          const source =
            currentArtifact?.kind === 'music'
              ? (
                  [currentArtifact.primary, ...currentArtifact.alternatives][
                    selectedVariant
                  ] as MusicPromptVariant
                ).lyrics
              : (music.lyrics ?? '');
          for (const index of [0, 1, 2] as const) {
            const variant = [next.primary, ...next.alternatives][index] as MusicPromptVariant;
            next = editStudioVariant(next, index, {
              lyrics: preserveLockedLyricSections(source, variant.lyrics, lockedSections),
            });
          }
        }
        setProposal({
          before: {
            ...structuredClone(latest),
            artifact:
              latest.artifact ??
              scopeArtifact(
                mode === 'video'
                  ? compileVideoPromptArtifact(video)
                  : compileMusicPromptArtifact(music),
              ),
          },
          artifact: scopeArtifact(next),
          projectId,
          revision: revision!,
          token,
        });
        revealResult();
        setMessage(t('revision.proposalReady'));
      } finally {
        if (activeAbort.current === controller) activeAbort.current = null;
        if (mounted.current && aiRequest.current === token) setBusy(false);
      }
    });
  const acceptProposal = () =>
    void run(async () => {
      const latest = usePromptStudioDraftStore.getState().draft;
      if (
        !proposal ||
        !latest ||
        proposal.projectId !== projectId ||
        latest.projectId !== projectId ||
        proposal.revision !== latest.revision ||
        proposal.token !== operation.current
      )
        throw new Error(t('revision.stale'));
      await change(async () => {
        await checkpoint('ai');
        const accepted = proposal.artifact;
        const nextMusic =
          accepted.kind === 'music'
            ? {
                ...music,
                lyrics: (
                  [accepted.primary, ...accepted.alternatives][
                    selectedVariant
                  ] as MusicPromptVariant
                ).lyrics,
              }
            : music;
        usePromptStudioDraftStore.getState().applyDraft({
          music: nextMusic,
          artifact: accepted,
          artifacts: { ...latest.artifacts, [mode]: accepted },
        });
        await saveArtifact(accepted);
        setMessage(t('enhanced'));
      });
    });
  const focusValidation = (action: PromptValidationAction) => {
    setActiveView(
      action.field === 'variant' ||
        action.field === 'styleOfMusic' ||
        action.variantIndex !== undefined
        ? 'result'
        : 'editor',
    );
    if (action.variantIndex !== undefined) store.setSelectedVariant(action.variantIndex);
    requestAnimationFrame(() => {
      const workspace = document.querySelector<HTMLElement>('.studio-workspace');
      const resultField = ['lyrics', 'styleOfMusic', 'negativePrompt'].includes(action.field)
        ? action.field
        : 'prompt';
      const field =
        action.field === 'variant' ||
        action.field === 'styleOfMusic' ||
        action.variantIndex !== undefined
          ? workspace?.querySelector<HTMLElement>(
              `[data-studio-variant] textarea[data-studio-field="${resultField}"]`,
            )
          : workspace?.querySelector<HTMLElement>(
              `[data-studio-field="${action.field === 'extensionArtifact' || action.field === 'extensionSourceTakeId' ? 'mode' : action.field}"]`,
            );
      if (!field) return;
      let parent = field.parentElement;
      while (parent) {
        if (parent.tagName === 'DETAILS') (parent as HTMLDetailsElement).open = true;
        parent = parent.parentElement;
      }
      field.focus();
      field.scrollIntoView?.({ block: 'nearest', behavior: 'instant' });
    });
  };
  const copy = (value: string, label: string) =>
    void run(async () => {
      if (staleArtifact && !previousResultAllowed)
        throw new Error(
          t('previousResultRequired', {
            defaultValue: 'Choose Use previous result before copying an outdated result.',
          }),
        );
      if (!value.trim()) throw new Error(t('emptyCopy'));
      await navigator.clipboard.writeText(value);
      setMessage(label);
    });
  const edit = (index: 0 | 1 | 2, changes: StudioVariantEdits) => {
    if (!currentArtifact || changeInFlight.current) return;
    activeAbort.current?.abort();
    activeAbort.current = null;
    const next = editStudioVariant(currentArtifact, index, changes);
    store.applyDraft({
      ...(currentArtifact.kind === 'music' && changes.lyrics !== undefined
        ? { music: { ...music, lyrics: changes.lyrics } }
        : {}),
      artifact: next,
      artifacts: { ...draft.artifacts, [mode]: next },
    });
    operation.current += 1;
    aiRequest.current = operation.current;
    setBusy(false);
    setExpanding(false);
    setProposal(null);
    setExpansionProposal(null);
    setVariantProposal(null);
    setMusicVariantProposal(null);
  };
  const handoff = () =>
    void run(async () => {
      if (!currentArtifact || currentArtifact.kind !== 'video') return;
      if (staleArtifact) throw new Error(t('revision.outdated'));
      const selected = [currentArtifact.primary, ...currentArtifact.alternatives][
        selectedVariant
      ] as VideoPromptVariant;
      const input = {
        ...(currentArtifact.input as VideoPromptArtifactInput),
        idea: selected.prompt,
        negativePrompt: selected.negativePrompt,
      };
      const blocker = studioGenerationBlocker(input);
      if (blocker) throw new Error(blocker);
      if (
        currentArtifact.validation.some(
          (check) =>
            check.status === 'blocked' &&
            (check.action?.variantIndex === undefined ||
              check.action.variantIndex === selectedVariant),
        )
      )
        throw new Error(t('blocked'));
      if (!(await store.flush())) throw new Error(t('saveError'));
      const saved = await promptStudioHandoffService.createDraft(currentArtifact, 'production', {
        projectId,
        variantIndex: selectedVariant,
      });
      const app = useAppStore.getState();
      const referenceIds = [
        input.firstFrameAssetId,
        input.lastFrameAssetId,
        ...(input.referenceAssetIds ?? []),
      ].filter(Boolean);
      await useProductionRunStore.getState().createLocalPlan({
        projectId,
        title: selected.title,
        promptState: promptArtifactToProductionState(input),
        studioInput: input,
        assets: app.assets.filter((asset) => referenceIds.includes(asset.id)),
        productionBible: app.productionBible,
        sourceArtifactId: currentArtifact.id,
        sourceHandoffId: saved.id,
        sourceVariantIndex: selectedVariant,
      });
      navigate(ROUTES.CREATE, {
        state: { promptStudioHandoff: saved, promptStudioArtifact: currentArtifact },
      });
    });
  const openSuno = () =>
    void run(async () => {
      if (!currentArtifact || currentArtifact.kind !== 'music') return;
      if (staleArtifact && !previousResultAllowed)
        throw new Error(
          t('previousResultRequired', {
            defaultValue: 'Choose Use previous result before copying an outdated result.',
          }),
        );
      const selected = [currentArtifact.primary, ...currentArtifact.alternatives][
        selectedVariant
      ] as MusicPromptVariant;
      await navigator.clipboard.writeText(selected.copyAll);
      window.open('https://suno.com/create', '_blank', 'noopener,noreferrer');
      setMessage(t('copied'));
    });
  const upload = (file: File | undefined) =>
    void run(async () => {
      if (!file) return;
      const asset = await studioReferenceService.importImage(file, projectId);
      const current = usePromptStudioDraftStore.getState().draft;
      if (
        !mounted.current ||
        current?.projectId !== projectId ||
        current.mode !== 'video' ||
        current.video.mode !== video.mode
      )
        return;
      useAppStore.getState().addAsset(asset);
      updateVideo(
        current.video.mode === 'ingredients'
          ? {
              referenceAssetIds: [...(current.video.referenceAssetIds ?? []), asset.id],
              referenceRoles: [current.video.referenceRoles, asset.name + '=reference']
                .filter(Boolean)
                .join(', '),
            }
          : { firstFrameAssetId: asset.id, startFrame: asset.name },
      );
    });
  const imageAssets = assets.filter((asset) => asset.type === 'image');
  const imageSelector = (
    label: string,
    value: string | undefined,
    onChange: (asset: Asset | undefined) => void,
  ) => (
    <Field label={label}>
      <select
        data-studio-field={label === t('startFrame') ? 'firstFrameAssetId' : 'lastFrameAssetId'}
        aria-label={label}
        value={value ?? ''}
        onChange={(e) => onChange(imageAssets.find((a) => a.id === e.target.value))}
      >
        <option value="">{t('chooseImage')}</option>
        {imageAssets.map((a) => (
          <option value={a.id} key={a.id}>
            {a.name}
          </option>
        ))}
      </select>
      {value && imageAssets.find((a) => a.id === value)?.url ? (
        <img
          className="studio-reference"
          src={imageAssets.find((a) => a.id === value)?.url}
          alt={label}
        />
      ) : null}
    </Field>
  );
  const lyricVariant =
    currentArtifact?.kind === 'music'
      ? ([currentArtifact.primary, ...currentArtifact.alternatives][
          selectedVariant
        ] as MusicPromptVariant)
      : null;
  const lyricSections = lyricVariant ? getLyricSections(lyricVariant.lyrics) : [];
  const selectedSection = lyricSections.includes(section)
    ? section
    : (lyricSections[0] ?? '[Chorus]');
  const selectedLyricSection = lyricVariant
    ? resolveLyricSection(lyricVariant.lyrics, selectedSection)
    : undefined;
  const selectedSectionLocked = selectedLyricSection
    ? isLyricSectionLocked(selectedLyricSection, lockedSections)
    : false;
  const motionMode = mode === 'video' && video.mode === 'image-to-video';
  const primaryInputLabel =
    mode === 'music'
      ? t('topic')
      : motionMode
        ? t('motionDescription', 'Describe the motion')
        : t('idea');
  const generationBlocker = mode === 'video' ? studioGenerationBlocker(video) : null;
  const videoIssues =
    mode === 'video' && video.target === 'veo-api' ? studioVideoRequestIssues(video) : [];
  const textField = (key: string, value: string, onChange: (value: string) => void) => (
    <Field key={key} label={t(key)}>
      <input
        data-studio-field={key}
        aria-label={t(key)}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );

  return (
    <div
      ref={workspaceRef}
      className="studio-workspace"
      data-layout={splitLayout ? 'split' : 'tabs'}
    >
      <header className="studio-heading">
        <div>
          <h1 tabIndex={-1}>{t('title')}</h1>
          <p>{t('description')}</p>
        </div>
      </header>
      <div className="studio-toolbar" role="group" aria-label={t('chooseMode')}>
        <button
          data-studio-mode="video"
          disabled={changing}
          aria-pressed={mode === 'video'}
          onClick={() => {
            cancelAIRequest();
            setActiveView('editor');
            store.setMode('video');
            navigate(ROUTES.STUDIO + '?mode=video', { replace: true });
          }}
        >
          {t('videoMode')}
        </button>
        <button
          data-studio-mode="music"
          disabled={changing}
          aria-pressed={mode === 'music'}
          onClick={() => {
            cancelAIRequest();
            setActiveView('editor');
            store.setMode('music');
            navigate(ROUTES.STUDIO + '?mode=music', { replace: true });
          }}
        >
          {t('musicMode')}
        </button>
        <span>{t('noProviderCall')}</span>
      </div>
      {error || store.error || message ? (
        <div role={error || store.error ? 'alert' : 'status'} className="studio-notice">
          {error || store.error || message}
          {error === t('providerNeeded') ? (
            <button onClick={() => navigate(ROUTES.SETTINGS)}>{t('configureProvider')}</button>
          ) : null}
          {store.status === 'error' ? (
            <button onClick={() => void store.flush()}>{t('retrySave')}</button>
          ) : null}
        </div>
      ) : null}
      {feedbackSource ? (
        <section className="studio-proposal" aria-label={t('resultFeedback.title')}>
          <h2>{t('resultFeedback.title')}</h2>
          <p className="studio-hint">
            {t('resultFeedback.description', {
              source: t(
                feedbackSource.sourceKind === 'production-take'
                  ? 'resultFeedback.productionTake'
                  : 'resultFeedback.importedResult',
              ),
              defaultValue:
                'Use your review notes to improve the current selected variant. The frozen source is context only.',
            })}
          </p>
          <label className="studio-field">
            <span>{t('resultFeedback.notes')}</span>
            <textarea
              aria-label={t('resultFeedback.notes')}
              rows={3}
              value={feedbackNotes}
              onChange={(event) => {
                invalidateFeedbackProposal();
                setFeedbackNotes(event.target.value);
              }}
            />
          </label>
          <label className="studio-field">
            <span>{t('resultFeedback.fields')}</span>
            <select
              aria-label={t('resultFeedback.fields')}
              value={feedbackFields}
              onChange={(event) => {
                invalidateFeedbackProposal();
                setFeedbackFields(event.target.value as 'prompt' | 'both');
              }}
            >
              <option value="prompt">{t('variantEdit.prompt')}</option>
              <option value="both">{t('resultFeedback.promptAndNegative')}</option>
            </select>
          </label>
          <label className="studio-check">
            <input
              type="checkbox"
              checked={feedbackAllowDialogueRewrite}
              onChange={(event) => {
                invalidateFeedbackProposal();
                setFeedbackAllowDialogueRewrite(event.target.checked);
              }}
            />
            {t('variantEdit.allowDialogueRewrite')}
          </label>
          <details className="studio-details">
            <summary>{t('resultFeedback.source')}</summary>
            <p>{feedbackSource.prompt}</p>
            {feedbackSource.negativePrompt ? <p>{feedbackSource.negativePrompt}</p> : null}
            <pre className="whitespace-pre-wrap">{feedbackSource.settings}</pre>
          </details>
          {!feedbackCompatible ? (
            <p className="studio-notice">{t('resultFeedback.compatibility')}</p>
          ) : (
            <p className="studio-hint">{t('resultFeedback.receiver')}</p>
          )}
          <div className="studio-actions">
            <button
              type="button"
              className="studio-primary"
              disabled={!feedbackCompatible || !feedbackNotes.trim() || busy || changing}
              onClick={() =>
                feedbackSource &&
                proposeVariantEdit(
                  'Improve the prompt using the result review notes.',
                  feedbackFields === 'both' ? ['prompt', 'negativePrompt'] : ['prompt'],
                  feedbackAllowDialogueRewrite,
                  feedbackSource,
                )
              }
            >
              {t('resultFeedback.propose')}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                cancelAIRequest();
                setFeedbackSource(null);
                setFeedbackNotes('');
              }}
            >
              {t('revision.reject')}
            </button>
            {busy ? (
              <button type="button" onClick={cancelAIRequest}>
                {t('variantEdit.cancel')}
              </button>
            ) : null}
          </div>
        </section>
      ) : null}
      {!splitLayout ? (
        <div className="studio-view-tabs" role="group" aria-label={t('workspaceView')}>
          <button
            type="button"
            aria-pressed={activeView === 'editor'}
            onClick={() => setActiveView('editor')}
          >
            {t('editView')}
          </button>
          <button
            type="button"
            aria-pressed={activeView === 'result'}
            onClick={() => setActiveView('result')}
          >
            {t('resultView')}
          </button>
        </div>
      ) : null}
      <div className="studio-columns">
        <section
          className="studio-brief"
          aria-label={t('brief')}
          hidden={!splitLayout && activeView !== 'editor'}
        >
          <fieldset disabled={changing} className="studio-brief">
            <Field label={primaryInputLabel}>
              <textarea
                ref={ideaRef}
                data-studio-field={mode === 'video' ? 'idea' : 'topic'}
                aria-label={primaryInputLabel}
                placeholder={
                  motionMode
                    ? t('motionPlaceholder', 'Describe what moves in the image and how it moves.')
                    : mode === 'video'
                      ? t('ideaPlaceholder')
                      : t('topicPlaceholder')
                }
                rows={4}
                value={mode === 'video' ? video.idea : music.topic}
                onChange={(e) =>
                  mode === 'video'
                    ? updateVideo({ idea: e.target.value })
                    : updateMusic({ topic: e.target.value })
                }
              />
            </Field>
            {motionMode ? (
              <p className="studio-hint">
                {t(
                  'motionHint',
                  'Describe movement, not appearance. If Action is filled in, it takes priority.',
                )}
              </p>
            ) : null}
            {mode === 'video' ? (
              <>
                <div className="studio-fields">
                  <div className="studio-field">
                    <div className="flex items-center justify-between w-full">
                      <span>{t('target')}</span>
                      <button
                        type="button"
                        onClick={() => setIsArenaOpen(true)}
                        className="text-[11px] font-medium text-cyan-400 hover:text-cyan-300 underline underline-offset-2 flex items-center gap-1 cursor-pointer"
                      >
                        {t('arenaOpen')}
                      </button>
                    </div>
                    <div>
                      <UniversalTargetSelector
                        value={video.target}
                        onChange={(target) => void run(() => selectTarget(target))}
                      />
                    </div>
                  </div>
                  <Field label={t('aspectRatio')}>
                    <select
                      data-studio-field="aspectRatio"
                      aria-label={t('aspectRatio')}
                      value={video.aspectRatio}
                      onChange={(e) =>
                        updateVideo({
                          aspectRatio: e.target.value as VideoPromptArtifactInput['aspectRatio'],
                        })
                      }
                    >
                      <option value="16:9">16:9</option>
                      <option value="9:16">9:16</option>
                    </select>
                  </Field>
                </div>
                <div className="studio-fields">
                  <Field label={t('recipe')}>
                    <select
                      data-studio-field="mode"
                      aria-label={t('recipe')}
                      value={video.mode}
                      onChange={(e) =>
                        updateVideo({
                          mode: e.target.value as VideoPromptMode,
                          firstFrameAssetId: undefined,
                          lastFrameAssetId: undefined,
                          referenceAssetIds: [],
                          extensionSourceTakeId: undefined,
                          extensionArtifact: undefined,
                        })
                      }
                    >
                      {MODES.map((item) => (
                        <option value={item} key={item}>
                          {t('modes.' + item)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label={t('length')}>
                    <select
                      data-studio-field="durationSeconds"
                      aria-label={t('length')}
                      value={video.durationSeconds}
                      onChange={(e) =>
                        updateVideo({
                          durationSeconds: Number(
                            e.target.value,
                          ) as VideoPromptArtifactInput['durationSeconds'],
                        })
                      }
                    >
                      {[4, 6, 8, 10].map((n) => (
                        <option
                          value={n}
                          key={n}
                          disabled={video.target === 'veo-api' && !veoDurations.includes(n)}
                        >
                          {t('seconds', { count: n })}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                {video.target === 'veo-api' ? (
                  <p className="studio-hint">
                    {t('veoDurationHint', { defaultValue: 'Veo API supports 4, 6 or 8 seconds.' })}
                  </p>
                ) : null}
                {videoIssues.length ? (
                  <ul className="studio-notice">
                    {videoIssues.map((issue, index) => (
                      <li key={`${issue.code}-${index}`}>{issue.message}</li>
                    ))}
                  </ul>
                ) : null}
                <p className="studio-hint">
                  {STUDIO_CAPABILITIES[video.target].handoff === 'manual'
                    ? t('manualHandoff')
                    : t('approvedHandoff')}
                </p>
                {video.mode !== 'text-to-video' ? (
                  <div className="studio-fields">
                    <button type="button" onClick={openAssetLibrary}>
                      {t('common:assets.browseLibrary')}
                    </button>
                    <Field label={t('importImage')}>
                      <input
                        aria-label={t('importImage')}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(e) => upload(e.target.files?.[0])}
                      />
                    </Field>
                    {video.mode === 'image-to-video' || video.mode === 'first-last-frames'
                      ? imageSelector(t('startFrame'), video.firstFrameAssetId, (a) =>
                          updateVideo({ firstFrameAssetId: a?.id, startFrame: a?.name ?? '' }),
                        )
                      : null}
                    {video.mode === 'first-last-frames'
                      ? imageSelector(t('endFrame'), video.lastFrameAssetId, (a) =>
                          updateVideo({ lastFrameAssetId: a?.id, endFrame: a?.name ?? '' }),
                        )
                      : null}
                    {video.mode === 'ingredients' ? (
                      <Field label={t('references')}>
                        <select
                          multiple
                          data-studio-field="referenceAssetIds"
                          aria-label={t('references')}
                          value={video.referenceAssetIds ?? []}
                          onChange={(e) => {
                            const ids = Array.from(e.target.selectedOptions, (o) => o.value);
                            updateVideo({
                              referenceAssetIds: ids,
                              referenceRoles: imageAssets
                                .filter((a) => ids.includes(a.id))
                                .map((a) => a.name + '=reference')
                                .join(', '),
                            });
                          }}
                        >
                          {imageAssets.map((a) => (
                            <option value={a.id} key={a.id}>
                              {a.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                    ) : null}
                    {video.mode === 'extend'
                      ? textField('previousClip', video.previousClip ?? '', (value) =>
                          updateVideo({ previousClip: value }),
                        )
                      : null}
                  </div>
                ) : null}
                <details className="studio-details">
                  <summary>{t('aiSettings')}</summary>
                  <StudioAiControlBar
                    model={aiModel}
                    onModelChange={setAiModel}
                    stylePreset={stylePreset}
                    onStylePresetChange={setStylePreset}
                    language={promptLanguage}
                    onLanguageChange={setPromptLanguage}
                    overwriteAll={overwriteAll}
                    onOverwriteAllChange={setOverwriteAll}
                    disabled={busy || changing}
                  />
                </details>
                <div className="studio-actions">
                  <button className="studio-primary" disabled={changing} onClick={build}>
                    {t('build')}
                  </button>
                  <button type="button" disabled={busy || changing} onClick={expandScene}>
                    {expanding ? t('expandingScene') : t('expandScene')}
                  </button>
                  <button disabled={busy || changing} onClick={optimize}>
                    {busy && !expanding ? t('enhancing') : t('enhanceAll')}
                  </button>
                  {busy ? (
                    <button type="button" onClick={cancelAIRequest}>
                      {t('variantEdit.cancel')}
                    </button>
                  ) : null}
                </div>
                <p className="studio-hint">{t('localFirst')}</p>
                <details
                  className="studio-details"
                  open={sceneDetailsOpen}
                  onToggle={(e) => setSceneDetailsOpen(e.currentTarget.open)}
                >
                  <summary>{t('sceneDetails')}</summary>
                  <div className="studio-fields">
                    {VIDEO_FIELDS.map((key) =>
                      textField(key, video[key] ?? '', (value) => updateVideo({ [key]: value })),
                    )}
                  </div>
                </details>
                {labs ? (
                  <details className="studio-details">
                    <summary onClick={() => setShowRig(true)}>{t('spatialExperiment')}</summary>
                    {showRig ? (
                      <Suspense fallback={<p>{t('loading')}</p>}>
                        <SpatialCameraDirector
                          rig={video.spatialCamera ?? DEFAULT_SPATIAL_CAMERA_RIG}
                          onChange={(rig) => updateVideo({ spatialCamera: rig })}
                        />
                      </Suspense>
                    ) : null}
                    <p className="studio-hint">{t('spatialWarning')}</p>
                  </details>
                ) : null}
              </>
            ) : (
              <>
                <div className="studio-fields">
                  <Field label={t('lyricsLanguage')}>
                    <select
                      data-studio-field="language"
                      aria-label={t('lyricsLanguage')}
                      value={music.language}
                      onChange={(e) => updateMusic({ language: e.target.value })}
                    >
                      {[
                        'English',
                        'Swedish',
                        'Spanish',
                        'French',
                        'German',
                        'Italian',
                        'Portuguese',
                        'Japanese',
                        'Korean',
                        'Arabic',
                      ].map((name) => (
                        <option key={name}>{name}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label={t('structure')}>
                    <select
                      value={music.structure}
                      onChange={(e) =>
                        updateMusic({
                          structure: e.target.value as MusicPromptArtifactInput['structure'],
                        })
                      }
                    >
                      {['Auto', 'Standard', 'Pop', 'Rap', 'Ambient', 'Custom'].map((name) => (
                        <option key={name}>{name}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                <details className="studio-details">
                  <summary>{t('aiSettings')}</summary>
                  <StudioAiControlBar
                    model={aiModel}
                    onModelChange={setAiModel}
                    stylePreset={stylePreset}
                    onStylePresetChange={setStylePreset}
                    language={promptLanguage}
                    onLanguageChange={setPromptLanguage}
                    overwriteAll={overwriteAll}
                    onOverwriteAllChange={setOverwriteAll}
                    disabled={busy || changing}
                  />
                </details>
                <div className="studio-actions">
                  <button className="studio-primary" disabled={changing} onClick={build}>
                    {t('build')}
                  </button>
                  <button type="button" disabled={busy || changing} onClick={expandMusic}>
                    {expanding ? t('expandingMusic') : t('expandMusic')}
                  </button>
                  <button disabled={busy || changing} onClick={optimize}>
                    {busy && !expanding ? t('enhancing') : t('enhanceAll')}
                  </button>
                  {busy ? (
                    <button type="button" onClick={cancelAIRequest}>
                      {t('variantEdit.cancel')}
                    </button>
                  ) : null}
                </div>
                <p className="studio-hint">{t('localFirst')}</p>
                <details
                  className="studio-details"
                  open={musicDetailsOpen}
                  onToggle={(e) => setMusicDetailsOpen(e.currentTarget.open)}
                >
                  <summary>{t('musicDetails')}</summary>
                  <div className="studio-fields">
                    {MUSIC_FIELDS.map((key) =>
                      textField(key, music[key] ?? '', (value) => updateMusic({ [key]: value })),
                    )}
                  </div>
                  <label className="studio-check">
                    <input
                      type="checkbox"
                      checked={!!music.instrumental}
                      onChange={(e) => updateMusic({ instrumental: e.target.checked })}
                    />
                    {t('instrumental')}
                  </label>
                  <Field label={t('lyrics')}>
                    <textarea
                      rows={5}
                      data-studio-field="lyrics"
                      aria-label={t('lyrics')}
                      value={music.lyrics ?? ''}
                      onChange={(e) => updateMusic({ lyrics: e.target.value })}
                      placeholder={t('lyricsPlaceholder')}
                    />
                  </Field>
                  <p className="studio-hint">{t('localLyricsSuggestion')}</p>
                </details>
                <details className="studio-details">
                  <summary>{t('advancedNotes')}</summary>
                  <div className="studio-fields">
                    {NOTES.map((key) =>
                      textField(key, music[key] ?? '', (value) => updateMusic({ [key]: value })),
                    )}
                  </div>
                  <fieldset>
                    <legend>{t('inputLabels.rights')}</legend>
                    {(
                      [
                        'ownsOrLicensedLyrics',
                        'hasVoiceConsent',
                        'hasTrainingReferenceRights',
                        'avoidsArtistImitation',
                      ] as const
                    ).map((key) => (
                      <label key={key} className="studio-check">
                        <input
                          type="checkbox"
                          data-studio-field="rightsChecklist"
                          checked={music.rightsChecklist?.[key] ?? key === 'avoidsArtistImitation'}
                          onChange={(e) =>
                            updateMusic({
                              rightsChecklist: {
                                ownsOrLicensedLyrics: false,
                                hasVoiceConsent: false,
                                hasTrainingReferenceRights: false,
                                avoidsArtistImitation: true,
                                ...music.rightsChecklist,
                                [key]: e.target.checked,
                              },
                            })
                          }
                        />
                        {t('inputLabels.' + key)}
                      </label>
                    ))}
                  </fieldset>
                </details>
              </>
            )}
            {expansionProposal ? (
              <section
                className="studio-proposal"
                aria-label={t('expansionReview', { defaultValue: 'Review expanded details' })}
              >
                <h2>{t('expansionReview', { defaultValue: 'Review expanded details' })}</h2>
                {Object.keys(expansionProposal.after)
                  .filter(
                    (key) =>
                      JSON.stringify(
                        (expansionProposal.before as unknown as Record<string, unknown>)[key],
                      ) !==
                      JSON.stringify(
                        (expansionProposal.after as unknown as Record<string, unknown>)[key],
                      ),
                  )
                  .map((key) => (
                    <div key={key}>
                      <h3>
                        {t(`inputLabels.${key}`, { defaultValue: t(key, { defaultValue: key }) })}
                      </h3>
                      <p>
                        {t('expansionBefore', { defaultValue: 'Before' })}:{' '}
                        {String(
                          (expansionProposal.before as unknown as Record<string, unknown>)[key] ??
                            '',
                        )}
                      </p>
                      <p>
                        {t('expansionAfter', { defaultValue: 'Proposed' })}:{' '}
                        {String(
                          (expansionProposal.after as unknown as Record<string, unknown>)[key] ??
                            '',
                        )}
                      </p>
                    </div>
                  ))}
                <button
                  type="button"
                  disabled={changing}
                  onClick={() => {
                    const proposed = expansionProposal;
                    void run(() =>
                      change(async () => {
                        if (
                          usePromptStudioDraftStore.getState().draft?.revision !==
                            proposed.revision ||
                          usePromptStudioDraftStore.getState().draft?.projectId !==
                            proposed.projectId
                        )
                          throw new Error(t('revision.stale'));
                        await checkpoint('ai-expansion');
                        store.applyDraft(
                          proposed.mode === 'video'
                            ? { video: proposed.after as VideoPromptArtifactInput }
                            : { music: proposed.after as MusicPromptArtifactInput },
                        );
                        if (!(await store.flush(projectId))) throw new Error(t('saveError'));
                        if (proposed.mode === 'video') setSceneDetailsOpen(true);
                        else setMusicDetailsOpen(true);
                        setMessage(
                          t('expansionAccepted', { defaultValue: 'Expanded details applied.' }),
                        );
                      }),
                    );
                  }}
                >
                  {t('expansionAccept', { defaultValue: 'Accept expanded details' })}
                </button>
                <button
                  type="button"
                  disabled={changing}
                  onClick={() => setExpansionProposal(null)}
                >
                  {t('expansionReject', { defaultValue: 'Reject expanded details' })}
                </button>
              </section>
            ) : null}
            <details className="studio-details studio-library">
              <summary>{t('templatesHistory')}</summary>
              <div className="studio-library-tabs" role="group" aria-label={t('templatesHistory')}>
                {(['templates', 'history', 'revisions'] as const).map((tab) => (
                  <button
                    type="button"
                    key={tab}
                    aria-pressed={libraryTab === tab}
                    onClick={() => setLibraryTab(tab)}
                  >
                    {t('libraryTabs.' + tab)}
                  </button>
                ))}
              </div>
              <div className="studio-library-panel" hidden={libraryTab !== 'templates'}>
                <StudioTemplateLibrary draft={draft} onApply={applyTemplate} />
              </div>
              <div className="studio-library-panel" hidden={libraryTab !== 'history'}>
                <div className="studio-fields">
                  <Field label={t('history')}>
                    <select
                      value=""
                      onChange={(e) => {
                        const previous = history.find((item) => item.id === e.target.value);
                        if (!previous) return;
                        if (previous.projectId !== projectId) return;
                        void run(() =>
                          change(async () => {
                            await checkpoint('history');
                            store.applyDraft({
                              mode: previous.kind,
                              ...(previous.kind === 'video'
                                ? { video: previous.input as VideoPromptArtifactInput }
                                : { music: previous.input as MusicPromptArtifactInput }),
                              artifact: revalidatePromptArtifact(previous),
                              selectedVariant: 0,
                              selectedVariants: {
                                ...store.draft?.selectedVariants,
                                [previous.kind]: 0,
                              },
                              artifacts: {
                                ...store.draft?.artifacts,
                                [previous.kind]: revalidatePromptArtifact(previous),
                              },
                            });
                          }),
                        );
                      }}
                    >
                      <option value="">{t('chooseHistory')}</option>
                      {history.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.primary.title} · {item.target} ·{' '}
                          {new Date(item.createdAt).toLocaleDateString()} —{' '}
                          {(item.kind === 'video'
                            ? (item.input as VideoPromptArtifactInput).idea
                            : (item.input as MusicPromptArtifactInput).topic
                          ).slice(0, 72)}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              </div>
              <div className="studio-library-panel" hidden={libraryTab !== 'revisions'}>
                <StudioRevisionHistory
                  embedded
                  draft={draft}
                  refreshKey={revisionRefresh}
                  disabled={changing || busy}
                  onSave={() =>
                    change(async () => {
                      await checkpoint('manual');
                      setMessage(t('revision.saved'));
                    })
                  }
                  onRestore={restoreRevision}
                />
              </div>
            </details>
          </fieldset>
        </section>
        <section
          ref={resultRef}
          tabIndex={-1}
          className="studio-output"
          aria-label={t('handoff')}
          hidden={!splitLayout && activeView !== 'result'}
        >
          {proposal ? (
            <section className="studio-proposal" aria-label={t('revision.review')}>
              <h2>{t('revision.review')}</h2>
              <p className="studio-hint">{t('revision.reviewDescription')}</p>
              <StudioComparison
                before={proposal.before}
                after={{
                  ...proposal.before,
                  artifact: proposal.artifact,
                  music:
                    proposal.artifact.kind === 'music'
                      ? {
                          ...proposal.before.music,
                          lyrics: (
                            [proposal.artifact.primary, ...proposal.artifact.alternatives][
                              proposal.before.selectedVariant
                            ] as MusicPromptVariant
                          ).lyrics,
                        }
                      : proposal.before.music,
                }}
              />
              <div className="studio-actions">
                <button className="studio-primary" disabled={changing} onClick={acceptProposal}>
                  {t('revision.accept')}
                </button>
                <button
                  disabled={changing}
                  onClick={() => {
                    setProposal(null);
                    setMessage(t('revision.rejected'));
                  }}
                >
                  {t('revision.reject')}
                </button>
              </div>
            </section>
          ) : null}
          {!currentArtifact ? (
            <div className="studio-empty">
              <h2>{t('emptyTitle')}</h2>
              <p>{t('emptyDescription')}</p>
            </div>
          ) : (
            <fieldset disabled={changing} className="studio-output-content">
              {staleArtifact ? (
                <div className="studio-notice" role="status">
                  <p>{t('revision.outdated')}</p>
                  <p>
                    {t('changedFields', { defaultValue: 'Changed fields' })}:{' '}
                    {[...new Set(changedFields.map(fieldLabel))].join(', ')}
                  </p>
                  <button type="button" disabled={changing} onClick={build}>
                    {t('rebuildResult', { defaultValue: 'Rebuild result' })}
                  </button>
                  {!previousResultAllowed ? (
                    <button
                      type="button"
                      onClick={() => {
                        setAllowedPreviousResult(previousResultKey);
                        setError('');
                      }}
                    >
                      {t('usePreviousResult', { defaultValue: 'Use previous result' })}
                    </button>
                  ) : (
                    <p>
                      {t('usingPreviousResult', {
                        defaultValue: 'You are using the previous result.',
                      })}
                    </p>
                  )}
                </div>
              ) : null}
              <div className="studio-result-heading">
                <h2>{STUDIO_CAPABILITIES[currentArtifact.target].label + ' ' + t('handoff')}</h2>
                <span>
                  {currentArtifact.provenance.source === 'optimizer'
                    ? t('variantEdit.aiEdited', { defaultValue: 'Edited with AI' })
                    : currentArtifact.provenance.source === 'editor'
                      ? t('editedLocally')
                      : t('compiledLocally')}
                </span>
              </div>
              {currentArtifact.validation.some((check) => check.status === 'blocked') ? (
                <ValidationRail
                  artifact={currentArtifact}
                  onAction={focusValidation}
                  statuses={['blocked']}
                />
              ) : null}
              {currentArtifact.validation.some((check) => check.status === 'warning') ? (
                <ValidationRail
                  artifact={currentArtifact}
                  onAction={focusValidation}
                  statuses={['warning']}
                />
              ) : null}
              <details className="studio-details">
                <summary>{t('checks')}</summary>
                <ValidationRail
                  artifact={currentArtifact}
                  onAction={focusValidation}
                  statuses={['pass']}
                />
              </details>
              <div className="studio-toolbar" role="group" aria-label={t('chooseVariant')}>
                {[currentArtifact.primary, ...currentArtifact.alternatives].map(
                  (variant, index) => (
                    <button
                      key={variant.label}
                      aria-pressed={selectedVariant === index}
                      onClick={() => store.setSelectedVariant(index as 0 | 1 | 2)}
                    >
                      {variant.label === 'Primary' ? t('primary') : variant.label}
                    </button>
                  ),
                )}
              </div>
              {currentArtifact.kind === 'video' ? (
                <div data-studio-variant>
                  <VideoVariantCard
                    key={selectedVariant}
                    variant={
                      [currentArtifact.primary, ...currentArtifact.alternatives][
                        selectedVariant
                      ] as VideoPromptVariant
                    }
                    compareBaseline={
                      selectedVariant > 0
                        ? (currentArtifact.primary as VideoPromptVariant)
                        : undefined
                    }
                    primary
                    onCopy={copy}
                    onEdit={(changes) => edit(selectedVariant, changes)}
                    onHandoff={
                      !staleArtifact &&
                      !generationBlocker &&
                      !currentArtifact.validation.some(
                        (check) =>
                          check.status === 'blocked' &&
                          (check.action?.variantIndex === undefined ||
                            check.action.variantIndex === selectedVariant),
                      )
                        ? handoff
                        : undefined
                    }
                  />
                  <VideoVariantEditPanel
                    busy={busy}
                    disabled={changing}
                    proposal={
                      variantProposal?.variantIndex === selectedVariant ? variantProposal : null
                    }
                    onPropose={proposeVariantEdit}
                    onLocalTransform={handleLocalTransform}
                    onAccept={acceptVariantEdit}
                    onReject={() => {
                      setVariantProposal(null);
                      setMessage(t('revision.rejected'));
                    }}
                    onCancel={cancelAIRequest}
                  />
                </div>
              ) : (
                <div data-studio-variant>
                  <MusicVariantCard
                    key={selectedVariant}
                    variant={
                      [currentArtifact.primary, ...currentArtifact.alternatives][
                        selectedVariant
                      ] as MusicPromptVariant
                    }
                    compareBaseline={
                      selectedVariant > 0
                        ? (currentArtifact.primary as MusicPromptVariant)
                        : undefined
                    }
                    primary
                    onCopy={copy}
                    onLyricsChange={(lyrics) => edit(selectedVariant, { lyrics })}
                    onStyleChange={(styleOfMusic) => edit(selectedVariant, { styleOfMusic })}
                  />
                  <MusicVariantEditPanel
                    busy={busy}
                    disabled={changing}
                    instrumental={music.instrumental === true}
                    proposal={
                      musicVariantProposal?.variantIndex === selectedVariant
                        ? musicVariantProposal
                        : null
                    }
                    onPropose={proposeMusicEdit}
                    onAccept={acceptMusicVariantEdit}
                    onReject={() => {
                      setMusicVariantProposal(null);
                      setMessage(t('revision.rejected'));
                    }}
                    onCancel={cancelAIRequest}
                  />
                </div>
              )}
              {mode === 'video' && generationBlocker ? (
                <p className="studio-notice">{generationBlocker}</p>
              ) : null}
              {currentArtifact.kind === 'music' ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <button onClick={openSuno}>{t('copyOpenSuno')}</button>
                    <button
                      type="button"
                      className="studio-secondary"
                      onClick={() => navigate(ROUTES.CREATE, { state: { initialStep: 'assets' } })}
                    >
                      {t('openLyriaSetup', 'Open Lyria 3 setup · enter lyrics separately')}
                    </button>
                  </div>
                  <details className="studio-details">
                    <summary>{t('lyricTools')}</summary>
                    <Field label={t('section')}>
                      <select value={selectedSection} onChange={(e) => setSection(e.target.value)}>
                        {lyricSections.map((tag) => (
                          <option key={tag}>{tag}</option>
                        ))}
                      </select>
                    </Field>
                    <label className="studio-check">
                      <input
                        type="checkbox"
                        disabled={!selectedLyricSection || busy || changing}
                        checked={selectedSectionLocked}
                        onChange={() => {
                          store.applyDraft({
                            ...(lyricVariant
                              ? { music: { ...music, lyrics: lyricVariant.lyrics } }
                              : {}),
                            lockedSections: setLyricSectionLocked(
                              lyricVariant?.lyrics ?? '',
                              selectedSection,
                              lockedSections,
                              !selectedSectionLocked,
                            ),
                          });
                        }}
                      />
                      {t('lockSection')}
                    </label>
                    {textField('direction', direction, setDirection)}
                    <button
                      disabled={busy || changing || !selectedLyricSection || selectedSectionLocked}
                      onClick={() =>
                        void run(async () => {
                          const revision = store.draft?.revision;
                          const token = ++operation.current;
                          aiRequest.current = token;
                          const controller = new AbortController();
                          activeAbort.current?.abort();
                          activeAbort.current = controller;
                          setBusy(true);
                          try {
                            if (!(await aiReady())) return;
                            const ready = usePromptStudioDraftStore.getState().draft;
                            if (
                              !mounted.current ||
                              operation.current !== token ||
                              ready?.projectId !== projectId ||
                              ready.revision !== revision
                            )
                              return;
                            const next = await rewriteStudioLyricSection(
                              currentArtifact,
                              selectedSection,
                              direction,
                              lockedSections,
                              selectedVariant,
                              controller.signal,
                            );
                            if (
                              mounted.current &&
                              operation.current === token &&
                              usePromptStudioDraftStore.getState().draft?.revision === revision
                            ) {
                              revealResult();
                              setProposal({
                                before: structuredClone(ready),
                                artifact: next,
                                projectId,
                                revision: revision!,
                                token,
                              });
                            }
                          } finally {
                            if (activeAbort.current === controller) activeAbort.current = null;
                            if (mounted.current && aiRequest.current === token) setBusy(false);
                          }
                        })
                      }
                    >
                      {t('rewriteSection')}
                    </button>
                    <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
                      <span className="w-full text-xs font-semibold">
                        {t('variantEdit.localTools', {
                          defaultValue: 'Instant local tools (0 tokens / offline)',
                        })}
                      </span>
                      <button
                        type="button"
                        disabled={busy || changing}
                        className="text-xs"
                        onClick={() => handleLocalMusicTransform('normalize-sections')}
                      >
                        {t('variantEdit.normalizeSections', {
                          defaultValue: 'Normalize Section Tags',
                        })}
                      </button>
                      <button
                        type="button"
                        disabled={busy || changing}
                        className="text-xs"
                        onClick={() => handleLocalMusicTransform('clean-style')}
                      >
                        {t('variantEdit.cleanStyle', {
                          defaultValue: 'Clean & Cap Style (≤200)',
                        })}
                      </button>
                      <button
                        type="button"
                        disabled={busy || changing}
                        className="text-xs"
                        onClick={() => handleLocalMusicTransform('strip-visual-terms')}
                      >
                        {t('variantEdit.stripVisualTerms', {
                          defaultValue: 'Strip Visual Terms',
                        })}
                      </button>
                    </div>
                  </details>
                </>
              ) : null}
            </fieldset>
          )}
          {mode === 'video' && (
            <ExternalStudioResults
              projectId={projectId}
              artifact={currentArtifact}
              variantIndex={selectedVariant}
              disabled={changing}
              isStale={staleArtifact}
            />
          )}
        </section>
      </div>
      <ModelArenaModal
        isOpen={isArenaOpen}
        onClose={() => setIsArenaOpen(false)}
        input={video}
        onSelectTarget={selectTarget}
        onValidationAction={focusValidation}
      />
    </div>
  );
}
