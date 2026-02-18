import React from 'react';
import { useTranslation } from 'react-i18next';
import { useOptimizationStore } from '@core/store/useOptimizationStore';

interface PresetRecommendCardProps {
  onApplyPreset?: (modelId: string, profileId: string) => void;
}

export const PresetRecommendCard: React.FC<PresetRecommendCardProps> = ({ onApplyPreset }) => {
  const { t } = useTranslation('optimization');
  const recommendation = useOptimizationStore((state) => state.presetRecommendation);

  if (!recommendation) return null;

  const confidencePercent = Math.round(recommendation.confidence * 100);

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
      <h3 className="text-sm font-medium text-gray-300 mb-2">{t('preset.title')}</h3>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium text-purple-400">{recommendation.modelId}</span>
        <div className="flex items-center gap-1">
          <div
            className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden"
            role="progressbar"
            aria-valuenow={confidencePercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t('aria.presetConfidence', { confidence: confidencePercent })}
          >
            <div
              className="h-full rounded-full bg-purple-500 transition-all duration-300"
              style={{ width: `${confidencePercent}%` }}
            />
          </div>
          <span className="text-[10px] text-gray-500">{confidencePercent}%</span>
        </div>
      </div>
      <div className="space-y-1 mb-2">
        {recommendation.reasoning.map((reason, i) => (
          <p key={i} className="text-[10px] text-gray-400">
            • {reason}
          </p>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onApplyPreset?.(recommendation.modelId, recommendation.profileId)}
          className="text-xs px-3 py-1 rounded bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-colors"
        >
          {t('preset.apply')}
        </button>
        <button className="text-xs px-3 py-1 rounded bg-white/5 text-gray-400 hover:bg-white/10 transition-colors">
          {t('preset.override')}
        </button>
      </div>
    </div>
  );
};
