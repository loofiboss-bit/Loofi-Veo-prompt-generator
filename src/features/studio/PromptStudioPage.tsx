import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
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
} from '@core/types';
import {
  compileMusicPromptArtifact,
  compileVideoPromptArtifact,
  getLyricSections,
  optimizeMusicPromptArtifact,
  optimizeVideoPromptArtifact,
  promptArtifactToProductionState,
  revalidatePromptArtifact,
  normalizeVideoPromptInput,
  normalizeMusicPromptInput,
} from '@core/services/promptStudioService';
import {
  editStudioVariant,
  preserveLockedLyricSections,
  rewriteStudioLyricSection,
  type StudioVariantEdits,
} from '@core/services/promptStudioEditingService';
import { promptStudioHandoffService } from '@core/services/promptStudioHandoffService';
import { sanitizeStudioTemplate } from '@core/services/studioTemplateService';
import { studioReferenceService } from '@core/services/studioReferenceService';
import { hasApiKeyAsync } from '@core/services/apiKeyService';
import { STUDIO_CAPABILITIES, studioGenerationBlocker } from '@core/config/studioCapabilities';
import { openAssetLibrary } from '@shared/utils/assetLibraryEvents';
import { ROUTES } from '@core/config/routes';
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

export function PromptStudioPage() {
  const { t } = useTranslation('studio');
  const navigate = useNavigate();
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
  const [section, setSection] = useState('[Chorus]');
  const [direction, setDirection] = useState('');
  const [isArenaOpen, setIsArenaOpen] = useState(false);
  const ideaRef = useRef<HTMLTextAreaElement>(null);
  const mounted = useRef(true);
  const operation = useRef(0);
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
    setBusy(false);
    aiRequest.current = 0;
    setIsArenaOpen(false);
    return () => {
      active = false;
      mounted.current = false;
      operation.current += 1;
      void usePromptStudioDraftStore.getState().flush(projectId);
    };
  }, [projectId, params, t]);

  useEffect(() => {
    focusDraftIdea(ideaRef.current);
  }, [store.draft?.mode]);
  useEffect(() => {
    const warnUnsaved = (event: BeforeUnloadEvent) => {
      const state = usePromptStudioDraftStore.getState();
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

  const revealResult = () => {
    focusResultRequested.current = !splitLayout;
    setActiveView('result');
  };

  const updateVideo = (changes: Partial<VideoPromptArtifactInput>) => {
    store.applyDraft({
      video: { ...usePromptStudioDraftStore.getState().draft!.video, ...changes },
    });
    setError('');
    operation.current += 1;
    setProposal(null);
  };
  const updateMusic = (changes: Partial<MusicPromptArtifactInput>) => {
    store.applyDraft({
      music: { ...usePromptStudioDraftStore.getState().draft!.music, ...changes },
    });
    setError('');
    operation.current += 1;
    setProposal(null);
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
      setError(e instanceof Error ? e.message : t('actionError'));
    }
  };
  const change = async (action: () => Promise<void>) => {
    if (changeInFlight.current) throw new Error(t('revision.wait'));
    changeInFlight.current = true;
    setChanging(true);
    changeDraft.current = usePromptStudioDraftStore.getState().draft;
    operation.current += 1;
    setProposal(null);
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
  const selectTarget = (target: VideoPromptArtifactInput['target']) =>
    change(async () => {
      if (target === video.target) return;
      await checkpoint('target');
      const active = usePromptStudioDraftStore.getState().draft!;
      store.applyDraft({
        video: { ...active.video, target },
        artifact: null,
        artifacts: { ...active.artifacts, video: null },
      });
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
  const optimize = () =>
    void run(async () => {
      const token = ++operation.current;
      aiRequest.current = token;
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
            ? await optimizeVideoPromptArtifact(video)
            : await optimizeMusicPromptArtifact(music);
        const latest = usePromptStudioDraftStore.getState().draft;
        if (
          !mounted.current ||
          operation.current !== token ||
          latest?.projectId !== projectId ||
          latest.revision !== revision
        )
          return;
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
      const field =
        action.field === 'variant' || action.variantIndex !== undefined
          ? workspace?.querySelector<HTMLElement>(
              action.field === 'lyrics'
                ? '[data-studio-variant] textarea[data-studio-field="lyrics"]'
                : '[data-studio-variant] textarea',
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
      if (!value.trim()) throw new Error(t('emptyCopy'));
      await navigator.clipboard.writeText(value);
      setMessage(label);
    });
  const edit = (index: 0 | 1 | 2, changes: StudioVariantEdits) => {
    if (!currentArtifact || changeInFlight.current) return;
    const next = editStudioVariant(currentArtifact, index, changes);
    store.applyDraft({
      ...(currentArtifact.kind === 'music' && changes.lyrics !== undefined
        ? { music: { ...music, lyrics: changes.lyrics } }
        : {}),
      artifact: next,
      artifacts: { ...draft.artifacts, [mode]: next },
    });
    operation.current += 1;
    setProposal(null);
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
  const generationBlocker = mode === 'video' ? studioGenerationBlocker(video) : null;
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
        <span role="status" aria-live="polite" className="studio-save-status">
          {t('save.' + store.status)}
        </span>
      </header>
      <div className="studio-toolbar" role="group" aria-label={t('chooseMode')}>
        <button
          data-studio-mode="video"
          disabled={changing}
          aria-pressed={mode === 'video'}
          onClick={() => {
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
            <Field label={mode === 'video' ? t('idea') : t('topic')}>
              <textarea
                ref={ideaRef}
                data-studio-field={mode === 'video' ? 'idea' : 'topic'}
                aria-label={mode === 'video' ? t('idea') : t('topic')}
                placeholder={mode === 'video' ? t('ideaPlaceholder') : t('topicPlaceholder')}
                rows={4}
                value={mode === 'video' ? video.idea : music.topic}
                onChange={(e) =>
                  mode === 'video'
                    ? updateVideo({ idea: e.target.value })
                    : updateMusic({ topic: e.target.value })
                }
              />
            </Field>
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
                        <option value={n} key={n}>
                          {t('seconds', { count: n })}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
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
                <div className="studio-actions">
                  <button className="studio-primary" disabled={changing} onClick={build}>
                    {t('build')}
                  </button>
                  <button disabled={busy || changing} onClick={optimize}>
                    {busy ? t('enhancing') : t('enhance')}
                  </button>
                </div>
                <p className="studio-hint">{t('localFirst')}</p>
                <details className="studio-details">
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
                <div className="studio-actions">
                  <button className="studio-primary" disabled={changing} onClick={build}>
                    {t('build')}
                  </button>
                  <button disabled={busy || changing} onClick={optimize}>
                    {busy ? t('enhancing') : t('enhance')}
                  </button>
                </div>
                <p className="studio-hint">{t('localFirst')}</p>
                <details className="studio-details">
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
                          {item.primary.title}
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
              {staleArtifact ? <p className="studio-notice">{t('revision.outdated')}</p> : null}
              <div className="studio-result-heading">
                <h2>{STUDIO_CAPABILITIES[currentArtifact.target].label + ' ' + t('handoff')}</h2>
                <span>
                  {currentArtifact.provenance.source === 'editor'
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
              <details className="studio-details">
                <summary>{t('checks')}</summary>
                <ValidationRail
                  artifact={currentArtifact}
                  onAction={focusValidation}
                  statuses={['pass', 'warning']}
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
                    primary
                    onCopy={copy}
                    onLyricsChange={(lyrics) => edit(selectedVariant, { lyrics })}
                    onStyleChange={(styleOfMusic) => edit(selectedVariant, { styleOfMusic })}
                  />
                </div>
              )}
              {mode === 'video' && video.target === 'veo-api' && generationBlocker ? (
                <p className="studio-notice">{generationBlocker}</p>
              ) : null}
              {currentArtifact.kind === 'music' ? (
                <>
                  <button onClick={openSuno}>{t('copyOpenSuno')}</button>
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
                        checked={lockedSections.includes(selectedSection)}
                        onChange={() => {
                          store.applyDraft({
                            ...(lyricVariant
                              ? { music: { ...music, lyrics: lyricVariant.lyrics } }
                              : {}),
                            lockedSections: lockedSections.includes(selectedSection)
                              ? lockedSections.filter((item) => item !== selectedSection)
                              : [...lockedSections, selectedSection],
                          });
                        }}
                      />
                      {t('lockSection')}
                    </label>
                    {textField('direction', direction, setDirection)}
                    <button
                      disabled={busy || changing || lockedSections.includes(selectedSection)}
                      onClick={() =>
                        void run(async () => {
                          const revision = store.draft?.revision;
                          const token = ++operation.current;
                          aiRequest.current = token;
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
                            if (mounted.current && aiRequest.current === token) setBusy(false);
                          }
                        })
                      }
                    >
                      {t('rewriteSection')}
                    </button>
                  </details>
                </>
              ) : null}
            </fieldset>
          )}
          {mode === 'video' && (
            <ExternalStudioResults
              projectId={projectId}
              artifact={staleArtifact ? null : currentArtifact}
              variantIndex={selectedVariant}
              disabled={changing}
            />
          )}
        </section>
      </div>
      <ModelArenaModal
        isOpen={isArenaOpen}
        onClose={() => setIsArenaOpen(false)}
        input={video}
        onSelectTarget={selectTarget}
      />
    </div>
  );
}
