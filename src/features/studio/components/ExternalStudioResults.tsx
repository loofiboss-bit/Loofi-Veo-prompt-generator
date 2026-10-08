import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { PromptArtifactV1 } from '@core/types';
import type { ExternalStudioResultV1 } from '@core/types/externalStudioResult';
import { useExternalStudioResultStore } from '@core/store/useExternalStudioResultStore';
import { useAppStore } from '@core/store/useAppStore';

interface ExternalStudioResultsProps {
  projectId: string;
  artifact: PromptArtifactV1 | null;
  variantIndex: 0 | 1 | 2;
  disabled?: boolean;
}

function ExternalResultCard({
  result,
  disabled,
}: {
  result: ExternalStudioResultV1;
  disabled: boolean;
}) {
  const { t } = useTranslation('studio');
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
        <video
          controls
          src={asset.url}
          className="max-h-72 w-full rounded"
          aria-label={result.assetName}
        >
          <track kind="captions" />
        </video>
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
        onClick={() => void accept(result.id, shot ? Number(shot) : undefined)}
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
}: ExternalStudioResultsProps) {
  const { t } = useTranslation('studio');
  const state = useExternalStudioResultStore();
  useEffect(() => {
    void useExternalStudioResultStore.getState().hydrate(projectId);
  }, [projectId]);
  const canImport = artifact?.kind === 'video' && artifact.target !== 'veo-api';
  if (!artifact && !state.pending && state.results.length === 0 && !state.error) return null;
  return (
    <section
      className="space-y-4 rounded-xl border border-[var(--color-border-primary)] p-4"
      aria-label={t('externalResults.title')}
    >
      <h2 className="font-semibold text-[var(--color-text-primary)]">
        {t('externalResults.title')}
      </h2>
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
      {state.projectId === projectId &&
        state.results.map((result) => (
          <ExternalResultCard key={result.id} result={result} disabled={disabled} />
        ))}
      {!state.pending && state.results.length === 0 && (
        <p className="text-sm text-[var(--color-text-secondary)]">{t('externalResults.empty')}</p>
      )}
    </section>
  );
}
