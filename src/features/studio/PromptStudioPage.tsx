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
} from '@core/types';
import {
  compileMusicPromptArtifact,
  compileVideoPromptArtifact,
  getLyricSections,
  optimizeMusicPromptArtifact,
  optimizeVideoPromptArtifact,
  promptArtifactToProductionState,
} from '@core/services/promptStudioService';
import {
  editStudioVariant,
  preserveLockedLyricSections,
  rewriteStudioLyricSection,
  type StudioVariantEdits,
} from '@core/services/promptStudioEditingService';
import { promptStudioHandoffService } from '@core/services/promptStudioHandoffService';
import { studioReferenceService } from '@core/services/studioReferenceService';
import { getUserTemplates, type UserTemplate } from '@core/services/templateManager';
import { hasApiKeyAsync } from '@core/services/apiKeyService';
import { STUDIO_CAPABILITIES, studioGenerationBlocker } from '@core/config/studioCapabilities';
import { ROUTES } from '@core/config/routes';
import { usePromptStudioDraftStore } from '@core/store/usePromptStudioDraftStore';
import { useProjectStore } from '@core/store/useProjectStore';
import { useAppStore } from '@core/store/useAppStore';
import { useSettingsStore } from '@core/store/useSettingsStore';
import { useProductionRunStore } from '@core/store/useProductionRunStore';
import { DEFAULT_SPATIAL_CAMERA_RIG } from '@core/services/spatialCameraService';
import { UniversalTargetSelector } from './components/UniversalTargetSelector';
import { VideoVariantCard } from './components/VideoVariantCard';
import { MusicVariantCard } from './components/MusicVariantCard';
import { ValidationRail } from './components/ValidationRail';

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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="studio-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function PromptStudioPage() {
  const { t } = useTranslation('studio');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const projectId = useProjectStore((s) => s.currentProjectId) ?? 'default';
  const store = usePromptStudioDraftStore();
  const assets = useAppStore((s) => s.assets);
  const labs = useSettingsStore((s) => s.enableExperimentalFeatures);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showRig, setShowRig] = useState(false);
  const [history, setHistory] = useState<PromptArtifactV1[]>([]);
  const [templates, setTemplates] = useState<UserTemplate[]>([]);
  const [section, setSection] = useState('[Chorus]');
  const [direction, setDirection] = useState('');
  const ideaRef = useRef<HTMLTextAreaElement>(null);
  const mounted = useRef(true);
  const operation = useRef(0);

  useEffect(() => {
    mounted.current = true;
    void usePromptStudioDraftStore
      .getState()
      .hydrate(projectId)
      .then((ok) => {
        if (!ok || !mounted.current) return;
        const requested = params.get('mode');
        const current = usePromptStudioDraftStore.getState();
        if ((requested === 'video' || requested === 'music') && current.draft?.mode !== requested)
          current.setMode(requested);
        ideaRef.current?.focus();
      });
    void promptStudioHandoffService.listArtifacts(projectId).then(setHistory);
    void getUserTemplates().then(setTemplates);
    return () => {
      mounted.current = false;
      operation.current += 1;
      void usePromptStudioDraftStore.getState().flush(projectId);
    };
  }, [projectId, params]);

  useEffect(() => {
    ideaRef.current?.focus();
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

  const draft = store.draft;
  if (!draft || draft.projectId !== projectId)
    return (
      <main className="studio-workspace" aria-busy="true">
        <p role="status">{store.error ?? t('loading')}</p>
      </main>
    );
  const { video, music, mode, artifact, selectedVariant, lockedSections } = draft;
  const currentArtifact = artifact?.kind === mode ? artifact : null;
  const updateVideo = (changes: Partial<VideoPromptArtifactInput>) => {
    store.updateVideo(changes);
    store.setArtifact(null);
    setError('');
    operation.current += 1;
  };
  const updateMusic = (changes: Partial<MusicPromptArtifactInput>) => {
    store.updateMusic(changes);
    store.setArtifact(null);
    setError('');
    operation.current += 1;
  };
  const scopeArtifact = (value: PromptArtifactV1): PromptArtifactV1 => ({
    ...value,
    id: projectId + ':' + value.id,
    projectId,
  });
  const saveArtifact = async (value: PromptArtifactV1) => {
    store.setArtifact(value);
    await promptStudioHandoffService.saveArtifact(value);
    if (!(await store.flush()))
      throw new Error(usePromptStudioDraftStore.getState().error ?? t('saveError'));
    setHistory(await promptStudioHandoffService.listArtifacts(projectId));
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
  const build = () =>
    void run(async () => {
      const next = scopeArtifact(
        mode === 'video' ? compileVideoPromptArtifact(video) : compileMusicPromptArtifact(music),
      );
      await saveArtifact(next);
      setMessage(t('built'));
    });
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
        await saveArtifact(scopeArtifact(next));
        setMessage(t('enhanced'));
      } finally {
        if (mounted.current) setBusy(false);
      }
    });
  const copy = (value: string, label: string) =>
    void run(async () => {
      if (!value.trim()) throw new Error(t('emptyCopy'));
      await navigator.clipboard.writeText(value);
      setMessage(label);
    });
  const edit = (index: 0 | 1 | 2, changes: StudioVariantEdits) => {
    if (!currentArtifact) return;
    if (currentArtifact.kind === 'music' && changes.lyrics !== undefined)
      store.updateMusic({ lyrics: changes.lyrics });
    store.setArtifact(editStudioVariant(currentArtifact, index, changes));
    operation.current += 1;
  };
  const handoff = () =>
    void run(async () => {
      if (!currentArtifact || currentArtifact.kind !== 'video') return;
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
      if (currentArtifact.validation.some((check) => check.status === 'blocked'))
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
      <input aria-label={t(key)} value={value} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );

  return (
    <main className="studio-workspace">
      <header className="studio-heading">
        <div>
          <h1>{t('title')}</h1>
          <p>{t('description')}</p>
        </div>
        <span role="status" aria-live="polite" className="studio-save-status">
          {t('save.' + store.status)}
        </span>
      </header>
      <div className="studio-toolbar" role="group" aria-label={t('chooseMode')}>
        <button
          aria-pressed={mode === 'video'}
          onClick={() => {
            store.setMode('video');
            navigate(ROUTES.STUDIO + '?mode=video', { replace: true });
          }}
        >
          {t('videoMode')}
        </button>
        <button
          aria-pressed={mode === 'music'}
          onClick={() => {
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
      <div className="studio-columns">
        <section className="studio-brief" aria-label={t('brief')}>
          <Field label={mode === 'video' ? t('idea') : t('topic')}>
            <textarea
              ref={ideaRef}
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
          <details className="studio-details">
            <summary>{t('templatesHistory')}</summary>
            <div className="studio-fields">
              <Field label={t('templates')}>
                <select
                  defaultValue=""
                  onChange={(e) => {
                    const template = templates.find((item) => item.id === e.target.value);
                    if (template)
                      updateVideo({
                        idea: template.params.idea ?? '',
                        camera: template.params.cameraMovement,
                        lighting: template.params.lightingStyle,
                        environment: template.params.environment,
                      });
                  }}
                >
                  <option value="">{t('chooseTemplate')}</option>
                  {templates.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t('history')}>
                <select
                  value=""
                  onChange={(e) => {
                    const previous = history.find((item) => item.id === e.target.value);
                    if (!previous) return;
                    store.setMode(previous.kind);
                    if (previous.kind === 'video')
                      store.updateVideo(previous.input as VideoPromptArtifactInput);
                    else store.updateMusic(previous.input as MusicPromptArtifactInput);
                    store.setArtifact(previous);
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
          </details>
          {mode === 'video' ? (
            <>
              <div className="studio-fields">
                <Field label={t('target')}>
                  <UniversalTargetSelector
                    value={video.target}
                    onChange={(target) => updateVideo({ target })}
                  />
                </Field>
                <Field label={t('aspectRatio')}>
                  <select
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
              </details>
            </>
          )}
          <div className="studio-actions">
            <button className="studio-primary" onClick={build}>
              {t('build')}
            </button>
            <button disabled={busy} onClick={optimize}>
              {busy ? t('enhancing') : t('enhance')}
            </button>
          </div>
          <p className="studio-hint">{t('localFirst')}</p>
        </section>
        <section className="studio-output" aria-label={t('handoff')}>
          {!currentArtifact ? (
            <div className="studio-empty">
              <h2>{t('emptyTitle')}</h2>
              <p>{t('emptyDescription')}</p>
            </div>
          ) : (
            <>
              <div className="studio-result-heading">
                <h2>{STUDIO_CAPABILITIES[currentArtifact.target].label + ' ' + t('handoff')}</h2>
                <span>
                  {currentArtifact.provenance.source === 'editor'
                    ? t('editedLocally')
                    : t('compiledLocally')}
                </span>
              </div>
              <details className="studio-details">
                <summary>{t('checks')}</summary>
                <ValidationRail artifact={currentArtifact} />
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
                  onHandoff={!generationBlocker ? handoff : undefined}
                />
              ) : (
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
              )}
              {mode === 'video' && video.target === 'veo-api' && generationBlocker ? (
                <p className="studio-notice">{generationBlocker}</p>
              ) : null}
              {currentArtifact.kind === 'music' ? (
                <>
                  <button className="studio-primary" onClick={openSuno}>
                    {t('copyOpenSuno')}
                  </button>
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
                          if (lyricVariant) store.updateMusic({ lyrics: lyricVariant.lyrics });
                          store.setLockedSections(
                            lockedSections.includes(selectedSection)
                              ? lockedSections.filter((item) => item !== selectedSection)
                              : [...lockedSections, selectedSection],
                          );
                        }}
                      />
                      {t('lockSection')}
                    </label>
                    {textField('direction', direction, setDirection)}
                    <button
                      disabled={busy || lockedSections.includes(selectedSection)}
                      onClick={() =>
                        void run(async () => {
                          const revision = store.draft?.revision;
                          const token = ++operation.current;
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
                            )
                              await saveArtifact(next);
                          } finally {
                            if (mounted.current) setBusy(false);
                          }
                        })
                      }
                    >
                      {t('rewriteSection')}
                    </button>
                  </details>
                </>
              ) : null}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
