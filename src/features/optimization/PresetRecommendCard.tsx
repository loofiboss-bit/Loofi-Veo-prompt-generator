import React from 'react';
import { useTranslation } from 'react-i18next';
import { useOptimizationStore } from '@core/store/useOptimizationStore';

interface PresetRecommendCardProps {
  onApplyPreset?: (modelId: string, profileId: string) => void;
}

export const PresetRecommendCard: React.FC<PresetRecommendCardProps> = ({ onApplyPreset }) => {
  const { t } = useTranslation('optimization');
  const recommendation = useOptimizationStore((state) => state.presetRecommendation);
  const dismissRecommendation = useOptimizationStore((state) => state.setPresetRecommendation);

  if (!recommendation) return null;

  const confidencePercent = Math.round(recommendation.confidence * 100);
  const confidenceLabel = t('aria.presetConfidence', { confidence: confidencePercent });

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
      <h3 className="text-sm font-medium text-gray-300 mb-2">{t('preset.title')}</h3>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium text-purple-400">{recommendation.modelId}</span>
        <div className="flex items-center gap-1">
          <progress
            className="h-1.5 w-16 overflow-hidden rounded-full align-middle [&::-moz-progress-bar]:bg-purple-500 [&::-webkit-progress-bar]:bg-white/10 [&::-webkit-progress-value]:bg-purple-500"
            value={confidencePercent}
            max={100}
            aria-label={confidenceLabel}
          />
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
          type="button"
          onClick={() => onApplyPreset?.(recommendation.modelId, recommendation.profileId)}
          className="text-xs px-3 py-1 rounded bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-colors"
        >
          {t('preset.apply')}
        </button>
        <button
          type="button"
          onClick={() => dismissRecommendation(null)}
          className="text-xs px-3 py-1 rounded bg-white/5 text-gray-400 hover:bg-white/10 transition-colors"
        >
          {t('preset.dismiss', { defaultValue: 'Dismiss' })}
        </button>
      </div>
    </div>
  );
};
