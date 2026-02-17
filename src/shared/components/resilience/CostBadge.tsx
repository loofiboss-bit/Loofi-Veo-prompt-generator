/**
 * CostBadge — shows estimated cost before an API call and actual cost after.
 * Displays as a small inline badge near the generate button.
 *
 * @module shared/components/resilience/CostBadge
 */
import React from 'react';
import { useCostStore } from '@core/store/useCostStore';

interface CostBadgeProps {
  /** Optional CSS class */
  className?: string;
}

/** Format USD to a readable string */
const formatCost = (usd: number): string => {
  if (usd < 0.001) return '<$0.001';
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  if (usd < 1) return `$${usd.toFixed(3)}`;
  return `$${usd.toFixed(2)}`;
};

export const CostBadge: React.FC<CostBadgeProps> = ({ className = '' }) => {
  const lastEstimate = useCostStore((s) => s.lastEstimate);
  const withinBudget = useCostStore((s) => s.withinBudget);
  const lifetimeCost = useCostStore((s) => s.lifetimeCost);

  if (!lastEstimate && lifetimeCost === 0) return null;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-mono
        ${withinBudget ? 'bg-slate-800/60 text-slate-400' : 'bg-amber-900/40 text-amber-400'}
        ${className}`}
      title={
        lastEstimate
          ? `Estimated: ${formatCost(lastEstimate.estimatedCostUsd)} (${lastEstimate.modelId})`
          : `Session total: ${formatCost(lifetimeCost)}`
      }
    >
      {/* Cost icon */}
      <svg
        className="w-3 h-3"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <circle cx="8" cy="8" r="6.5" />
        <path d="M8 4.5v7M6 6.5c0-.83.9-1.5 2-1.5s2 .67 2 1.5-.9 1.5-2 1.5-2 .67-2 1.5.9 1.5 2 1.5" />
      </svg>

      {lastEstimate ? (
        <span>~{formatCost(lastEstimate.estimatedCostUsd)}</span>
      ) : (
        <span>{formatCost(lifetimeCost)}</span>
      )}

      {!withinBudget && (
        <span className="text-amber-400 text-[10px]" title="Over monthly budget">
          ⚠
        </span>
      )}
    </div>
  );
};
