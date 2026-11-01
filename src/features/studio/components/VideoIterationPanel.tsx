import React, { useEffect, useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  VideoIterationResolution,
  VideoIterationSession,
  VideoIterationSettings,
  VideoIterationTurn,
} from '@core/types/videoIteration';
import { videoIterationService } from '@core/services/videoIterationService';
import { videoVersionService } from '@core/services/videoVersionService';
import { CreativeAssistantDrawer } from './CreativeAssistantDrawer';
import { VideoResultCompare } from '@shared/components/VideoResultCompare';
import { useAppStore } from '@core/store/useAppStore';

export interface VideoIterationPanelProps {
  initialSession: VideoIterationSession;
  idea: string;
  onSessionUpdated?: (session: VideoIterationSession) => void;
  disabled?: boolean;
}

export const VideoIterationPanel: React.FC<VideoIterationPanelProps> = ({
  initialSession,
  idea,
  onSessionUpdated,
  disabled = false,
}) => {
  const { t } = useTranslation('studio');
  const [session, setSession] = useState<VideoIterationSession>(initialSession);
  const [instruction, setInstruction] = useState('');
  const [durationSeconds, setDurationSeconds] = useState<number>(8);
  const [resolution, setResolution] = useState<VideoIterationResolution>('720p');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [selectedShotId, setSelectedShotId] = useState<number>(1);

  const instructionId = useId();
  const shots = useAppStore((s) => s.sbShots ?? []);

  useEffect(() => {
    setSession(initialSession);
  }, [initialSession]);

  const activeTurn = useMemo(() => {
    return session.turns.find((t) => t.id === session.activeTurnId) ?? session.turns[0];
  }, [session]);

  const costEstimate = useMemo(() => {
    return videoIterationService.estimateIterationCost({ durationSeconds, resolution });
  }, [durationSeconds, resolution]);

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
        t('videoIteration.instructionPlaceholder', { defaultValue: 'Describe desired changes.' }),
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
        modelId: 'gemini-omni-1.1-flash',
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
        t('videoIteration.version', {
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
    const success = videoVersionService.applyVersionToStoryboardShot(selectedShotId, activeTurn);
    if (success) {
      setStatusMessage(
        t('videoIteration.appliedToTimeline', {
          version: activeTurn.version,
          scene: selectedShotId,
          defaultValue: `Version ${activeTurn.version} sent to storyboard scene ${selectedShotId}.`,
        }),
      );
    }
  };

  const comparisonResults = useMemo(() => {
    if (!isComparing) return [];
    const parentTurn = session.turns.find((t) => t.id === activeTurn.parentId) ?? session.turns[0];
    return videoVersionService.prepareComparison(session, parentTurn.id, activeTurn.id);
  }, [isComparing, session, activeTurn]);

  return (
    <div className="space-y-4 rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] p-4 shadow-md">
      {/* Header and Version History Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-primary)] pb-3">
        <div>
          <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
            🎬 {t('videoIteration.title', { defaultValue: 'AI Video Iteration' })}
          </h3>
          <p className="text-xs text-[var(--color-text-secondary)]">
            {t('videoIteration.history', { defaultValue: 'Iteration history' })}:{' '}
            {session.turns.length} {session.turns.length === 1 ? 'version' : 'versioner'}
          </p>
        </div>

        {/* Version Pills */}
        <div
          className="flex flex-wrap items-center gap-1.5"
          role="tablist"
          aria-label="Version history"
        >
          {session.turns.map((turn) => {
            const isActive = turn.id === activeTurn.id;
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
                v{turn.version}{' '}
                {turn.version === 1
                  ? `(${t('videoIteration.original', { defaultValue: 'Original' })})`
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
              controls
              src={activeTurn.assetUrl}
              className="w-full rounded-lg bg-black aspect-video object-contain"
              aria-label={`Video version ${activeTurn.version}`}
            >
              <track kind="captions" />
            </video>
          ) : (
            <div className="flex h-48 w-full items-center justify-center rounded-lg bg-slate-900 text-slate-500">
              No media available
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

            <div className="flex items-center gap-1.5 ml-auto">
              {shots.length > 0 && (
                <select
                  value={selectedShotId}
                  onChange={(e) => setSelectedShotId(Number(e.target.value))}
                  aria-label="Scene"
                  className="rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] px-2 py-1 text-xs text-[var(--color-text-primary)]"
                >
                  {shots.map((shot) => (
                    <option key={shot.id} value={shot.id}>
                      Scen {shot.id} ({shot.action.slice(0, 20)}...)
                    </option>
                  ))}
                </select>
              )}
              <button
                type="button"
                onClick={handleSendToTimeline}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500"
              >
                🎬 {t('videoIteration.sendToTimeline', { defaultValue: 'Send to Timeline' })}
              </button>
            </div>
          </div>
        </div>

        {/* Iteration Prompt Form */}
        <form onSubmit={handleGenerateIteration} className="space-y-3">
          <label
            htmlFor={instructionId}
            className="block text-xs font-semibold text-[var(--color-text-primary)]"
          >
            {t('videoIteration.instructionLabel', {
              defaultValue: 'Describe what to change with AI',
            })}
            :
          </label>
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
                {[3, 4, 5, 6, 7, 8, 9, 10].map((s) => (
                  <option key={s} value={s}>
                    {s} sekunder
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
                    {activeTurn.version + 1})
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
          cameraDirection: activeTurn.settings.resolution,
        }}
        onApplyInstruction={(text) => {
          setInstruction(text);
        }}
        disabled={disabled || isGenerating}
      />

      {/* A/B Comparison Modal */}
      {isComparing && comparisonResults.length >= 2 && (
        <div className="mt-4 rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] p-4">
          <div className="flex items-center justify-between pb-3">
            <h4 className="font-semibold text-sm text-[var(--color-text-primary)]">
              ⚖️ A/B Comparison: {comparisonResults[0].label} vs {comparisonResults[1].label}
            </h4>
            <button
              type="button"
              onClick={() => setIsComparing(false)}
              className="text-xs underline text-slate-400 hover:text-white"
            >
              Stäng jämförelse
            </button>
          </div>
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
