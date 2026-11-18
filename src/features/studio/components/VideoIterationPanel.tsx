import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import type {
  VideoIterationMode,
  VideoIterationResolution,
  VideoIterationSession,
  VideoIterationSettings,
} from '@core/types/videoIteration';
import { ROUTES } from '@core/config/routes';
import { videoIterationService } from '@core/services/videoIterationService';
import { videoVersionService } from '@core/services/videoVersionService';
import { CreativeAssistantDrawer } from './CreativeAssistantDrawer';
import { VideoResultCompare } from '@shared/components/VideoResultCompare';
import { useAppStore } from '@core/store/useAppStore';

export interface VideoIterationPanelProps {
  initialSession: VideoIterationSession;
  idea: string;
  cameraDirection?: string;
  lightingStyle?: string;
  onSessionUpdated?: (session: VideoIterationSession) => void;
  disabled?: boolean;
}

export const VideoIterationPanel: React.FC<VideoIterationPanelProps> = ({
  initialSession,
  idea,
  cameraDirection,
  lightingStyle,
  onSessionUpdated,
  disabled = false,
}) => {
  const { t } = useTranslation('studio');
  const navigate = useNavigate();
  const [session, setSession] = useState<VideoIterationSession>(initialSession);
  const [instruction, setInstruction] = useState('');
  const [mode, setMode] = useState<VideoIterationMode>('edit');
  const [keepAudio, setKeepAudio] = useState<boolean>(true);
  const [durationSeconds, setDurationSeconds] = useState<number>(8);
  const [resolution, setResolution] = useState<VideoIterationResolution>('720p');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [hasSentToTimeline, setHasSentToTimeline] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [compareTurnAId, setCompareTurnAId] = useState<string>('');
  const [compareTurnBId, setCompareTurnBId] = useState<string>('');

  const instructionId = useId();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const shots = useAppStore((s) => s.sbShots ?? []);
  const [selectedShotId, setSelectedShotId] = useState<number>(() =>
    shots.length > 0 ? shots[0].id : -1,
  );

  useEffect(() => {
    setSession(initialSession);
  }, [initialSession]);

  useEffect(() => {
    if (shots.length === 0 && selectedShotId > 0) {
      setSelectedShotId(-1);
    } else if (
      shots.length > 0 &&
      selectedShotId !== -1 &&
      !shots.some((s) => s.id === selectedShotId)
    ) {
      setSelectedShotId(shots[0].id);
    }
  }, [shots, selectedShotId]);

  // Release hardware video decoder buffers on unmount (Wayland/VAAPI hygiene)
  useEffect(() => {
    const videoEl = videoRef.current;
    return () => {
      if (videoEl) {
        videoEl.pause();
        videoEl.removeAttribute('src');
        if (typeof navigator === 'undefined' || !/jsdom/i.test(navigator.userAgent)) {
          videoEl.load();
        }
      }
    };
  }, []);

  const activeTurn = useMemo(() => {
    return session.turns.find((t) => t.id === session.activeTurnId) ?? session.turns[0];
  }, [session]);

  const nextVersionNumber = useMemo(() => {
    return Math.max(0, ...session.turns.map((turn) => turn.version)) + 1;
  }, [session.turns]);

  useEffect(() => {
    if (!activeTurn) return;
    const defaultParent =
      session.turns.find((t) => t.id === activeTurn.parentId) ?? session.turns[0];
    setCompareTurnAId(defaultParent?.id ?? '');
    setCompareTurnBId(activeTurn.id);
  }, [activeTurn, session.turns]);

  const availableDurations = useMemo(
    () =>
      mode === 'extend' ? [3, 4, 5, 6, 7, 8, 9, 10] : [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    [mode],
  );

  const handleModeChange = (nextMode: VideoIterationMode) => {
    setMode(nextMode);
    if (nextMode === 'extend' && durationSeconds > 10) {
      setDurationSeconds(10);
    }
  };

  const costEstimate = useMemo(() => {
    return videoIterationService.estimateIterationCost({
      durationSeconds,
      resolution,
      mode,
      keepAudio,
      modelId: 'gemini-omni-1.2-flash',
    });
  }, [durationSeconds, resolution, mode, keepAudio]);

  const neighboringShotSummary = useMemo(() => {
    if (shots.length === 0) return undefined;
    const targetShot = shots.find((s) => s.id === selectedShotId) ?? shots[0];
    if (!targetShot?.action?.trim()) return undefined;
    return `Scene ${targetShot.id}: ${targetShot.action}`;
  }, [shots, selectedShotId]);

  const handleSwitchVersion = async (turnId: string) => {
    try {
      const updated = await videoVersionService.switchActiveVersion(session, turnId);
      setSession(updated);
      onSessionUpdated?.(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to switch version.');
    }
  };

  const handleGenerateIteration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instruction.trim()) {
      setError(
        t('videoIteration.instructionPlaceholder', {
          defaultValue: 'Describe desired changes.',
        }),
      );
      return;
    }

    setIsGenerating(true);
    setError(null);
    setStatusMessage(null);

    try {
      const settings: Partial<VideoIterationSettings> = {
        durationSeconds,
        resolution,
        aspectRatio: activeTurn.settings.aspectRatio,
        modelId: 'gemini-omni-1.2-flash',
        mode,
        keepAudio,
      };

      const result = await videoIterationService.iterateVideo({
        session,
        projectId: session.projectId,
        artifactId: session.artifactId,
        variantIndex: session.variantIndex,
        parentTurnId: activeTurn.id,
        instruction,
        settings,
      });

      setSession(result.session);
      setInstruction('');
      onSessionUpdated?.(result.session);
      setStatusMessage(
        t('videoIteration.versionGenerated', {
          version: result.turn.version,
          defaultValue: `Version ${result.turn.version} generated successfully.`,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Iteration generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendToTimeline = () => {
    if (!activeTurn) return;
    const targetId = shots.length === 0 ? -1 : selectedShotId;
    const success = videoVersionService.applyVersionToStoryboardShot(targetId, activeTurn);
    if (success) {
      setHasSentToTimeline(true);
      setStatusMessage(
        targetId <= 0
          ? t('videoIteration.appliedToNewScene', {
              version: activeTurn.version,
              defaultValue: `Version ${activeTurn.version} added as a new storyboard scene and synced to Timeline.`,
            })
          : t('videoIteration.appliedToTimeline', {
              version: activeTurn.version,
              scene: targetId,
              defaultValue: `Version ${activeTurn.version} sent to storyboard scene ${targetId}.`,
            }),
      );
    }
  };

  const comparisonResults = useMemo(() => {
    if (!isComparing) return [];
    const parentTurn = session.turns.find((t) => t.id === activeTurn.parentId) ?? session.turns[0];
    return videoVersionService.prepareComparison(
      session,
      compareTurnAId || parentTurn.id,
      compareTurnBId || activeTurn.id,
    );
  }, [isComparing, session, activeTurn, compareTurnAId, compareTurnBId]);

  const comparedTurns = useMemo(() => {
    const turnA = session.turns.find((t) => t.id === compareTurnAId) ?? session.turns[0];
    const turnB = session.turns.find((t) => t.id === compareTurnBId) ?? activeTurn;
    return { turnA, turnB };
  }, [session.turns, compareTurnAId, compareTurnBId, activeTurn]);

  return (
    <div className="space-y-4 rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] p-4 shadow-md">
      {/* Header and Version History Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-primary)] pb-3">
        <div>
          <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
            🎬 {t('videoIteration.title', { defaultValue: 'AI Video Iteration' })}
          </h3>
          <p className="text-xs text-[var(--color-text-secondary)]">
            {t('videoIteration.historyCount', {
              count: session.turns.length,
              defaultValue: `Iteration history: ${session.turns.length} versions`,
            })}
          </p>
        </div>

        {/* Version Pills */}
        <div
          className="flex flex-wrap items-center gap-1.5"
          role="tablist"
          aria-label={t('videoIteration.history', { defaultValue: 'Version history' })}
        >
          {session.turns.map((turn) => {
            const isActive = turn.id === activeTurn.id;
            const showLineage =
              turn.version > 1 &&
              typeof turn.parentVersion === 'number' &&
              turn.parentVersion !== turn.version - 1;
            return (
              <button
                key={turn.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => void handleSwitchVersion(turn.id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:bg-slate-700 hover:text-white'
                }`}
                title={turn.instruction}
              >
                v{turn.version}
                {turn.version === 1
                  ? ` (${t('videoIteration.original', { defaultValue: 'Original' })})`
                  : showLineage
                    ? ` (← v${turn.parentVersion})`
                    : ''}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Version Player and Info */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          {activeTurn.assetUrl ? (
            <video
              ref={videoRef}
              controls
              src={activeTurn.assetUrl}
              className="w-full rounded-lg bg-black aspect-video object-contain"
              aria-label={`Video version ${activeTurn.version}`}
            >
              <track kind="captions" />
            </video>
          ) : (
            <div className="flex h-48 w-full items-center justify-center rounded-lg bg-slate-900 text-slate-500">
              {t('videoIteration.noMedia', { defaultValue: 'No media available' })}
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)] px-1">
            <span>
              <strong>v{activeTurn.version}:</strong> {activeTurn.instruction}
            </span>
            <span>
              {activeTurn.settings.resolution} · {activeTurn.settings.durationSeconds}s
            </span>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            {session.turns.length > 1 && (
              <button
                type="button"
                onClick={() => setIsComparing((prev) => !prev)}
                className="rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-primary)] hover:bg-slate-700"
              >
                ⚖️ {t('videoIteration.compareButton', { defaultValue: 'Compare versions (A/B)' })}
              </button>
            )}

            <div className="flex flex-wrap items-center gap-1.5 ml-auto">
              <select
                value={selectedShotId}
                onChange={(e) => setSelectedShotId(Number(e.target.value))}
                aria-label={t('externalResults.scene', { defaultValue: 'Scene' })}
                className="rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] px-2 py-1 text-xs text-[var(--color-text-primary)]"
              >
                <option value={-1}>
                  + {t('externalResults.newScene', { defaultValue: 'Create a new scene' })}
                </option>
                {shots.map((shot) => (
                  <option key={shot.id} value={shot.id}>
                    {t('videoIteration.sceneOption', {
                      id: shot.id,
                      action: shot.action.slice(0, 20),
                      defaultValue: `Scene ${shot.id} (${shot.action.slice(0, 20)}...)`,
                    })}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleSendToTimeline}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500"
              >
                🎬 {t('videoIteration.sendToTimeline', { defaultValue: 'Send to Timeline' })}
              </button>
              {hasSentToTimeline && (
                <button
                  type="button"
                  onClick={() => navigate(ROUTES.TIMELINE)}
                  className="rounded-lg border border-emerald-500/40 bg-emerald-950/30 px-2.5 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-900/40"
                >
                  ↗ {t('videoIteration.openTimeline', { defaultValue: 'Open Timeline' })}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Iteration Prompt Form */}
        <form onSubmit={handleGenerateIteration} className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label
              htmlFor={instructionId}
              className="block text-xs font-semibold text-[var(--color-text-primary)]"
            >
              {t('videoIteration.instructionLabel', {
                defaultValue: 'Describe what to change with AI',
              })}
              :
            </label>
            <div className="flex items-center gap-1 rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] p-0.5 text-[11px]">
              <button
                type="button"
                disabled={disabled || isGenerating}
                onClick={() => handleModeChange('edit')}
                aria-pressed={mode === 'edit'}
                className={`rounded px-2 py-0.5 font-medium transition-colors ${
                  mode === 'edit'
                    ? 'bg-blue-600 text-white'
                    : 'text-[var(--color-text-secondary)] hover:text-white'
                }`}
              >
                {t('videoIteration.modeEdit', { defaultValue: 'Edit clip (3–15s)' })}
              </button>
              <button
                type="button"
                disabled={disabled || isGenerating}
                onClick={() => handleModeChange('extend')}
                aria-pressed={mode === 'extend'}
                className={`rounded px-2 py-0.5 font-medium transition-colors ${
                  mode === 'extend'
                    ? 'bg-blue-600 text-white'
                    : 'text-[var(--color-text-secondary)] hover:text-white'
                }`}
              >
                {t('videoIteration.modeExtend', { defaultValue: 'Extend clip (+3–10s)' })}
              </button>
            </div>
          </div>

          <textarea
            id={instructionId}
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            disabled={disabled || isGenerating}
            rows={3}
            placeholder={t('videoIteration.instructionPlaceholder', {
              defaultValue:
                'e.g. Change lighting to golden hour with misty background, or slow down camera tracking...',
            })}
            className="w-full rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] p-2.5 text-xs text-[var(--color-text-primary)] focus:border-blue-500 focus:outline-none"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-[var(--color-text-secondary)]">
                {t('videoIteration.durationLabel', { defaultValue: 'Duration' })}:
              </label>
              <select
                value={durationSeconds}
                onChange={(e) => setDurationSeconds(Number(e.target.value))}
                disabled={disabled || isGenerating}
                className="mt-1 w-full rounded border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] p-1.5 text-xs text-[var(--color-text-primary)]"
              >
                {availableDurations.map((s) => (
                  <option key={s} value={s}>
                    {mode === 'extend'
                      ? `+${t('videoIteration.durationSeconds', { seconds: s, defaultValue: `${s}s` })}`
                      : t('videoIteration.durationSeconds', { seconds: s, defaultValue: `${s}s` })}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-[var(--color-text-secondary)]">
                {t('videoIteration.resolutionLabel', { defaultValue: 'Resolution' })}:
              </label>
              <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value as VideoIterationResolution)}
                disabled={disabled || isGenerating}
                className="mt-1 w-full rounded border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] p-1.5 text-xs text-[var(--color-text-primary)]"
              >
                <option value="720p">720p (Fast / standard)</option>
                <option value="1080p">1080p (Full HD)</option>
                <option value="4k">4K (Ultra HD)</option>
                <option value="360p">360p (Draft)</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={keepAudio}
              onChange={(e) => setKeepAudio(e.target.checked)}
              disabled={disabled || isGenerating}
              className="rounded border-[var(--color-border-primary)]"
            />
            <span>
              {t('videoIteration.keepAudio', {
                defaultValue: 'Preserve original audio track (uncheck to regenerate sound)',
              })}
            </span>
          </label>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-emerald-400 font-mono">
              💰{' '}
              {t('videoIteration.costEstimate', {
                amount: costEstimate.maximumChargeUsd?.toFixed(2) ?? '0.80',
                defaultValue: `Estimated max: $${costEstimate.maximumChargeUsd?.toFixed(2) ?? '0.80'} USD`,
              })}
            </span>
            <button
              type="submit"
              disabled={disabled || isGenerating || !instruction.trim()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-blue-500 disabled:opacity-50 flex items-center gap-1.5"
            >
              {isGenerating ? (
                <>
                  <span className="inline-block animate-spin">⏳</span>
                  <span>
                    {t('videoIteration.generating', { defaultValue: 'Generating iteration…' })}
                  </span>
                </>
              ) : (
                <>
                  <span>✨</span>
                  <span>
                    {t('videoIteration.iterateButton', { defaultValue: 'Generate iteration' })} (v
                    {nextVersionNumber})
                  </span>
                </>
              )}
            </button>
          </div>

          {error && (
            <p role="alert" className="text-xs text-rose-400">
              {error}
            </p>
          )}
          {statusMessage && (
            <p role="status" className="text-xs text-emerald-400">
              {statusMessage}
            </p>
          )}
        </form>
      </div>

      {/* Embedded Intelligent Creative Assistant */}
      <CreativeAssistantDrawer
        analysisInput={{
          idea,
          currentPrompt: activeTurn.effectivePrompt,
          currentVersion: activeTurn.version,
          cameraDirection: cameraDirection || 'Standard',
          lightingStyle: lightingStyle || 'Natural',
          neighboringShotSummary,
        }}
        onApplyInstruction={(text) => {
          setInstruction(text);
        }}
        disabled={disabled || isGenerating}
      />

      {/* A/B Comparison Modal */}
      {isComparing && comparisonResults.length >= 1 && (
        <div className="mt-4 rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
            <h4 className="font-semibold text-sm text-[var(--color-text-primary)]">
              ⚖️ {t('videoIteration.compare', { defaultValue: 'Compare A/B' })}
            </h4>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <label className="flex items-center gap-1 text-[var(--color-text-secondary)]">
                <span>A:</span>
                <select
                  value={compareTurnAId}
                  onChange={(e) => setCompareTurnAId(e.target.value)}
                  aria-label="Version A"
                  className="rounded border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-2 py-1 text-xs text-[var(--color-text-primary)]"
                >
                  {session.turns.map((turn) => (
                    <option key={turn.id} value={turn.id}>
                      v{turn.version}: {turn.instruction.slice(0, 24)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-1 text-[var(--color-text-secondary)]">
                <span>B:</span>
                <select
                  value={compareTurnBId}
                  onChange={(e) => setCompareTurnBId(e.target.value)}
                  aria-label="Version B"
                  className="rounded border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-2 py-1 text-xs text-[var(--color-text-primary)]"
                >
                  {session.turns.map((turn) => (
                    <option key={turn.id} value={turn.id}>
                      v{turn.version}: {turn.instruction.slice(0, 24)}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => setIsComparing(false)}
                className="text-xs underline text-slate-400 hover:text-white ml-2"
              >
                {t('videoIteration.hideCompare', { defaultValue: 'Hide compare' })}
              </button>
            </div>
          </div>

          {comparedTurns.turnA && comparedTurns.turnB && (
            <div className="mb-3 rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] p-2.5 text-xs text-[var(--color-text-secondary)]">
              <span className="font-semibold text-[var(--color-text-primary)]">
                Δ v{comparedTurns.turnA.version} → v{comparedTurns.turnB.version}:
              </span>{' '}
              <span className="text-blue-300 font-mono">{comparedTurns.turnB.instruction}</span>
            </div>
          )}

          <VideoResultCompare
            contextId={`compare-${session.id}`}
            results={comparisonResults}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
};
