import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { isTakePlayable } from '@core/services/productionReadinessService';
import type { ProductionTake } from '@core/types';
import {
  VideoResultCompare,
  type VideoComparisonResult,
} from '@shared/components/VideoResultCompare';

interface TakeCompareProps {
  takes: ProductionTake[];
  contextId?: string;
  onSaveComparisonNotes?: (take: ProductionTake, notes: string) => Promise<void>;
  onKeep: (take: ProductionTake) => void;
  onReject: (take: ProductionTake) => void;
  onRevise: (take: ProductionTake, notes: string) => void;
  onManualReview?: (take: ProductionTake, notes: string) => void;
}

export function TakeCompare({
  takes,
  contextId = 'production',
  onSaveComparisonNotes,
  onKeep,
  onReject,
  onRevise,
  onManualReview,
}: TakeCompareProps) {
  const { t } = useTranslation('create');
  const available = useMemo(() => takes.filter(isTakePlayable), [takes]);
  const results: VideoComparisonResult[] = available.map((take) => {
    const rawIndex = takes.findIndex((candidate) => candidate.id === take.id);
    const takeNumber = rawIndex >= 0 ? rawIndex + 1 : 1;
    return {
      id: take.id,
      label: `Take ${takeNumber}`,
      src: (take.localMediaUrl ?? take.providerMediaUri)!,
      prompt: take.prompt,
      negativePrompt: take.request.negativePrompt ?? '',
      settings: JSON.stringify(
        {
          model: take.request.modelId,
          mode: take.request.mode,
          aspectRatio: take.request.aspectRatio,
          resolution: take.request.resolution,
          durationSeconds: take.request.durationSeconds,
          seed: take.request.seed,
          firstFrameAssetId: take.request.firstFrameAssetId,
          lastFrameAssetId: take.request.lastFrameAssetId,
          referenceAssetIds: take.request.referenceAssetIds,
          extensionSourceTakeId: take.request.extensionSourceTakeId,
        },
        null,
        2,
      ),
      comparisonNotes: take.comparisonNotes,
    };
  });
  if (!available.length) return <p className="text-sm text-slate-500">{t('flow.noPlayable')}</p>;
  const details = (
    item: VideoComparisonResult,
    { notes, seek }: { notes: string; seek: (seconds: number) => void },
  ) => {
    const take = available.find((candidate) => candidate.id === item.id)!;
    return (
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-300">
          {take.review
            ? t(
                `flow.${take.review.source === 'local' ? 'localChecks' : take.review.source === 'mixed' ? 'combinedReview' : 'aiReview'}`,
              )
            : t('flow.notReviewed')}
        </p>
        {take.review?.source === 'local' && (
          <p className="text-xs text-amber-300">{t('flow.reviewWarnings')}</p>
        )}
        {take.review && take.review.source !== 'local' && (
          <p className="text-xs text-slate-400">
            {t('flow.score', { score: take.review.overallScore })}
          </p>
        )}
        {take.review?.dimensions.length ? (
          <dl className="space-y-2 text-xs text-slate-400">
            {take.review.dimensions.map((dimension) => (
              <div key={dimension.id}>
                <dt className="font-medium text-slate-200">
                  {dimension.id.replaceAll('-', ' ')}
                  {take.review?.source !== 'local' ? `: ${dimension.score}` : ''}
                </dt>
                <dd>{dimension.summary}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {take.review?.findings.length ? (
          <ul aria-label={t('flow.findings')} className="space-y-1 text-xs text-amber-300">
            {take.review.findings.map((finding) => (
              <li key={finding.id}>
                {finding.message}
                {Number.isFinite(finding.timestampSeconds) && finding.timestampSeconds! >= 0 && (
                  <button
                    type="button"
                    className="ml-2 underline"
                    onClick={() => {
                      seek(finding.timestampSeconds!);
                    }}
                  >
                    {finding.timestampSeconds}s
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : null}
        {take.manualReview && (
          <p className="text-xs text-emerald-300">
            {t('flow.manualConfirmed')}
            {take.manualReview.notes ? `: ${take.manualReview.notes}` : ''}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {onManualReview &&
            (!take.review || take.review.source === 'local') &&
            !take.manualReview && (
              <button
                type="button"
                onClick={() => onManualReview(take, notes)}
                className="rounded bg-blue-600 px-2 py-1 text-xs"
              >
                {t('flow.confirmManual')}
              </button>
            )}
          <button
            type="button"
            disabled={
              !take.manualReview &&
              (!take.review || take.review.source === 'local') &&
              take.status !== 'accepted'
            }
            onClick={() => onKeep(take)}
            className="rounded bg-emerald-600 px-2 py-1 text-xs disabled:opacity-50"
          >
            {t('flow.keep')}
          </button>
          <button
            type="button"
            onClick={() => onReject(take)}
            className="rounded bg-rose-700 px-2 py-1 text-xs"
          >
            {t('flow.reject')}
          </button>
          <button
            type="button"
            onClick={() => onRevise(take, notes)}
            className="rounded bg-amber-600 px-2 py-1 text-xs"
          >
            {t('flow.revise')}
          </button>
        </div>
      </div>
    );
  };
  return (
    <div aria-label={t('flow.comparison')}>
      <VideoResultCompare
        contextId={contextId}
        results={results}
        onSaveNotes={
          onSaveComparisonNotes
            ? async (id, notes) => {
                const take = available.find((candidate) => candidate.id === id);
                if (!take) throw new Error('The comparison result is unavailable.');
                await onSaveComparisonNotes(take, notes);
              }
            : undefined
        }
        renderDetails={details}
      />
    </div>
  );
}
