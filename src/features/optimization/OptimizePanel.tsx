import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useOptimizationStore } from '@core/store/useOptimizationStore';
import { QualityScoreCard } from './QualityScoreCard';
import { CostEstimateCard } from './CostEstimateCard';
import { NarrativeHealthPanel } from './NarrativeHealthPanel';
import { PresetRecommendCard } from './PresetRecommendCard';

interface OptimizePanelProps {
  promptId: string;
  onClose?: () => void;
  onApplyPreset?: (modelId: string, profileId: string) => void;
}

export const OptimizePanel: React.FC<OptimizePanelProps> = ({
  promptId,
  onClose,
  onApplyPreset,
}) => {
  const { t } = useTranslation('optimization');
  const panelOpen = useOptimizationStore((state) => state.panelOpen);
  const togglePanel = useOptimizationStore((state) => state.togglePanel);
  const costEstimate = useOptimizationStore((state) => state.costEstimates[promptId]);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && panelOpen) {
        togglePanel();
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [panelOpen, togglePanel, onClose]);

  if (!panelOpen) return null;

  return (
    <aside
      role="complementary"
      aria-label={t('aria.panel')}
      className="w-80 flex-shrink-0 border-l border-white/10 bg-gray-900/95 backdrop-blur-sm overflow-y-auto"
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-200">{t('panel.title')}</h2>
            <p className="text-[10px] text-gray-500">{t('panel.subtitle')}</p>
          </div>
          <button
            onClick={() => {
              togglePanel();
              onClose?.();
            }}
            aria-label={t('panel.close')}
            className="p-1 rounded hover:bg-white/10 text-gray-400 transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="space-y-3">
          {costEstimate && (
            <>
              <QualityScoreCard
                qualityScore={costEstimate.qualityScore}
                breakdown={costEstimate.breakdown}
              />
              <CostEstimateCard estimate={costEstimate} />
            </>
          )}
          <NarrativeHealthPanel />
          <PresetRecommendCard onApplyPreset={onApplyPreset} />
        </div>
      </div>
    </aside>
  );
};
