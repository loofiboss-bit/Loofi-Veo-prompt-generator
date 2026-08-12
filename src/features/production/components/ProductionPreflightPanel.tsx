import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  PreflightPatch,
  PreflightRecommendation,
  ProductionPreflightResult,
} from '@core/services/productionPreflightService';

export function ProductionPreflightPanel({
  result,
  onApply,
  onUndo,
  canUndo,
  onOverride,
}: {
  result: ProductionPreflightResult;
  onApply: (patch: PreflightPatch, recommendation: PreflightRecommendation) => void;
  onUndo: () => void;
  canUndo: boolean;
  onOverride?: (shotId: number, reason: string) => void;
}) {
  const { t } = useTranslation('create');
  const [overrideShotId, setOverrideShotId] = useState<number | ''>('');
  const [overrideReason, setOverrideReason] = useState('');
  const warningShotIds = useMemo(
    () =>
      Array.from(
        new Set(
          result.continuity.warnings
            .map((warning) => Number(warning.match(/^Shot (\d+):/)?.[1]))
            .filter((shotId) => Number.isFinite(shotId)),
        ),
      ),
    [result.continuity.warnings],
  );

  useEffect(() => {
    if (overrideShotId === '' || !warningShotIds.includes(overrideShotId)) {
      setOverrideShotId(warningShotIds[0] ?? '');
    }
  }, [overrideShotId, warningShotIds]);

  return (
    <div className="mt-4 space-y-3 border-t border-slate-800 pt-4">
      <div className="flex flex-wrap gap-2" aria-label="Production preflight categories">
        {result.categories.map((category) => (
          <span
            key={category.category}
            title={category.reasons.join(' ')}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
              category.status === 'ready'
                ? 'border-emerald-700 text-emerald-300'
                : category.status === 'blocked'
                  ? 'border-rose-700 text-rose-300'
                  : 'border-amber-700 text-amber-300'
            }`}
          >
            {category.category}: {category.status}
          </span>
        ))}
      </div>
      {result.continuity.reportCount > 0 && (
        <div
          className={`rounded-md border px-3 py-2 text-xs ${
            result.continuity.blockers.length > 0
              ? 'border-rose-900/70 bg-rose-950/20 text-rose-200'
              : result.continuity.warnings.length > 0
                ? 'border-amber-900/70 bg-amber-950/20 text-amber-200'
                : 'border-emerald-900/70 bg-emerald-950/20 text-emerald-200'
          }`}
        >
          <span className="font-semibold">Continuity snapshots:</span>{' '}
          {result.continuity.reportCount} checked · {result.continuity.blockers.length} blockers ·{' '}
          {result.continuity.warnings.length} warnings · {result.continuity.overrideRecords.length}{' '}
          overrides · {result.continuity.unresolvedWarnings.length} pending overrides
        </div>
      )}
      {onOverride && warningShotIds.length > 0 && (
        <div className="rounded-md border border-amber-900/70 bg-amber-950/10 p-3 text-xs text-amber-100">
          <p className="font-semibold">
            {t('continuity.overrideTitle', 'Document a soft continuity warning')}
          </p>
          <p className="mt-1 text-[11px] text-amber-200/70">
            {t(
              'continuity.overrideHelp',
              'Critical continuity errors remain blocked. A documented reason can approve a soft warning.',
            )}
          </p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="flex min-w-32 flex-col gap-1">
              {t('continuity.overrideShot', 'Shot')}
              <select
                aria-label={t('continuity.overrideShot', 'Shot')}
                value={overrideShotId}
                onChange={(event) => setOverrideShotId(Number(event.target.value))}
                className="rounded border border-amber-800 bg-slate-950 px-2 py-2 text-xs"
              >
                {warningShotIds.map((shotId) => (
                  <option key={shotId} value={shotId}>
                    {shotId}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-0 flex-1 flex-col gap-1">
              {t('continuity.overrideReason', 'Reason')}
              <input
                aria-label={t('continuity.overrideReason', 'Reason')}
                value={overrideReason}
                onChange={(event) => setOverrideReason(event.target.value)}
                placeholder={t('continuity.overridePlaceholder', 'Why is this drift intentional?')}
                className="rounded border border-amber-800 bg-slate-950 px-2 py-2 text-xs"
              />
            </label>
            <button
              type="button"
              disabled={overrideShotId === '' || !overrideReason.trim()}
              onClick={() => {
                if (overrideShotId !== '') onOverride(overrideShotId, overrideReason);
                setOverrideReason('');
              }}
              className="rounded-md bg-amber-600 px-3 py-2 font-semibold text-slate-950 hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t('continuity.overrideAction', 'Document warning')}
            </button>
          </div>
        </div>
      )}
      {result.recommendations.map((recommendation) => (
        <div
          key={recommendation.id}
          className="flex flex-col justify-between gap-2 rounded-md border border-slate-800 bg-slate-950/60 p-3 text-xs sm:flex-row sm:items-center"
        >
          <div>
            <p className="font-semibold text-slate-200">{recommendation.suggestion}</p>
            <p className="mt-1 text-slate-500">{recommendation.reason}</p>
          </div>
          {recommendation.patch && (
            <button
              type="button"
              onClick={() => onApply(recommendation.patch!, recommendation)}
              className="rounded-md border border-blue-700 px-3 py-2 font-semibold text-blue-200 hover:bg-blue-950"
            >
              Preview and apply
            </button>
          )}
        </div>
      ))}
      <div className="flex items-center justify-between text-[11px] text-slate-500">
        <span>Reproducibility key: {result.reproducibilityKey}</span>
        <button
          type="button"
          disabled={!canUndo}
          onClick={onUndo}
          className="rounded border border-slate-700 px-2 py-1 disabled:opacity-30"
        >
          Undo local patch
        </button>
      </div>
    </div>
  );
}
