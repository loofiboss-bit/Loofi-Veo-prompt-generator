import { useEffect, useId, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { PromptArtifactV1, VideoPromptArtifactInput } from '@core/types';
import type { ExternalStudioResultV1 } from '@core/types/externalStudioResult';
import { ROUTES } from '@core/config/routes';
import { useExternalStudioResultStore } from '@core/store/useExternalStudioResultStore';
import { useAppStore } from '@core/store/useAppStore';
import {
  VideoResultCompare,
  type VideoComparisonResult,
} from '@shared/components/VideoResultCompare';

interface ExternalStudioResultsProps {
  projectId: string;
  artifact: PromptArtifactV1 | null;
  variantIndex: 0 | 1 | 2;
  disabled?: boolean;
  isStale?: boolean;
}

function ExternalResultCard({
  result,
  comparisonNotes,
  disabled,
  showMedia = true,
}: {
  result: ExternalStudioResultV1;
  comparisonNotes?: string;
  disabled: boolean;
  showMedia?: boolean;
}) {
  const { t } = useTranslation('studio');
  const navigate = useNavigate();
  const asset = useExternalStudioResultStore((s) => s.assets[result.id]);
  const pending = useExternalStudioResultStore((s) => s.pending);
  const confirm = useExternalStudioResultStore((s) => s.confirm);
  const accept = useExternalStudioResultStore((s) => s.accept);
  const shots = useAppStore((s) => s.sbShots);
  const [notes, setNotes] = useState(result.manualReview?.notes ?? '');
  const notesId = useId();
  const [shot, setShot] = useState('');
  const reviewed = result.manualReview?.assetId === result.assetId;
  return (
    <article className="space-y-3 rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] p-4">
      <h3 className="font-semibold text-[var(--color-text-primary)]">
        {result.variantSnapshot.title} · {result.target}
      </h3>
      <p className="text-sm text-[var(--color-text-secondary)]">
        {result.assetName} · {result.durationSeconds.toFixed(1)} s
      </p>
      {asset ? (
        showMedia ? (
          <video
            controls
            src={asset.url}
            className="max-h-72 w-full rounded"
            aria-label={result.assetName}
          >
            <track kind="captions" />
          </video>
        ) : null
      ) : (
        <div>
          <p role="status">{t('externalResults.unavailable')}</p>
          <label className="mt-2 block text-sm">
            {t('externalResults.replace')}
            <input
              type="file"
              accept="video/*"
              disabled={disabled || pending}
              className="mt-2 block w-full"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = '';
                if (file)
                  void useExternalStudioResultStore.getState().replaceVideo(result.id, file);
              }}
            />
          </label>
          <Link to="/assets" className="underline">
            {t('externalResults.relink')}
          </Link>
          <button
            type="button"
            disabled={pending}
            onClick={() => void useExternalStudioResultStore.getState().hydrate(result.projectId)}
            className="ml-3 underline"
          >
            {t('externalResults.refresh')}
          </button>
        </div>
      )}
      <details>
        <summary>{t('externalResults.source')}</summary>
        <pre className="whitespace-pre-wrap text-sm">{result.variantSnapshot.copyAll}</pre>
      </details>
      <label htmlFor={notesId} className="block text-sm">
        {t('externalResults.notes')}
      </label>
      <textarea
        id={notesId}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="mt-1 w-full rounded border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] p-2 text-[var(--color-text-primary)]"
      />
      {result.sourceSnapshot.kind === 'video' && result.sourceSnapshot.target !== 'suno' ? (
        <button
          type="button"
          disabled={disabled || pending || !comparisonNotes?.trim()}
          onClick={() => {
            const input = result.sourceSnapshot.input as VideoPromptArtifactInput;
            navigate(`${ROUTES.STUDIO}?mode=video`, {
              state: {
                kind: 'studio-feedback',
                source: {
                  projectId: result.projectId,
                  sourceKind: 'external-result',
                  sourceId: result.id,
                  artifactId: result.artifactId,
                  variantIndex: result.variantIndex,
                  target: result.sourceSnapshot.target,
                  prompt: result.variantSnapshot.prompt,
                  negativePrompt: result.variantSnapshot.negativePrompt,
                  settings: JSON.stringify(
                    {
                      mode: input.mode,
                      aspectRatio: input.aspectRatio,
                      durationSeconds: input.durationSeconds,
                      firstFrameAssetId: input.firstFrameAssetId,
                      lastFrameAssetId: input.lastFrameAssetId,
                      referenceAssetIds: input.referenceAssetIds,
                      extensionSourceTakeId: input.extensionSourceTakeId,
                    },
                    null,
                    2,
                  ),
                  notes: comparisonNotes,
                },
              },
            });
          }}
          className="rounded border border-blue-600 px-3 py-2 disabled:opacity-50"
        >
          {t('externalResults.improvePromptFromNotes', {
            defaultValue: 'Improve prompt from notes',
          })}
        </button>
      ) : null}
      <button
        type="button"
        disabled={disabled || pending || !asset}
        onClick={() => void confirm(result.id, notes)}
        className="rounded border border-[var(--color-border-primary)] px-3 py-2 disabled:opacity-50"
      >
        {t(reviewed ? 'externalResults.confirmed' : 'externalResults.confirm')}
      </button>
      <label className="block text-sm">
        {t('externalResults.scene')}
        <select
          value={shot}
          onChange={(e) => setShot(e.target.value)}
          className="ml-2 rounded border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] p-2 text-[var(--color-text-primary)]"
        >
          <option value="">{t('externalResults.newScene')}</option>
          {shots
            .filter((s) => s.type === 'video')
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.id}: {s.action.slice(0, 60)}
              </option>
            ))}
        </select>
      </label>
      <button
        type="button"
        disabled={disabled || pending || !asset || !reviewed}
        onClick={() => {
          const app = useAppStore.getState();
          void accept(result.id, shot ? Number(shot) : undefined, {
            editorSnapshot: {
              shots: app.sbShots,
              timeline: {
                clips: app.clips,
                tracks: app.tracks,
                zoomLevel: app.zoomLevel,
                currentTime: app.currentTime,
              },
            },
          });
        }}
        className="studio-primary disabled:opacity-50"
      >
        {t('externalResults.useTimeline')}
      </button>
    </article>
  );
}

export function ExternalStudioResults({
  projectId,
  artifact,
  variantIndex,
  disabled = false,
  isStale = false,
}: ExternalStudioResultsProps) {
  const { t } = useTranslation('studio');
  const state = useExternalStudioResultStore();
  useEffect(() => {
    void useExternalStudioResultStore.getState().hydrate(projectId);
  }, [projectId]);
  const canImport = artifact?.kind === 'video' && artifact.target !== 'veo-api';
  const currentResults = state.projectId === projectId ? state.results : [];
  const playable: VideoComparisonResult[] = currentResults
    .filter((result) => state.assets[result.id]?.url)
    .map((result) => {
      const input = result.sourceSnapshot.input as VideoPromptArtifactInput;
      return {
        id: result.id,
        label: result.assetName,
        src: state.assets[result.id].url,
        prompt: result.variantSnapshot.prompt,
        negativePrompt: result.variantSnapshot.negativePrompt,
        settings: JSON.stringify(
          {
            target: result.target,
            mode: input.mode,
            aspectRatio: input.aspectRatio,
            durationSeconds: input.durationSeconds,
            firstFrameAssetId: input.firstFrameAssetId,
            lastFrameAssetId: input.lastFrameAssetId,
            referenceAssetIds: input.referenceAssetIds,
            extensionSourceTakeId: input.extensionSourceTakeId,
          },
          null,
          2,
        ),
        comparisonNotes: result.comparisonNotes,
      };
    });
  if (!artifact && !state.pending && state.results.length === 0 && !state.error) return null;
  return (
    <section
      className="space-y-4 rounded-xl border border-[var(--color-border-primary)] p-4"
      aria-label={t('externalResults.title')}
    >
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-[var(--color-text-primary)]">
          {t('externalResults.title')}
        </h2>
        {isStale && (
          <span className="text-xs text-amber-400">
            {t('externalResults.boundToLastCompiled', {
              defaultValue: 'Bound to last compiled prompt',
            })}
          </span>
        )}
      </div>
      {canImport && (
        <label className="block text-sm text-[var(--color-text-primary)]">
          {t('externalResults.import')}
          <input
            type="file"
            accept="video/*"
            disabled={disabled || state.pending || state.projectId !== projectId}
            className="mt-2 block w-full"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = '';
              if (file && artifact) void state.importVideo(projectId, artifact, variantIndex, file);
            }}
          />
        </label>
      )}
      {state.pending && <p role="status">{t('externalResults.pending')}</p>}
      {state.error && (
        <p role="alert" className="text-red-500">
          {state.error}
        </p>
      )}
      <VideoResultCompare
        contextId={projectId}
        results={playable}
        disabled={disabled || state.pending}
        onSaveNotes={(id, notes) => state.saveComparisonNotes(id, notes)}
        renderDetails={(item, { notes }) => {
          const result = currentResults.find((candidate) => candidate.id === item.id);
          return result ? (
            <ExternalResultCard
              key={result.id}
              result={result}
              comparisonNotes={notes}
              disabled={disabled}
              showMedia={false}
            />
          ) : null;
        }}
      />
      {currentResults
        .filter((result) => !state.assets[result.id]?.url)
        .map((result) => (
          <ExternalResultCard key={result.id} result={result} disabled={disabled} />
        ))}
      {!state.pending && state.results.length === 0 && (
        <p className="text-sm text-[var(--color-text-secondary)]">{t('externalResults.empty')}</p>
      )}
    </section>
  );
}
