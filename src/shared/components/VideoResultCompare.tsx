import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { diffService } from '@core/services/diffService';
import { ErrorBoundary } from '@shared/components/ErrorBoundary';

export interface VideoComparisonResult {
  id: string;
  label: string;
  src: string;
  prompt: string;
  negativePrompt: string;
  settings: string;
  comparisonNotes?: string;
}

interface VideoResultCompareProps {
  contextId: string;
  results: VideoComparisonResult[];
  disabled?: boolean;
  onSaveNotes?: (id: string, notes: string) => Promise<void>;
  renderDetails?: (
    result: VideoComparisonResult,
    actions: { notes: string; seek: (seconds: number) => void },
  ) => ReactNode;
}

function SourceDifference({
  left,
  right,
}: {
  left: VideoComparisonResult;
  right: VideoComparisonResult;
}) {
  const { t } = useTranslation('studio');
  const differences = useMemo(
    () =>
      (['prompt', 'negativePrompt', 'settings'] as const).map((field) => ({
        field,
        diff: diffService.compareText(left[field], right[field]),
      })),
    [left, right],
  );
  return (
    <div className="space-y-3">
      {differences.map(({ field, diff }) => (
        <section key={field}>
          <h4 className="text-sm font-semibold">
            {t(`comparison.${field}`, {
              defaultValue:
                field === 'negativePrompt'
                  ? 'Negative prompt'
                  : field === 'settings'
                    ? 'Settings'
                    : 'Prompt',
            })}
            {' · '}
            {t(diff.original === diff.modified ? 'comparison.unchanged' : 'comparison.changed', {
              defaultValue: diff.original === diff.modified ? 'Unchanged' : 'Changed',
            })}
          </h4>
          <pre className="overflow-auto whitespace-pre-wrap text-xs">
            {diff.changes.map((change, index) => (
              <span key={index} className="block">
                {change.type === 'modify'
                  ? `− A: ${change.originalContent}\n+ B: ${change.content}`
                  : `${change.type === 'add' ? '+ B: ' : change.type === 'remove' ? '− A: ' : '  '}${change.content}`}
              </span>
            ))}
          </pre>
        </section>
      ))}
    </div>
  );
}

/** Owns playback only. Domain adapters retain all content-bound review and acceptance rules. */
export function VideoResultCompare(props: VideoResultCompareProps) {
  return (
    <ErrorBoundary key={props.contextId} panelId="video-comparison">
      <VideoComparisonSession key={props.contextId} {...props} />
    </ErrorBoundary>
  );
}

function formatTimecode(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00.00';
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(2).padStart(5, '0');
  return `${String(mins).padStart(2, '0')}:${secs}`;
}

function VideoComparisonSession({
  results,
  disabled = false,
  onSaveNotes,
  renderDetails,
}: VideoResultCompareProps) {
  const { t } = useTranslation('studio');
  const [leftId, setLeftId] = useState(results.at(-2)?.id ?? results[0]?.id ?? '');
  const [rightId, setRightId] = useState(results.at(-1)?.id ?? '');
  const [audio, setAudio] = useState<'A' | 'B'>('A');
  const [durations, setDurations] = useState<Record<string, number>>({});
  const [position, setPosition] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [loop, setLoop] = useState(false);
  const [playingSource, setPlayingSource] = useState<string | null>(null);
  const [playbackError, setPlaybackError] = useState('');
  const [showDiff, setShowDiff] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saves, setSaves] = useState<
    Record<string, { status: 'saving' | 'saved' | 'error'; value: string; error?: string }>
  >({});
  const videos = useRef<Partial<Record<'A' | 'B', HTMLVideoElement>>>({});
  const containerRef = useRef<HTMLElement>(null);
  const generation = useRef(0);
  const savingIds = useRef(new Set<string>());
  const left = results.find((result) => result.id === leftId) ?? results[0];
  const alternatives = results.filter((result) => result.id !== left?.id);
  const right = alternatives.find((result) => result.id === rightId) ?? alternatives.at(-1);
  const identity = `${left?.id}:${left?.src}|${right?.id}:${right?.src}`;
  const active = [left, right].filter((result): result is VideoComparisonResult => Boolean(result));
  const mediaKey = (result: VideoComparisonResult) => `${result.id}:${result.src}`;
  const ready = active.length > 0 && active.every((result) => durations[mediaKey(result)] > 0);
  const limit = ready ? Math.min(...active.map((result) => durations[mediaKey(result)])) : 0;
  const playing = playingSource === identity;

  const pause = useCallback(() => {
    generation.current += 1;
    for (const video of Object.values(videos.current)) video?.pause();
    setPlayingSource(null);
  }, []);

  useEffect(() => {
    const currentVideos = Object.values(videos.current);
    return () => {
      generation.current += 1;
      for (const video of currentVideos) video?.pause();
    };
  }, [identity]);

  const seek = (seconds: number) => {
    if (!ready || !Number.isFinite(seconds)) return;
    const next = Math.min(limit, Math.max(0, seconds));
    try {
      for (const video of Object.values(videos.current)) if (video) video.currentTime = next;
      setPosition(next);
    } catch {
      pause();
      setPlaybackError(
        t('comparison.playbackFailed', {
          defaultValue: 'Playback failed. Check that both local videos are available.',
        }),
      );
    }
  };

  const play = async () => {
    if (!ready) return;
    const token = ++generation.current;
    setPlaybackError('');
    if ((videos.current.A?.currentTime ?? 0) >= limit) seek(0);
    else seek(videos.current.A?.currentTime ?? 0);
    try {
      await Promise.all(Object.values(videos.current).map((video) => video?.play()));
      if (token === generation.current) setPlayingSource(identity);
    } catch {
      if (token !== generation.current) return;
      pause();
      setPlaybackError(
        t('comparison.playbackFailed', {
          defaultValue: 'Playback failed. Check that both local videos are available.',
        }),
      );
    }
  };

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (!containerRef.current?.contains(document.activeElement)) return;
      const targetTag = (event.target as HTMLElement).tagName?.toLowerCase();
      if (['input', 'textarea', 'select'].includes(targetTag)) return;
      if (event.key === ' ' || event.code === 'Space') {
        event.preventDefault();
        if (playing) pause();
        else void play();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        seek(position - 1 / 30);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        seek(position + 1 / 30);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  const saveNotes = async (result: VideoComparisonResult) => {
    if (!onSaveNotes || disabled || savingIds.current.has(result.id)) return;
    const value = drafts[result.id] ?? result.comparisonNotes ?? '';
    savingIds.current.add(result.id);
    setSaves((current) => ({ ...current, [result.id]: { status: 'saving', value } }));
    try {
      await onSaveNotes(result.id, value);
      setSaves((current) => ({ ...current, [result.id]: { status: 'saved', value } }));
    } catch (error) {
      setSaves((current) => ({
        ...current,
        [result.id]: {
          status: 'error',
          value,
          error: error instanceof Error ? error.message : String(error),
        },
      }));
    } finally {
      savingIds.current.delete(result.id);
    }
  };

  const pane = (side: 'A' | 'B', result: VideoComparisonResult) => {
    const notes = drafts[result.id] ?? result.comparisonNotes ?? '';
    const timestamps = Array.from(
      new Set([...notes.matchAll(/@(\d+(?:\.\d+)?)s\b/gi)].map((match) => Number(match[1]))),
    ).filter((sec) => Number.isFinite(sec) && sec >= 0);
    const save = saves[result.id];
    const noteStatus =
      save?.status === 'saving'
        ? 'saving'
        : save?.status === 'error'
          ? 'error'
          : notes === (save?.value ?? result.comparisonNotes ?? '')
            ? 'saved'
            : 'unsaved';
    return (
      <article className="min-w-0 space-y-3 rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] p-3">
        <label className="flex items-center gap-2 text-sm">
          {t('comparison.result', { side, defaultValue: 'Result {{side}}' })}
          <select
            aria-label={t('comparison.result', { side, defaultValue: 'Result {{side}}' })}
            value={result.id}
            onChange={(event) => {
              pause();
              setPlaybackError('');
              setPosition(0);
              if (side === 'A') setLeftId(event.target.value);
              else setRightId(event.target.value);
            }}
            className="min-w-0 rounded border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] p-1"
          >
            {(side === 'A' ? results : alternatives).map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <video
          key={result.src}
          ref={(element) => {
            if (element) {
              videos.current[side] = element;
              if (
                position > 0 &&
                element.currentTime === 0 &&
                Number.isFinite(element.duration) &&
                element.duration > 0
              ) {
                try {
                  element.currentTime = Math.min(position, element.duration);
                } catch {
                  // Ignore if media element cannot seek before metadata is complete
                }
              }
            } else delete videos.current[side];
          }}
          src={result.src}
          aria-label={result.label}
          preload="metadata"
          controls={!right}
          muted={side !== audio}
          className="aspect-video w-full rounded bg-black"
          onLoadedMetadata={(event) => {
            const duration = event.currentTarget.duration;
            if (Number.isFinite(duration) && duration > 0) {
              if (position > 0 && event.currentTarget.currentTime === 0) {
                try {
                  event.currentTarget.currentTime = Math.min(position, duration);
                } catch {
                  // Ignore if unseekable
                }
              }
              setDurations((current) => ({ ...current, [mediaKey(result)]: duration }));
            } else {
              pause();
              setPlaybackError(
                t('comparison.playbackFailed', {
                  defaultValue: 'Playback failed. Check that both local videos are available.',
                }),
              );
            }
          }}
          onTimeUpdate={(event) => {
            if (side !== 'A' || !ready || isScrubbing) return;
            const time = event.currentTarget.currentTime;
            setPosition(Math.min(time, limit));
            if (time >= limit) {
              if (loop) {
                seek(0);
                void Promise.all(Object.values(videos.current).map((video) => video?.play()));
              } else {
                pause();
                seek(limit);
              }
            } else if (
              right &&
              videos.current.B &&
              Math.abs(videos.current.B.currentTime - time) > 0.15
            ) {
              videos.current.B.currentTime = time;
            }
          }}
          onEnded={() => {
            if (loop) {
              seek(0);
              void Promise.all(Object.values(videos.current).map((video) => video?.play()));
            } else {
              pause();
              seek(limit);
            }
          }}
          onPlay={() => {
            if (!right) setPlayingSource(identity);
          }}
          onPause={() => {
            if (!right) setPlayingSource(null);
          }}
          onWaiting={() => {
            if (playing) {
              pause();
              setPlaybackError(
                t('comparison.buffering', {
                  defaultValue:
                    'Playback paused while a clip buffers. Try Play again when it is ready.',
                }),
              );
            }
          }}
          onError={() => {
            pause();
            setPlaybackError(
              t('comparison.playbackFailed', {
                defaultValue: 'Playback failed. Check that both local videos are available.',
              }),
            );
          }}
        >
          <track kind="captions" />
        </video>
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <label htmlFor={`comparison-notes-${side}`}>
              {t('comparison.notes', { defaultValue: 'Comparison notes' })} · {side}
            </label>
            <button
              type="button"
              disabled={disabled || !ready}
              onClick={() => {
                const stamp = `@${position.toFixed(1)}s`;
                setDrafts((current) => {
                  const existing = current[result.id] ?? result.comparisonNotes ?? '';
                  const separator = existing && !/\s$/.test(existing) ? ' ' : '';
                  return { ...current, [result.id]: `${existing}${separator}${stamp} ` };
                });
              }}
              className="rounded border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-2 py-0.5 font-mono text-xs disabled:opacity-50"
            >
              {t('comparison.insertTimestamp', {
                defaultValue: '+ @{{time}}s',
                time: position.toFixed(1),
              })}
            </button>
          </div>
          <textarea
            id={`comparison-notes-${side}`}
            aria-label={`${t('comparison.notes', { defaultValue: 'Comparison notes' })} · ${side}`}
            value={notes}
            disabled={disabled}
            onChange={(event) => {
              const value = event.target.value;
              setDrafts((current) => ({ ...current, [result.id]: value }));
            }}
            className="block min-h-20 w-full rounded border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] p-2 text-sm"
          />
          {timestamps.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-xs">
              {timestamps.map((sec) => (
                <button
                  key={sec}
                  type="button"
                  disabled={!ready}
                  onClick={() => seek(sec)}
                  className="rounded border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-2 py-0.5 font-mono text-xs underline disabled:opacity-50"
                >
                  @{sec.toFixed(1)}s
                </button>
              ))}
            </div>
          )}
        </div>
        {onSaveNotes && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <button
              type="button"
              disabled={disabled || save?.status === 'saving' || noteStatus === 'saved'}
              onClick={() => void saveNotes(result)}
              className="rounded border border-[var(--color-border-primary)] px-3 py-1 disabled:opacity-50"
            >
              {t('comparison.saveNotes', { defaultValue: 'Save notes' })}
            </button>
            {noteStatus === 'error' ? (
              <p role="alert">
                {t('comparison.saveFailed', { defaultValue: 'Notes were not saved.' })}{' '}
                {save?.error}
              </p>
            ) : (
              <p role="status">
                {t(`comparison.${noteStatus}`, {
                  defaultValue:
                    noteStatus === 'saving'
                      ? 'Saving…'
                      : noteStatus === 'saved'
                        ? 'Saved'
                        : 'Not saved',
                })}
              </p>
            )}
          </div>
        )}
        {renderDetails?.(result, { notes, seek })}
      </article>
    );
  };

  if (!left) return null;

  return (
    <section
      ref={containerRef}
      tabIndex={0}
      aria-label={t('comparison.title', { defaultValue: 'Video comparison' })}
      className="space-y-3 text-[var(--color-text-primary)] focus:outline-none"
    >
      <div className="creator-compare-toolbar flex flex-wrap items-center gap-2.5 rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm">
        <button
          type="button"
          disabled={!ready}
          onClick={() => (playing ? pause() : void play())}
          className="rounded border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-3 py-1 font-medium disabled:opacity-50"
        >
          {t(playing ? 'comparison.pause' : 'comparison.play', {
            defaultValue: playing ? 'Pause' : 'Play',
          })}
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={!ready}
            aria-label={t('comparison.stepBack', { defaultValue: 'Previous frame' })}
            onClick={() => seek(position - 1 / 30)}
            className="rounded border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-2 py-1 font-mono text-xs disabled:opacity-50"
          >
            -1f
          </button>
          <button
            type="button"
            disabled={!ready}
            aria-label={t('comparison.stepForward', { defaultValue: 'Next frame' })}
            onClick={() => seek(position + 1 / 30)}
            className="rounded border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-2 py-1 font-mono text-xs disabled:opacity-50"
          >
            +1f
          </button>
        </div>
        {right && (
          <button
            type="button"
            disabled={!ready || disabled}
            onClick={() => {
              pause();
              const currentLeft = left.id;
              const currentRight = right.id;
              setLeftId(currentRight);
              setRightId(currentLeft);
              setAudio((cur) => (cur === 'A' ? 'B' : 'A'));
            }}
            className="rounded border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-3 py-1 disabled:opacity-50"
          >
            {t('comparison.swap', { defaultValue: 'Swap A/B' })}
          </button>
        )}
        <label className="flex items-center gap-2">
          {t('comparison.seek', { defaultValue: 'Comparison position' })}
          <input
            type="range"
            min={0}
            max={limit}
            step={0.01}
            value={Math.min(position, limit)}
            disabled={!ready}
            onPointerDown={() => setIsScrubbing(true)}
            onPointerUp={() => setIsScrubbing(false)}
            onChange={(event) => seek(Number(event.target.value))}
          />
        </label>
        <span
          data-testid="comparison-timecode"
          className="rounded border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-2 py-1 font-mono text-xs tabular-nums"
        >
          {formatTimecode(Math.min(position, limit))} / {formatTimecode(limit)}
        </span>
        <label className="flex items-center gap-1.5 text-xs">
          <input
            type="checkbox"
            checked={loop}
            disabled={!ready}
            onChange={(event) => setLoop(event.target.checked)}
          />
          {t('comparison.loop', { defaultValue: 'Loop' })}
        </label>
        {right && (
          <label className="flex items-center gap-2">
            {t('comparison.audio', { defaultValue: 'Listen to' })}
            <select
              aria-label={t('comparison.audio', { defaultValue: 'Listen to' })}
              value={audio}
              onChange={(event) => setAudio(event.target.value as 'A' | 'B')}
              className="rounded border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] p-1"
            >
              <option value="A">A</option>
              <option value="B">B</option>
            </select>
          </label>
        )}
      </div>
      {!ready && (
        <p role="status">
          {t('comparison.metadataPending', {
            defaultValue: 'Waiting for video metadata before synchronized playback.',
          })}
        </p>
      )}
      {playbackError && <p role="alert">{playbackError}</p>}
      <div className={`grid gap-3 ${right ? 'lg:grid-cols-2' : ''}`}>
        {pane('A', left)}
        {right && pane('B', right)}
      </div>
      {right && (
        <details onToggle={(event) => setShowDiff(event.currentTarget.open)}>
          <summary className="cursor-pointer text-sm font-semibold">
            {t('comparison.sourceDiff', { defaultValue: 'Compare frozen prompts and settings' })}
          </summary>
          {showDiff && <SourceDifference left={left} right={right} />}
        </details>
      )}
    </section>
  );
}
