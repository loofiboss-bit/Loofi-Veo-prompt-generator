import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isTakePlayable } from '@core/services/productionReadinessService';
import type { ProductionTake } from '@core/types';

interface TakeCompareProps {
  takes: ProductionTake[];
  onKeep: (take: ProductionTake) => void;
  onReject: (take: ProductionTake) => void;
  onRevise: (take: ProductionTake, notes: string) => void;
  onManualReview?: (take: ProductionTake, notes: string) => void;
}

export function TakeCompare({
  takes,
  onKeep,
  onReject,
  onRevise,
  onManualReview,
}: TakeCompareProps) {
  const { t } = useTranslation('create');
  const available = useMemo(() => takes.filter(isTakePlayable), [takes]);
  const [leftId, setLeftId] = useState(available.at(-2)?.id ?? available[0]?.id ?? '');
  const [rightId, setRightId] = useState(available.at(-1)?.id ?? available[0]?.id ?? '');
  const [notes, setNotes] = useState('');
  const videos = useRef<Record<string, HTMLVideoElement | null>>({});
  if (!available.length) return <p className="text-sm text-slate-500">{t('flow.noPlayable')}</p>;
  const left = available.find((take) => take.id === leftId) ?? available[0];
  const right = available.find((take) => take.id === rightId) ?? available.at(-1)!;
  const pane = (label: string, take: ProductionTake, setId: (id: string) => void) => (
    <div className="space-y-2 rounded-lg border border-slate-700 bg-slate-950 p-3">
      <label className="flex items-center gap-2 text-xs text-slate-400">
        {label}
        <select
          value={take.id}
          onChange={(event) => setId(event.target.value)}
          className="rounded bg-slate-800 px-2 py-1"
        >
          {available.map((item, index) => (
            <option key={item.id} value={item.id}>
              Take {index + 1}
            </option>
          ))}
        </select>
      </label>
      <video
        ref={(video) => {
          videos.current[label] = video;
        }}
        controls
        preload="metadata"
        src={take.localMediaUrl ?? take.providerMediaUri}
        className="aspect-video w-full rounded bg-black"
      />
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
                    const video = videos.current[label];
                    if (
                      video &&
                      Number.isFinite(video.duration) &&
                      finding.timestampSeconds! <= video.duration
                    )
                      video.currentTime = finding.timestampSeconds!;
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
  return (
    <div aria-label={t('flow.comparison')} className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-2">
        {pane('A', left, setLeftId)}
        {pane('B', right, setRightId)}
      </div>
      <label className="block text-xs text-slate-400">
        {t('flow.notes')}
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className="mt-1 h-20 w-full rounded border border-slate-700 bg-slate-950 p-2"
        />
      </label>
    </div>
  );
}
