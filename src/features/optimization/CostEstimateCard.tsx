import React from 'react';
import { useTranslation } from 'react-i18next';
import type { OptimizationCostEstimate } from '@core/types';

interface CostEstimateCardProps {
  estimate: OptimizationCostEstimate;
}

export const CostEstimateCard: React.FC<CostEstimateCardProps> = ({ estimate }) => {
  const { t } = useTranslation('optimization');

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
      <h3 className="text-sm font-medium text-gray-300 mb-2">{t('cost.title')}</h3>
      <div className="flex items-baseline gap-1 mb-2">
        <span
          className="text-xl font-bold text-emerald-400"
          aria-label={t('aria.costEstimate', { cost: estimate.estimatedUsd.toFixed(2) })}
        >
          ${estimate.estimatedUsd.toFixed(2)}
        </span>
        <span className="text-xs text-gray-500">{t('cost.perGeneration')}</span>
      </div>
      <div className="text-xs text-gray-500">
        <span>{t('cost.model')}: </span>
        <span className="text-gray-300">{estimate.modelId}</span>
      </div>
    </div>
  );
};
