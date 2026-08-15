import { useEffect, useMemo, useRef, useState, type ReactNode, type Ref } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import Icon from '@shared/components/ui/Icon';
import type {
  MusicPromptArtifactInput,
  MusicPromptVariant,
  PromptArtifactV1,
  VideoPromptArtifactInput,
  VideoPromptMode,
  VideoPromptVariant,
} from '@core/types';
import {
  compileMusicPromptArtifact,
  compileVideoPromptArtifact,
  getLyricSections,
  optimizeMusicPromptArtifact,
  optimizeVideoPromptArtifact,
  promptArtifactToProductionState,
  regenerateLyrics as regenerateLyricsLocally,
  shortenLyrics as shortenLyricsLocally,
  updateLyricsSection,
} from '@core/services/promptStudioService';
import { promptStudioHandoffService } from '@core/services/promptStudioHandoffService';
import { ROUTES } from '@core/config/routes';
import { SpatialCameraDirector } from '@features/create/components/SpatialCameraDirector';
import { DEFAULT_SPATIAL_CAMERA_RIG } from '@core/services/spatialCameraService';
import { useAppStore } from '@core/store/useAppStore';
import { useProjectStore } from '@core/store/useProjectStore';
import { useProductionRunStore } from '@core/store/useProductionRunStore';

type StudioMode = 'video' | 'music';

const VIDEO_MODES: Array<{ value: VideoPromptMode; label: string; hint: string }> = [
  { value: 'text-to-video', label: 'Text to video', hint: 'One focused scene from an idea.' },
  {
    value: 'image-to-video',
    label: 'Image to video',
    hint: 'Describe motion, not the image again.',
  },
  {
    value: 'first-last-frames',
    label: 'First + last frames',
    hint: 'Direct the transition between two frames.',
  },
  {
    value: 'ingredients',
    label: 'Ingredients / references',
    hint: 'Assign a clear role to every reference.',
  },
  { value: 'extend', label: 'Extend a clip', hint: 'Continue the existing motion and continuity.' },
];

const DEFAULT_VIDEO: VideoPromptArtifactInput = {
  idea: '',
  mode: 'text-to-video',
  target: 'flow-veo',
  aspectRatio: '16:9',
  durationSeconds: 8,
  subject: '',
  action: '',
  environment: '',
  camera: '',
  lighting: '',
  style: '',
  audio: '',
  dialogue: '',
  negativePrompt: '',
  startFrame: '',
  endFrame: '',
  previousClip: '',
  referenceRoles: '',
};

const DEFAULT_MUSIC: MusicPromptArtifactInput = {
  topic: '',
  language: 'English',
  genre: '',
  mood: '',
  voice: 'Any',
  tempo: 'Any',
  instruments: '',
  structure: 'Auto',
  lyrics: '',
  instrumental: false,
  styleInfluence: null,
  targetProfile: 'suno-v5.5',
  key: '',
  timeSignature: '',
  energyCurve: '',
  vocalRange: '',
  voiceNotes: '',
  customModelNotes: '',
  personaNotes: '',
  tasteGuidance: '',
  mixNotes: '',
  rightsChecklist: {
    ownsOrLicensedLyrics: false,
    hasVoiceConsent: false,
    hasTrainingReferenceRights: false,
    avoidsArtistImitation: true,
  },
};

const copyToClipboard = async (value: string): Promise<void> => {
  if (!value.trim()) throw new Error('Nothing to copy.');
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const helper = document.createElement('textarea');
  helper.value = value;
  helper.setAttribute('readonly', 'true');
  helper.style.position = 'fixed';
  helper.style.opacity = '0';
  document.body.appendChild(helper);
  helper.select();
  const copied = document.execCommand('copy');
  helper.remove();
  if (!copied) throw new Error('Clipboard access is unavailable.');
};

const videoAllText = (variant: VideoPromptVariant): string => variant.copyAll;

const musicAllText = (variant: MusicPromptVariant): string => variant.copyAll;

const withMusicLyrics = (variant: MusicPromptVariant, lyrics: string): MusicPromptVariant => {
  const next = { ...variant, lyrics, copyLyrics: lyrics };
  return {
    ...next,
    copyAll: `Title: ${next.title}\n\nStyle of Music:\n${next.styleOfMusic}\n\nLyrics:\n${next.copyLyrics}\n\nProduction notes:\n${next.productionNotes.join('\n')}`,
  };
};

interface FieldProps {
  label: string;
  hint?: string;
  children: ReactNode;
}

function Field({ label, hint, children }: FieldProps) {
  return (
    <label className="block space-y-2">
      <span className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </span>
      {children}
      {hint ? <span className="block text-xs leading-relaxed text-slate-500">{hint}</span> : null}
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  rows,
  inputRef,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  rows?: number;
  inputRef?: Ref<HTMLTextAreaElement>;
}) {
  return (
    <Field label={label} hint={hint}>
      {rows ? (
        <textarea
          ref={inputRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="w-full resize-y rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-3 text-sm leading-relaxed text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
        />
      )}
    </Field>
  );
}

function ValidationRail({ artifact }: { artifact: PromptArtifactV1 }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {artifact.validation.map((check) => (
        <div
          key={check.id}
          className={`rounded-lg border px-3 py-2 text-xs ${
            check.status === 'blocked'
              ? 'border-rose-500/40 bg-rose-500/10 text-rose-200'
              : check.status === 'warning'
                ? 'border-amber-400/40 bg-amber-400/10 text-amber-100'
                : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100'
          }`}
        >
          <div className="flex items-center gap-2 font-semibold">
            <span aria-hidden="true">
              {check.status === 'pass' ? '✓' : check.status === 'warning' ? '!' : '×'}
            </span>
            {check.label}
          </div>
          <p className="mt-1 leading-relaxed opacity-80">{check.detail}</p>
        </div>
      ))}
    </div>
  );
}

function VideoVariantCard({
  variant,
  primary,
  onCopy,
  onHandoff,
}: {
  variant: VideoPromptVariant;
  primary?: boolean;
  onCopy: (text: string, label: string) => void;
  onHandoff?: () => void;
}) {
  const [open, setOpen] = useState(Boolean(primary));
  return (
    <article
      className={`rounded-2xl border ${primary ? 'border-cyan-400/50 bg-cyan-400/[0.06]' : 'border-slate-700 bg-slate-900/60'}`}
    >
      <div className="flex items-start justify-between gap-3 p-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">
            {variant.label}
          </p>
          <h3 className="mt-1 text-base font-semibold text-white">{variant.title}</h3>
        </div>
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-400 hover:border-slate-500 hover:text-white"
          aria-expanded={open}
        >
          {open ? 'Collapse' : 'Open'}
        </button>
      </div>
      {open ? (
        <div className="space-y-4 border-t border-slate-800 p-4">
          <textarea
            readOnly
            value={variant.prompt}
            aria-label={`${variant.label} prompt`}
            className="min-h-40 w-full resize-y rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-sm leading-relaxed text-slate-200"
          />
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Negative prompt
            </p>
            <p className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-xs leading-relaxed text-slate-400">
              {variant.negativePrompt}
            </p>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Handoff checklist
            </p>
            <ul className="space-y-1 text-xs leading-relaxed text-slate-400">
              {variant.settingsChecklist.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onCopy(variant.copyPrompt, 'Prompt copied')}
              className="rounded-lg bg-cyan-400 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-300"
            >
              Copy prompt
            </button>
            <button
              type="button"
              onClick={() => onCopy(variant.copyNegativePrompt, 'Negative prompt copied')}
              className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-slate-500 hover:text-white"
            >
              Copy negative
            </button>
            <button
              type="button"
              onClick={() => onCopy(variant.copySettingsChecklist, 'Settings checklist copied')}
              className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-slate-500 hover:text-white"
            >
              Copy checklist
            </button>
            <button
              type="button"
              onClick={() => onCopy(videoAllText(variant), 'Handoff copied')}
              className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-slate-500 hover:text-white"
            >
              Copy handoff
            </button>
            {onHandoff ? (
              <button
                type="button"
                onClick={onHandoff}
                className="rounded-lg border border-amber-300/50 px-3 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-300/10"
              >
                Generate in app
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function MusicVariantCard({
  variant,
  primary,
  onCopy,
  onLyricsChange,
}: {
  variant: MusicPromptVariant;
  primary?: boolean;
  onCopy: (text: string, label: string) => void;
  onLyricsChange?: (lyrics: string) => void;
}) {
  const [open, setOpen] = useState(Boolean(primary));
  return (
    <article
      className={`rounded-2xl border ${primary ? 'border-fuchsia-400/50 bg-fuchsia-400/[0.06]' : 'border-slate-700 bg-slate-900/60'}`}
    >
      <div className="flex items-start justify-between gap-3 p-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-fuchsia-300">
            {variant.label}
          </p>
          <h3 className="mt-1 text-base font-semibold text-white">{variant.title}</h3>
        </div>
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-400 hover:border-slate-500 hover:text-white"
          aria-expanded={open}
        >
          {open ? 'Collapse' : 'Open'}
        </button>
      </div>
      {open ? (
        <div className="space-y-4 border-t border-slate-800 p-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Style of Music
            </p>
            <textarea
              readOnly
              value={variant.styleOfMusic}
              aria-label={`${variant.label} style`}
              className="min-h-20 w-full resize-y rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-sm leading-relaxed text-fuchsia-100"
            />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Lyrics
            </p>
            <textarea
              readOnly={!onLyricsChange}
              value={variant.lyrics}
              onChange={(event) => onLyricsChange?.(event.target.value)}
              aria-label={`${variant.label} lyrics`}
              className="min-h-64 w-full resize-y rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-sm leading-relaxed text-slate-200"
            />
          </div>
          <ul className="space-y-1 text-xs leading-relaxed text-slate-400">
            {variant.productionNotes.map((note) => (
              <li key={note}>• {note}</li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onCopy(variant.copyStyle, 'Style copied')}
              className="rounded-lg bg-fuchsia-400 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-fuchsia-300"
            >
              Copy style
            </button>
            <button
              type="button"
              onClick={() => onCopy(variant.copyLyrics, 'Lyrics copied')}
              className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-slate-500 hover:text-white"
            >
              Copy lyrics
            </button>
            <button
              type="button"
              onClick={() => onCopy(musicAllText(variant), 'Suno handoff copied')}
              className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-slate-500 hover:text-white"
            >
              Copy all
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

export function PromptStudioPage() {
  const { t } = useTranslation('studio');
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<StudioMode>(
    searchParams.get('mode') === 'music' ? 'music' : 'video',
  );
  const [video, setVideo] = useState<VideoPromptArtifactInput>(DEFAULT_VIDEO);
  const [music, setMusic] = useState<MusicPromptArtifactInput>(DEFAULT_MUSIC);
  const [artifact, setArtifact] = useState<PromptArtifactV1 | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [selectedSection, setSelectedSection] = useState('[Chorus]');
  const [lockedSections, setLockedSections] = useState<string[]>([]);
  const [rewriteRequest, setRewriteRequest] = useState(
    'Make this section more vivid and singable.',
  );
  const [showSpatialRig, setShowSpatialRig] = useState(false);
  const ideaRef = useRef<HTMLTextAreaElement>(null);
  const currentProjectId = useProjectStore((state) => state.currentProjectId) ?? 'default';
  const createLocalPlan = useProductionRunStore((state) => state.createLocalPlan);

  useEffect(() => {
    ideaRef.current?.focus();
  }, [mode]);

  useEffect(() => {
    void promptStudioHandoffService.migrateLegacyHistory();
  }, []);

  useEffect(() => {
    const requestedMode = searchParams.get('mode');
    if (requestedMode === 'music' || requestedMode === 'video') setMode(requestedMode);
  }, [searchParams]);

  const updateVideo = <K extends keyof VideoPromptArtifactInput>(
    key: K,
    value: VideoPromptArtifactInput[K],
  ) => {
    setVideo((current) => ({ ...current, [key]: value }));
    setArtifact(null);
    setError('');
  };

  const updateMusic = <K extends keyof MusicPromptArtifactInput>(
    key: K,
    value: MusicPromptArtifactInput[K],
  ) => {
    setMusic((current) => ({ ...current, [key]: value }));
    setArtifact(null);
    setError('');
  };

  const buildLocal = () => {
    setError('');
    setStatus('');
    const next =
      mode === 'video' ? compileVideoPromptArtifact(video) : compileMusicPromptArtifact(music);
    setArtifact(next);
    if (next.validation.some((check) => check.status === 'blocked'))
      setError('Complete the blocked checks before using this handoff.');
    else setStatus('Copy-ready pack built locally.');
  };

  const optimize = async () => {
    setIsOptimizing(true);
    setError('');
    setStatus('');
    const localDraft =
      mode === 'video' ? compileVideoPromptArtifact(video) : compileMusicPromptArtifact(music);
    setArtifact(localDraft);
    try {
      const next =
        mode === 'video'
          ? await optimizeVideoPromptArtifact(video)
          : await optimizeMusicPromptArtifact(music);
      setArtifact(next);
      setStatus('AI-polished primary ready. Local alternatives remain available.');
    } catch (optimizationError) {
      setArtifact(localDraft);
      setError(
        optimizationError instanceof Error
          ? `${optimizationError.message} Local draft remains available.`
          : 'The optimizer failed. Your local draft remains available.',
      );
    } finally {
      setIsOptimizing(false);
    }
  };

  const copy = async (text: string, message: string): Promise<boolean> => {
    try {
      await copyToClipboard(text);
      setStatus(message);
      setError('');
      return true;
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : 'Clipboard access is unavailable.');
      return false;
    }
  };

  const createHandoff = async (destination: 'production' | 'lyria') => {
    if (!artifact) return;
    if (artifact.validation.some((check) => check.status === 'blocked')) {
      setError('Resolve blocked checks before creating an in-app draft.');
      return;
    }
    try {
      const handoff = await promptStudioHandoffService.createDraft(artifact, destination);
      if (destination === 'production' && artifact.kind === 'video') {
        const appState = useAppStore.getState();
        await createLocalPlan({
          projectId: currentProjectId,
          title: artifact.primary.title,
          promptState: promptArtifactToProductionState({
            ...(artifact.input as VideoPromptArtifactInput),
            idea: (artifact.primary as VideoPromptVariant).prompt,
          }),
          assets: appState.assets,
          productionBible: appState.productionBible ?? undefined,
        });
      }
      setStatus(
        destination === 'production'
          ? 'Local Production Run draft saved. Opening the cost-review workflow.'
          : 'Local Lyria draft saved. Opening the separate approval workflow.',
      );
      navigate(destination === 'production' ? ROUTES.CREATE : `${ROUTES.CREATE}?step=assets`, {
        state: { promptStudioHandoff: handoff, promptStudioArtifact: artifact },
      });
    } catch (handoffError) {
      setError(
        handoffError instanceof Error
          ? handoffError.message
          : 'The local handoff could not be saved.',
      );
    }
  };

  const openSuno = async () => {
    if (!artifact || artifact.kind !== 'music') return;
    const copied = await copy(
      musicAllText(artifact.primary as MusicPromptVariant),
      'Suno handoff copied.',
    );
    if (copied) window.open('https://suno.com/create', '_blank', 'noopener,noreferrer');
  };

  const lyricSections = useMemo(
    () =>
      artifact?.kind === 'music'
        ? getLyricSections((artifact.primary as MusicPromptVariant).lyrics)
        : [],
    [artifact],
  );

  const rewriteSection = () => {
    if (!artifact || artifact.kind !== 'music') return;
    const primary = artifact.primary as MusicPromptVariant;
    const replacement = `${rewriteRequest.trim() || 'A vivid new passage'}\n${music.topic.trim() || 'A feeling that keeps moving forward'}.`;
    const lyrics = updateLyricsSection(
      primary.lyrics,
      selectedSection,
      replacement,
      lockedSections,
    );
    setArtifact({ ...artifact, primary: withMusicLyrics(primary, lyrics) });
    setStatus(
      lockedSections.includes(selectedSection)
        ? 'That section is locked.'
        : `${selectedSection} rewritten locally.`,
    );
  };

  const improveHook = () => {
    if (!artifact || artifact.kind !== 'music') return;
    const primary = artifact.primary as MusicPromptVariant;
    const lyrics = updateLyricsSection(
      primary.lyrics,
      '[Chorus]',
      'We keep the fire, we keep the sound\nTurning the lost road back around',
      lockedSections,
    );
    setArtifact({ ...artifact, primary: withMusicLyrics(primary, lyrics) });
    setStatus('Hook improved locally.');
  };

  const extendLyrics = () => {
    if (!artifact || artifact.kind !== 'music') return;
    const primary = artifact.primary as MusicPromptVariant;
    const lyrics = `${primary.lyrics.trim()}\n\n[Outro]\n${music.topic.trim() || 'We carry the light'}\nAnd let the last note breathe.`;
    setArtifact({ ...artifact, primary: withMusicLyrics(primary, lyrics) });
    setStatus('Lyrics extended locally.');
  };

  const shortenCurrentLyrics = () => {
    if (!artifact || artifact.kind !== 'music') return;
    const primary = artifact.primary as MusicPromptVariant;
    const lyrics = shortenLyricsLocally(primary.lyrics, lockedSections);
    setArtifact({ ...artifact, primary: withMusicLyrics(primary, lyrics) });
    setStatus('Unlocked lyric sections shortened locally.');
  };

  const regenerateCurrentLyrics = () => {
    if (!artifact || artifact.kind !== 'music') return;
    const primary = artifact.primary as MusicPromptVariant;
    const lyrics = regenerateLyricsLocally(
      primary.lyrics,
      music.topic,
      music.language,
      lockedSections,
    );
    setArtifact({ ...artifact, primary: withMusicLyrics(primary, lyrics) });
    setStatus('Unlocked lyric sections regenerated locally.');
  };

  return (
    <main className="min-h-full bg-[#090c14] text-slate-100">
      <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-10">
        <header className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-[radial-gradient(circle_at_top_right,_rgba(34,211,238,0.18),_transparent_38%),linear-gradient(135deg,#101728,#0b0e17)] p-6 shadow-2xl shadow-cyan-950/20 sm:p-10">
          <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full border border-cyan-300/20" />
          <div className="pointer-events-none absolute -right-4 -top-12 h-40 w-40 rounded-full border border-fuchsia-300/20" />
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-300">
            {t('eyebrow')}
          </p>
          <div className="mt-4 max-w-3xl">
            <h1 className="font-serif text-4xl font-semibold tracking-tight text-white sm:text-6xl">
              {t('title')}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
              {t('description')}
            </p>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setMode('video');
                navigate(`${ROUTES.STUDIO}?mode=video`, { replace: true });
              }}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${mode === 'video' ? 'border-cyan-300 bg-cyan-300 text-slate-950' : 'border-slate-600 text-slate-300 hover:border-cyan-300 hover:text-white'}`}
            >
              <Icon name="video" className="mr-2 inline h-4 w-4" />
              {t('videoMode')}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('music');
                navigate(`${ROUTES.STUDIO}?mode=music`, { replace: true });
              }}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${mode === 'music' ? 'border-fuchsia-300 bg-fuchsia-300 text-slate-950' : 'border-slate-600 text-slate-300 hover:border-fuchsia-300 hover:text-white'}`}
            >
              <Icon name="music" className="mr-2 inline h-4 w-4" />
              {t('musicMode')}
            </button>
            <span className="ms-auto text-xs text-slate-500">
              {location.pathname === ROUTES.STUDIO ? t('localDraft') : ''}
            </span>
          </div>
        </header>

        {status || error ? (
          <div
            role="status"
            aria-live="polite"
            className={`mt-4 rounded-xl border px-4 py-3 text-sm ${error ? 'border-rose-400/40 bg-rose-400/10 text-rose-100' : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100'}`}
          >
            {error || status}
          </div>
        ) : null}

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 sm:p-7">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">
                  01 / Brief
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  {mode === 'video' ? 'Describe the moment' : 'Describe the song'}
                </h2>
              </div>
              <span className="rounded-full border border-slate-700 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                {t('noProviderCall')}
              </span>
            </div>

            {mode === 'video' ? (
              <div className="space-y-5">
                <TextField
                  label="Core idea"
                  value={video.idea}
                  onChange={(value) => updateVideo('idea', value)}
                  inputRef={ideaRef}
                  placeholder="A courier crosses a rain-slicked neon street before the last train leaves"
                  hint="Start with one scene-sized idea. Short clips become muddled when they contain several separate events."
                  rows={5}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Target">
                    <select
                      value={video.target}
                      onChange={(event) =>
                        updateVideo(
                          'target',
                          event.target.value as VideoPromptArtifactInput['target'],
                        )
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none focus:border-cyan-400"
                    >
                      <option value="flow-veo">Google Flow / Veo</option>
                      <option value="veo-api">Veo API</option>
                    </select>
                  </Field>
                  <Field label="Aspect ratio">
                    <select
                      value={video.aspectRatio}
                      onChange={(event) =>
                        updateVideo(
                          'aspectRatio',
                          event.target.value as VideoPromptArtifactInput['aspectRatio'],
                        )
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none focus:border-cyan-400"
                    >
                      <option value="16:9">16:9 landscape</option>
                      <option value="9:16">9:16 vertical</option>
                    </select>
                  </Field>
                </div>
                <Field
                  label="Prompt recipe"
                  hint={VIDEO_MODES.find((item) => item.value === video.mode)?.hint}
                >
                  <div className="grid gap-2 sm:grid-cols-2">
                    {VIDEO_MODES.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => updateVideo('mode', item.value)}
                        className={`rounded-xl border p-3 text-left text-sm transition ${video.mode === item.value ? 'border-cyan-300 bg-cyan-300/10 text-cyan-100' : 'border-slate-700 bg-slate-950/40 text-slate-400 hover:border-slate-500 hover:text-white'}`}
                      >
                        <span className="block font-semibold">{item.label}</span>
                        <span className="mt-1 block text-xs opacity-70">{item.hint}</span>
                      </button>
                    ))}
                  </div>
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Length">
                    <select
                      value={video.durationSeconds}
                      onChange={(event) =>
                        updateVideo(
                          'durationSeconds',
                          Number(event.target.value) as VideoPromptArtifactInput['durationSeconds'],
                        )
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none focus:border-cyan-400"
                    >
                      <option value={4}>4 seconds</option>
                      <option value={6}>6 seconds</option>
                      <option value={8}>8 seconds</option>
                      <option value={10}>10 seconds</option>
                    </select>
                  </Field>
                  <TextField
                    label="Subject"
                    value={video.subject ?? ''}
                    onChange={(value) => updateVideo('subject', value)}
                    placeholder="The subject, character, or object"
                  />
                </div>
                {video.mode !== 'image-to-video' ? (
                  <TextField
                    label="Action"
                    value={video.action ?? ''}
                    onChange={(value) => updateVideo('action', value)}
                    placeholder="walks toward the train entrance, glancing at the clock"
                  />
                ) : (
                  <TextField
                    label="Motion"
                    value={video.action ?? ''}
                    onChange={(value) => updateVideo('action', value)}
                    placeholder="hair and coat flutter gently while the camera pushes in"
                    hint="Image-to-video uses this as a motion prompt; the source image carries identity and look."
                  />
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField
                    label="Environment"
                    value={video.environment ?? ''}
                    onChange={(value) => updateVideo('environment', value)}
                    placeholder="rain-slicked street at blue hour"
                  />
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Camera
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowSpatialRig((prev) => !prev)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
                      >
                        <Icon name="film" className="text-xs" />
                        {showSpatialRig ? 'Hide 3D Rig' : '3D Spatial Rig (Veo 3.1)'}
                      </button>
                    </div>
                    <TextField
                      label=""
                      value={video.camera ?? ''}
                      onChange={(value) => updateVideo('camera', value)}
                      placeholder="slow dolly forward, low angle"
                    />
                  </div>
                </div>
                {showSpatialRig && (
                  <SpatialCameraDirector
                    rig={video.spatialCamera ?? DEFAULT_SPATIAL_CAMERA_RIG}
                    onChange={(rig) => updateVideo('spatialCamera', rig)}
                  />
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField
                    label="Lighting / style"
                    value={video.lighting ?? ''}
                    onChange={(value) => updateVideo('lighting', value)}
                    placeholder="cool cyan practicals, cinematic neo-noir"
                  />
                  <TextField
                    label="Audio"
                    value={video.audio ?? ''}
                    onChange={(value) => updateVideo('audio', value)}
                    placeholder="rain, distant traffic, measured footsteps"
                  />
                </div>
                <TextField
                  label="Dialogue (optional)"
                  value={video.dialogue ?? ''}
                  onChange={(value) => updateVideo('dialogue', value)}
                  placeholder="I am still on time."
                  hint="The compiler uses colon-based dialogue direction and removes quotation marks."
                />
                {video.mode === 'first-last-frames' ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextField
                      label="Start frame"
                      value={video.startFrame ?? ''}
                      onChange={(value) => updateVideo('startFrame', value)}
                      placeholder="Opening frame: courier at the street corner"
                    />
                    <TextField
                      label="End frame"
                      value={video.endFrame ?? ''}
                      onChange={(value) => updateVideo('endFrame', value)}
                      placeholder="End frame: train doors closing"
                    />
                  </div>
                ) : null}
                {video.mode === 'ingredients' ? (
                  <TextField
                    label="Reference roles"
                    value={video.referenceRoles ?? ''}
                    onChange={(value) => updateVideo('referenceRoles', value)}
                    placeholder="hero=character, lamp=prop, street=location"
                    hint="Use names or roles the destination can understand. The app never uploads files automatically."
                  />
                ) : null}
                {video.mode === 'extend' ? (
                  <TextField
                    label="Previous clip"
                    value={video.previousClip ?? ''}
                    onChange={(value) => updateVideo('previousClip', value)}
                    placeholder="The courier turns the corner and sees the train"
                  />
                ) : null}
                <TextField
                  label="Negative prompt"
                  value={video.negativePrompt ?? ''}
                  onChange={(value) => updateVideo('negativePrompt', value)}
                  placeholder="flicker, extra people, unwanted text"
                />
              </div>
            ) : (
              <div className="space-y-5">
                <TextField
                  label="Song idea / story"
                  value={music.topic}
                  onChange={(value) => updateMusic('topic', value)}
                  inputRef={ideaRef}
                  placeholder="A midnight train carrying someone back home"
                  hint="Suno Custom Mode works best when the idea, style, and lyrics each have a clear job."
                  rows={5}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Lyrics language">
                    <select
                      value={music.language}
                      onChange={(event) => updateMusic('language', event.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none focus:border-fuchsia-400"
                    >
                      <option>English</option>
                      <option>Swedish</option>
                      <option>Spanish</option>
                      <option>French</option>
                      <option>German</option>
                      <option>Italian</option>
                      <option>Portuguese</option>
                      <option>Japanese</option>
                      <option>Korean</option>
                      <option>Arabic</option>
                    </select>
                  </Field>
                  <Field label="Structure">
                    <select
                      value={music.structure}
                      onChange={(event) =>
                        updateMusic(
                          'structure',
                          event.target.value as MusicPromptArtifactInput['structure'],
                        )
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none focus:border-fuchsia-400"
                    >
                      <option>Auto</option>
                      <option>Standard</option>
                      <option>Pop</option>
                      <option>Rap</option>
                      <option>Ambient</option>
                      <option>Custom</option>
                    </select>
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField
                    label="Genre / blend"
                    value={music.genre ?? ''}
                    onChange={(value) => updateMusic('genre', value)}
                    placeholder="synthwave pop, cinematic electronic"
                  />
                  <TextField
                    label="Mood"
                    value={music.mood ?? ''}
                    onChange={(value) => updateMusic('mood', value)}
                    placeholder="hopeful, nocturnal, urgent"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField
                    label="Voice"
                    value={music.voice ?? ''}
                    onChange={(value) => updateMusic('voice', value)}
                    placeholder="Female, intimate, clear"
                  />
                  <TextField
                    label="Tempo"
                    value={music.tempo ?? ''}
                    onChange={(value) => updateMusic('tempo', value)}
                    placeholder="112 BPM"
                  />
                </div>
                <TextField
                  label="Instruments"
                  value={music.instruments ?? ''}
                  onChange={(value) => updateMusic('instruments', value)}
                  placeholder="analog synth, gated drums, warm bass"
                />
                <div className="flex items-start gap-3 rounded-xl border border-slate-700 bg-slate-950/40 p-3 text-sm text-slate-300">
                  <input
                    id="studio-instrumental"
                    type="checkbox"
                    checked={Boolean(music.instrumental)}
                    onChange={(event) => updateMusic('instrumental', event.target.checked)}
                    className="mt-1 accent-fuchsia-400"
                  />
                  <span>
                    <label htmlFor="studio-instrumental" className="block font-semibold text-white">
                      Instrumental mode
                    </label>
                    <span className="mt-1 block text-xs text-slate-500">
                      The output will contain an explicit [Instrumental] marker instead of sung
                      lyrics.
                    </span>
                  </span>
                </div>
                <TextField
                  label="Your lyrics (optional)"
                  value={music.lyrics ?? ''}
                  onChange={(value) => updateMusic('lyrics', value)}
                  placeholder="Paste original lyrics here, or let the compiler draft section-tagged lyrics"
                  rows={8}
                />
                <details className="rounded-xl border border-slate-700 bg-slate-950/30 p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-slate-200">
                    Advanced handoff notes
                  </summary>
                  <div className="mt-4 space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Target profile">
                        <select
                          value={music.targetProfile ?? 'suno-v5.5'}
                          onChange={(event) =>
                            updateMusic(
                              'targetProfile',
                              event.target.value as MusicPromptArtifactInput['targetProfile'],
                            )
                          }
                          className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none focus:border-fuchsia-400"
                        >
                          <option value="suno-v5.5">Suno v5.5</option>
                          <option value="future-compatible">Future-compatible handoff</option>
                        </select>
                      </Field>
                      <Field label="Style influence" hint="Auto keeps the compiler flexible.">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={music.styleInfluence ?? 75}
                          onChange={(event) =>
                            updateMusic('styleInfluence', Number(event.target.value))
                          }
                          className="mt-3 w-full accent-fuchsia-400"
                        />
                        <span className="text-xs text-slate-500">
                          {music.styleInfluence === null || music.styleInfluence === undefined
                            ? 'Auto'
                            : `${music.styleInfluence}%`}
                        </span>
                      </Field>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <TextField
                        label="Key"
                        value={music.key ?? ''}
                        onChange={(value) => updateMusic('key', value)}
                        placeholder="A minor"
                      />
                      <TextField
                        label="Time signature"
                        value={music.timeSignature ?? ''}
                        onChange={(value) => updateMusic('timeSignature', value)}
                        placeholder="4/4"
                      />
                      <TextField
                        label="Energy curve"
                        value={music.energyCurve ?? ''}
                        onChange={(value) => updateMusic('energyCurve', value)}
                        placeholder="Build to a wide chorus"
                      />
                      <TextField
                        label="Vocal range"
                        value={music.vocalRange ?? ''}
                        onChange={(value) => updateMusic('vocalRange', value)}
                        placeholder="Alto, intimate and clear"
                      />
                    </div>
                    <TextField
                      label="Voice notes"
                      value={music.voiceNotes ?? ''}
                      onChange={(value) => updateMusic('voiceNotes', value)}
                      placeholder="Breathy but present, no artist imitation"
                    />
                    <TextField
                      label="Custom model notes"
                      value={music.customModelNotes ?? ''}
                      onChange={(value) => updateMusic('customModelNotes', value)}
                      placeholder="Optional notes for your own Suno v5.5 model"
                    />
                    <TextField
                      label="Persona notes"
                      value={music.personaNotes ?? ''}
                      onChange={(value) => updateMusic('personaNotes', value)}
                      placeholder="Optional persona or vocal texture notes"
                    />
                    <TextField
                      label="My Taste guidance"
                      value={music.tasteGuidance ?? ''}
                      onChange={(value) => updateMusic('tasteGuidance', value)}
                      placeholder="Keep the hook direct and the verses concrete"
                    />
                    <TextField
                      label="Mix notes"
                      value={music.mixNotes ?? ''}
                      onChange={(value) => updateMusic('mixNotes', value)}
                      placeholder="Warm low end, clear vocal, controlled reverb"
                    />
                    <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Rights and consent
                      </p>
                      {[
                        ['ownsOrLicensedLyrics', 'I own or licensed the lyrics'],
                        ['hasVoiceConsent', 'I have consent for voice references'],
                        ['hasTrainingReferenceRights', 'I have rights for custom-model references'],
                        ['avoidsArtistImitation', 'Avoid real-artist imitation'],
                      ].map(([key, label]) => (
                        <label key={key} className="flex items-start gap-2 text-xs text-slate-400">
                          <input
                            type="checkbox"
                            checked={Boolean(
                              music.rightsChecklist?.[
                                key as keyof NonNullable<
                                  MusicPromptArtifactInput['rightsChecklist']
                                >
                              ],
                            )}
                            onChange={(event) =>
                              updateMusic('rightsChecklist', {
                                ownsOrLicensedLyrics: false,
                                hasVoiceConsent: false,
                                hasTrainingReferenceRights: false,
                                avoidsArtistImitation: true,
                                ...music.rightsChecklist,
                                [key]: event.target.checked,
                              })
                            }
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>
                </details>
              </div>
            )}

            <div className="mt-7 flex flex-wrap gap-3 border-t border-slate-800 pt-6">
              <button
                type="button"
                onClick={buildLocal}
                className={`rounded-xl px-4 py-3 text-sm font-bold text-slate-950 ${mode === 'video' ? 'bg-cyan-300 hover:bg-cyan-200' : 'bg-fuchsia-300 hover:bg-fuchsia-200'}`}
              >
                {t('build')}
              </button>
              <button
                type="button"
                onClick={() => void optimize()}
                disabled={isOptimizing}
                className="rounded-xl border border-slate-600 px-4 py-3 text-sm font-semibold text-slate-200 hover:border-slate-400 hover:text-white disabled:cursor-wait disabled:opacity-50"
              >
                {isOptimizing ? t('enhancing') : t('enhance')}
              </button>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              Copy is always available locally. AI enhancement is optional and never submits a paid
              media generation.
            </p>
          </section>

          <section className="space-y-5">
            {!artifact ? (
              <div className="flex min-h-[520px] flex-col justify-between rounded-3xl border border-dashed border-slate-700 bg-slate-900/30 p-6 sm:p-8">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">
                    02 / Handoff
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">
                    Your copy desk is empty
                  </h2>
                  <p className="mt-3 max-w-lg text-sm leading-relaxed text-slate-400">
                    Build a local pack to get a recommended prompt plus two alternatives. The result
                    stays editable and copyable before you decide whether to open the production
                    workflow.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <span className="text-2xl text-cyan-300">01</span>
                    <p className="mt-2 text-xs text-slate-400">One clear primary handoff</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <span className="text-2xl text-fuchsia-300">02</span>
                    <p className="mt-2 text-xs text-slate-400">Two useful alternatives</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <span className="text-2xl text-amber-200">∞</span>
                    <p className="mt-2 text-xs text-slate-400">No automatic external send</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 sm:p-7">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">
                        02 / Handoff
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold text-white">
                        {artifact.kind === 'video'
                          ? 'Flow/Veo copy desk'
                          : 'Suno Custom Mode handoff'}
                      </h2>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <p>{t('primaryAlternatives')}</p>
                      <p className="mt-1">
                        {artifact.provenance.source === 'optimizer'
                          ? `Polished with ${artifact.provenance.provider}`
                          : t('compiledLocally')}
                      </p>
                    </div>
                  </div>
                  <div className="mt-5">
                    <ValidationRail artifact={artifact} />
                  </div>
                </div>
                {artifact.kind === 'video' ? (
                  <>
                    <VideoVariantCard
                      variant={artifact.primary as VideoPromptVariant}
                      primary
                      onCopy={(text, label) => void copy(text, label)}
                      onHandoff={() => void createHandoff('production')}
                    />
                    {artifact.alternatives.map((variant) => (
                      <VideoVariantCard
                        key={variant.label}
                        variant={variant as VideoPromptVariant}
                        onCopy={(text, label) => void copy(text, label)}
                      />
                    ))}
                  </>
                ) : (
                  <>
                    <MusicVariantCard
                      variant={artifact.primary as MusicPromptVariant}
                      primary
                      onCopy={(text, label) => void copy(text, label)}
                      onLyricsChange={(lyrics) =>
                        setArtifact({
                          ...artifact,
                          primary: withMusicLyrics(artifact.primary as MusicPromptVariant, lyrics),
                        })
                      }
                    />
                    {artifact.alternatives.map((variant) => (
                      <MusicVariantCard
                        key={variant.label}
                        variant={variant as MusicPromptVariant}
                        onCopy={(text, label) => void copy(text, label)}
                      />
                    ))}
                    <div className="rounded-3xl border border-fuchsia-400/30 bg-fuchsia-400/[0.04] p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-fuchsia-300">
                            Lyric tools
                          </p>
                          <h3 className="mt-1 text-lg font-semibold text-white">
                            Revise without losing the song
                          </h3>
                        </div>
                        <span className="text-xs text-slate-500">Primary lyrics only</span>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-[0.7fr_1fr]">
                        <Field label="Section">
                          <select
                            value={selectedSection}
                            onChange={(event) => setSelectedSection(event.target.value)}
                            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-slate-100"
                          >
                            {(lyricSections.length ? lyricSections : ['[Chorus]']).map(
                              (section) => (
                                <option key={section}>{section}</option>
                              ),
                            )}
                          </select>
                        </Field>
                        <TextField
                          label="Direction"
                          value={rewriteRequest}
                          onChange={setRewriteRequest}
                          placeholder="Make the hook more direct"
                        />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={rewriteSection}
                          className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-slate-500"
                        >
                          Rewrite section
                        </button>
                        <button
                          type="button"
                          onClick={improveHook}
                          className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-slate-500"
                        >
                          Improve hook
                        </button>
                        <button
                          type="button"
                          onClick={extendLyrics}
                          className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-slate-500"
                        >
                          Extend lyrics
                        </button>
                        <button
                          type="button"
                          onClick={shortenCurrentLyrics}
                          className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-slate-500"
                        >
                          Shorten lyrics
                        </button>
                        <button
                          type="button"
                          onClick={regenerateCurrentLyrics}
                          className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-slate-500"
                        >
                          Regenerate lyrics
                        </button>
                        {selectedSection ? (
                          <button
                            type="button"
                            onClick={() =>
                              setLockedSections((current) =>
                                current.includes(selectedSection)
                                  ? current.filter((section) => section !== selectedSection)
                                  : [...current, selectedSection],
                              )
                            }
                            className={`rounded-lg border px-3 py-2 text-xs font-semibold ${lockedSections.includes(selectedSection) ? 'border-amber-300/50 text-amber-200' : 'border-slate-700 text-slate-400'}`}
                          >
                            {lockedSections.includes(selectedSection)
                              ? 'Unlock section'
                              : 'Lock section'}
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => void createHandoff('lyria')}
                        className="rounded-xl border border-amber-300/50 px-4 py-3 text-sm font-semibold text-amber-200 hover:bg-amber-300/10"
                      >
                        Create Lyria draft
                      </button>
                      <button
                        type="button"
                        onClick={() => void openSuno()}
                        className="rounded-xl bg-fuchsia-300 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-fuchsia-200"
                      >
                        {t('copyOpenSuno')}
                      </button>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-500">
                      Suno receives nothing automatically. Copy the Style and Lyrics fields into
                      Custom Mode yourself, then choose the account features you want.
                    </p>
                    <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.04] p-4 text-xs leading-relaxed text-slate-400">
                      <p className="font-semibold uppercase tracking-[0.16em] text-amber-200">
                        Lyria handoff difference
                      </p>
                      <p className="mt-2">
                        Lyria receives a local production draft for separate approval. Suno section
                        tags, Custom Model, My Taste, and voice notes stay as manual handoff notes;
                        no provider request or cost starts here.
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
