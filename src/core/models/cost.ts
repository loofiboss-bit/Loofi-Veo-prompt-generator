import type { ModelCatalogEntry } from './catalog';
import type { ProviderRequest } from '@core/providers/types';

export const estimateMaximumModelCost = (
  model: ModelCatalogEntry,
  context: ProviderRequest['costContext'],
): number => {
  if (!context) return 0;
  const pricing = model.pricing;
  const tokenCost =
    ((context.estimatedInputTokens ?? 0) / 1_000_000) * (pricing.inputTokenPerMillionUsd ?? 0) +
    ((context.estimatedOutputTokens ?? 0) / 1_000_000) * (pricing.outputTokenPerMillionUsd ?? 0);
  const imageCost = (context.imageCount ?? 0) * (pricing.imagePerGenerationUsd ?? 0);
  const videoCost =
    (context.videoDurationSeconds ?? 0) *
    (pricing.videoPerSecondUsd?.[context.videoResolution ?? '720p'] ?? 0);
  return tokenCost + imageCost + videoCost;
};
