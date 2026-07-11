import React from 'react';
import type {
  PreflightPatch,
  ProductionPreflightResult,
} from '@core/services/productionPreflightService';

export function ProductionPreflightPanel({
  result,
  onApply,
  onUndo,
  canUndo,
}: {
  result: ProductionPreflightResult;
  onApply: (patch: PreflightPatch) => void;
  onUndo: () => void;
  canUndo: boolean;
}) {
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
              onClick={() => onApply(recommendation.patch!)}
              className="rounded-md border border-cyan-700 px-3 py-2 font-semibold text-cyan-200 hover:bg-cyan-950"
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
