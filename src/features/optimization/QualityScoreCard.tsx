import React from 'react';
import { useTranslation } from 'react-i18next';
import type { QualityDimension } from '@core/types';

interface QualityScoreCardProps {
  qualityScore: number;
  breakdown: QualityDimension[];
}

const getScoreTier = (score: number): string => {
  if (score >= 8) return 'excellent';
  if (score >= 6) return 'good';
  if (score >= 4) return 'fair';
  return 'needsWork';
};

const getScoreColor = (score: number): string => {
  if (score >= 8) return 'text-green-400';
  if (score >= 6) return 'text-blue-400';
  if (score >= 4) return 'text-yellow-400';
  return 'text-red-400';
};

const getBarColor = (score: number): string => {
  if (score >= 7) return 'bg-green-500';
  if (score >= 5) return 'bg-blue-500';
  if (score >= 3) return 'bg-yellow-500';
  return 'bg-red-500';
};

export const QualityScoreCard: React.FC<QualityScoreCardProps> = ({ qualityScore, breakdown }) => {
  const { t } = useTranslation('optimization');
  const tier = getScoreTier(qualityScore);

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
      <h3 className="text-sm font-medium text-gray-300 mb-2">{t('quality.title')}</h3>
      <div className="flex items-center gap-3 mb-3">
        <span
          className={`text-2xl font-bold ${getScoreColor(qualityScore)}`}
          aria-label={t('aria.qualityScore', { score: qualityScore })}
        >
          {qualityScore}
        </span>
        <span className="text-xs text-gray-500">/ 10</span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${getScoreColor(qualityScore)} bg-white/5`}
        >
          {t(`quality.tiers.${tier}`)}
        </span>
      </div>
      <div className="space-y-1.5">
        {breakdown.map((dim) => (
          <div key={dim.name} className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500 w-16 truncate">
              {t(`quality.dimensions.${dim.name}`, dim.name)}
            </span>
            <div
              className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden"
              role="progressbar"
              aria-valuenow={dim.score}
              aria-valuemin={0}
              aria-valuemax={10}
              aria-label={`${dim.name}: ${dim.score}/10`}
            >
              <div
                className={`h-full rounded-full transition-all duration-300 ${getBarColor(dim.score)}`}
                style={{ width: `${(dim.score / 10) * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-gray-500 w-4 text-right">{dim.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
