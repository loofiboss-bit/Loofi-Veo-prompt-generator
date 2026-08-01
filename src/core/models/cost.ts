import type {
  BillingMode,
  ImageResolution,
  MediaModality,
  ModelCatalogEntry,
  PricingSource,
  TokenPriceTier,
  VideoResolution,
} from './catalog';

export type CostEstimateConfidence = 'exact' | 'upper-bound' | 'unavailable';

export interface ModelCostContext {
  approvedCeilingUsd?: number;
  estimatedInputTokens?: number;
  estimatedOutputTokens?: number;
  cachedInputTokens?: number;
  estimatedInputTokensByModality?: Partial<Record<MediaModality, number>>;
  estimatedOutputTokensByModality?: Partial<Record<MediaModality, number>>;
  cachedInputTokensByModality?: Partial<Record<MediaModality, number>>;
  imageCount?: number;
  imageResolution?: ImageResolution;
  videoDurationSeconds?: number;
  videoResolution?: VideoResolution;
  audioOutputSeconds?: number;
  requestCount?: number;
}

export interface CostCalculationInput {
  name: string;
  value: number | string;
}

export interface CostLineItem {
  billingMode: BillingMode;
  billingUnit: string;
  quantity: number;
  unitPriceUsd: number;
  subtotalUsd: number;
  explanation: string;
}

export interface ModelCostEstimate {
  confidence: CostEstimateConfidence;
  maximumChargeUsd: number | null;
  currency: 'USD';
  calculationInputs: readonly CostCalculationInput[];
  lineItems: readonly CostLineItem[];
  source: PricingSource;
  assumptions: readonly string[];
  explanation: string;
  missingInformation: readonly string[];
}

const isNonNegativeFinite = (value: number | undefined): value is number =>
  value !== undefined && Number.isFinite(value) && value >= 0;

const roundUsd = (value: number): number => Math.round(value * 1_000_000) / 1_000_000;

const unavailable = (
  model: ModelCatalogEntry,
  missingInformation: readonly string[],
  calculationInputs: readonly CostCalculationInput[] = [],
): ModelCostEstimate => ({
  confidence: 'unavailable',
  maximumChargeUsd: null,
  currency: model.pricing.source.currency,
  calculationInputs,
  lineItems: [],
  source: model.pricing.source,
  assumptions: model.pricing.assumptions,
  explanation: `A conservative maximum charge for ${model.displayName} is unavailable.`,
  missingInformation,
});

const modalityValues = (
  byModality: Partial<Record<MediaModality, number>> | undefined,
  scalar: number | undefined,
  defaultModality: MediaModality,
): Partial<Record<MediaModality, number>> =>
  byModality ?? (scalar === undefined ? {} : { [defaultModality]: scalar });

const validateValues = (label: string, values: Partial<Record<MediaModality, number>>): string[] =>
  Object.entries(values).flatMap(([modality, value]) =>
    !isNonNegativeFinite(value) ? [`${label} ${modality} token count`] : [],
  );

const totalTokens = (values: Partial<Record<MediaModality, number>>): number =>
  Object.values(values).reduce<number>((sum, value) => sum + (value ?? 0), 0);

const selectTokenTier = (tiers: readonly TokenPriceTier[], promptTokens: number): TokenPriceTier =>
  tiers.find(
    (tier) => tier.maximumPromptTokens === undefined || promptTokens <= tier.maximumPromptTokens,
  ) ?? tiers.at(-1)!;

interface TokenCalculationResult {
  lineItems: CostLineItem[];
  inputs: CostCalculationInput[];
  missing: string[];
}

const calculateTokens = (
  model: ModelCatalogEntry,
  context: ModelCostContext,
): TokenCalculationResult => {
  const input = modalityValues(
    context.estimatedInputTokensByModality,
    context.estimatedInputTokens,
    'text',
  );
  const output = modalityValues(
    context.estimatedOutputTokensByModality,
    context.estimatedOutputTokens,
    model.capabilities.outputModalities[0] ?? 'text',
  );
  const cached = modalityValues(
    context.cachedInputTokensByModality,
    context.cachedInputTokens,
    'text',
  );
  const missing = [
    ...validateValues('input', input),
    ...validateValues('output', output),
    ...validateValues('cached input', cached),
  ];
  const tiers = model.pricing.tokenTiers;
  if (!tiers?.length) return { lineItems: [], inputs: [], missing: ['token price tier'] };

  const promptTokens = totalTokens(input);
  const tier = selectTokenTier(tiers, promptTokens);
  const lineItems: CostLineItem[] = [];
  const inputs: CostCalculationInput[] = [];

  for (const modality of ['text', 'image', 'audio', 'video'] as const) {
    const inputTokens = input[modality] ?? 0;
    const cachedTokens = cached[modality] ?? 0;
    const outputTokens = output[modality] ?? 0;
    if (cachedTokens > inputTokens) {
      missing.push(`cached ${modality} tokens cannot exceed total input tokens`);
      continue;
    }
    const regularInputTokens = inputTokens - cachedTokens;
    if (regularInputTokens > 0) {
      const rate = tier.inputPerMillionUsd?.[modality];
      if (!isNonNegativeFinite(rate) || rate === 0) {
        missing.push(`${modality} input token price`);
      } else {
        lineItems.push({
          billingMode: 'input-tokens',
          billingUnit: `1M ${modality} input tokens`,
          quantity: regularInputTokens / 1_000_000,
          unitPriceUsd: rate,
          subtotalUsd: roundUsd((regularInputTokens / 1_000_000) * rate),
          explanation: `${regularInputTokens.toLocaleString()} non-cached ${modality} input tokens.`,
        });
        inputs.push({ name: `${modality} input tokens`, value: regularInputTokens });
      }
    }
    if (cachedTokens > 0) {
      const rate = tier.cachedInputPerMillionUsd?.[modality];
      if (!isNonNegativeFinite(rate) || rate === 0) {
        missing.push(`${modality} cached input token price`);
      } else {
        lineItems.push({
          billingMode: 'cached-tokens',
          billingUnit: `1M cached ${modality} tokens`,
          quantity: cachedTokens / 1_000_000,
          unitPriceUsd: rate,
          subtotalUsd: roundUsd((cachedTokens / 1_000_000) * rate),
          explanation: `${cachedTokens.toLocaleString()} cached ${modality} input tokens.`,
        });
        inputs.push({ name: `cached ${modality} input tokens`, value: cachedTokens });
      }
    }
    if (outputTokens > 0) {
      const rate = tier.outputPerMillionUsd?.[modality];
      if (!isNonNegativeFinite(rate) || rate === 0) {
        missing.push(`${modality} output token price`);
      } else {
        lineItems.push({
          billingMode: modality === 'audio' ? 'audio-output-tokens' : 'output-tokens',
          billingUnit: `1M ${modality} output tokens`,
          quantity: outputTokens / 1_000_000,
          unitPriceUsd: rate,
          subtotalUsd: roundUsd((outputTokens / 1_000_000) * rate),
          explanation: `${outputTokens.toLocaleString()} maximum ${modality} output tokens.`,
        });
        inputs.push({ name: `${modality} output tokens`, value: outputTokens });
      }
    }
  }

  return { lineItems, inputs, missing };
};

export const estimateMaximumModelCost = (
  model: ModelCatalogEntry,
  context?: ModelCostContext,
): ModelCostEstimate => {
  if (!context) return unavailable(model, ['calculation context']);
  if (model.pricing.status === 'unavailable') {
    return unavailable(model, [model.pricing.unavailableReason ?? 'provider price']);
  }

  const lineItems: CostLineItem[] = [];
  const calculationInputs: CostCalculationInput[] = [];
  const missing: string[] = [];
  let confidence: Exclude<CostEstimateConfidence, 'unavailable'> = 'exact';

  const isOmniVideo =
    model.id === 'gemini-omni-flash' && model.capabilities.operations.includes('video');
  const needsTokenCalculation =
    model.pricing.billingModes.some((mode) =>
      ['input-tokens', 'output-tokens', 'cached-tokens', 'audio-output-tokens'].includes(mode),
    ) && !isOmniVideo;

  if (needsTokenCalculation) {
    const tokenResult = calculateTokens(model, context);
    lineItems.push(...tokenResult.lineItems);
    calculationInputs.push(...tokenResult.inputs);
    missing.push(...tokenResult.missing);
    confidence = 'upper-bound';
    if (
      model.pricing.billingModes.includes('input-tokens') &&
      context.estimatedInputTokens === undefined &&
      !context.estimatedInputTokensByModality
    ) {
      missing.push('maximum input token count');
    }
    if (model.capabilities.operations.some((operation) => ['plan', 'review'].includes(operation))) {
      if (context.estimatedOutputTokens === undefined && !context.estimatedOutputTokensByModality) {
        missing.push('maximum output token count including thinking tokens');
      }
    }
  }

  if (model.pricing.imagePerGenerationByResolutionUsd) {
    if (!isNonNegativeFinite(context.imageCount) || context.imageCount === 0) {
      missing.push('positive generated image count');
    }
    if (!context.imageResolution) {
      missing.push('image resolution');
    } else {
      const unitPrice = model.pricing.imagePerGenerationByResolutionUsd[context.imageResolution];
      if (!isNonNegativeFinite(unitPrice) || unitPrice === 0) {
        missing.push(`${context.imageResolution} image price`);
      } else if (isNonNegativeFinite(context.imageCount) && context.imageCount > 0) {
        lineItems.push({
          billingMode: 'generated-image',
          billingUnit: `${context.imageResolution} generated image`,
          quantity: context.imageCount,
          unitPriceUsd: unitPrice,
          subtotalUsd: roundUsd(context.imageCount * unitPrice),
          explanation: `${context.imageCount} generated ${context.imageResolution} image(s).`,
        });
        calculationInputs.push(
          { name: 'generated images', value: context.imageCount },
          { name: 'image resolution', value: context.imageResolution },
        );
      }
    }
  }

  if (model.pricing.videoPerSecondByResolutionUsd) {
    if (!isNonNegativeFinite(context.videoDurationSeconds) || context.videoDurationSeconds === 0) {
      missing.push('positive video duration');
    }
    if (!context.videoResolution) {
      missing.push('video resolution');
    } else {
      const unitPrice = model.pricing.videoPerSecondByResolutionUsd[context.videoResolution];
      if (!isNonNegativeFinite(unitPrice) || unitPrice === 0) {
        missing.push(`${context.videoResolution} video price`);
      } else if (isNonNegativeFinite(context.videoDurationSeconds)) {
        lineItems.push({
          billingMode: 'video-seconds',
          billingUnit: `${context.videoResolution} video second`,
          quantity: context.videoDurationSeconds,
          unitPriceUsd: unitPrice,
          subtotalUsd: roundUsd(context.videoDurationSeconds * unitPrice),
          explanation: `${context.videoDurationSeconds} seconds of ${context.videoResolution} video.`,
        });
        calculationInputs.push(
          { name: 'video duration seconds', value: context.videoDurationSeconds },
          { name: 'video resolution', value: context.videoResolution },
        );
      }
    }
  }

  if (model.pricing.videoOutputTokensPerSecondByResolution) {
    const resolution = context.videoResolution;
    const duration = context.videoDurationSeconds;
    const outputRate = model.pricing.tokenTiers?.[0]?.outputPerMillionUsd?.video;
    const tokensPerSecond = resolution
      ? model.pricing.videoOutputTokensPerSecondByResolution[resolution]
      : undefined;
    if (!resolution) missing.push('video resolution');
    if (!isNonNegativeFinite(duration) || duration === 0) missing.push('positive video duration');
    if (!isNonNegativeFinite(tokensPerSecond) || tokensPerSecond === 0) {
      missing.push(`${resolution ?? 'requested'} video output token rate`);
    }
    if (!isNonNegativeFinite(outputRate) || outputRate === 0) {
      missing.push('video output price');
    }
    if (
      isNonNegativeFinite(duration) &&
      duration > 0 &&
      isNonNegativeFinite(tokensPerSecond) &&
      isNonNegativeFinite(outputRate)
    ) {
      const outputTokens = duration * tokensPerSecond;
      lineItems.push({
        billingMode: 'video-seconds',
        billingUnit: `1M ${resolution} video output tokens`,
        quantity: outputTokens / 1_000_000,
        unitPriceUsd: outputRate,
        subtotalUsd: roundUsd((outputTokens / 1_000_000) * outputRate),
        explanation: `${duration} seconds × ${tokensPerSecond.toLocaleString()} output tokens/second.`,
      });
      calculationInputs.push(
        { name: 'video duration seconds', value: duration },
        { name: 'video resolution', value: resolution! },
        { name: 'video output tokens per second', value: tokensPerSecond },
      );
      confidence = 'upper-bound';
    }
    const inputResult = calculateTokens(model, {
      estimatedInputTokens: context.estimatedInputTokens,
      estimatedInputTokensByModality: context.estimatedInputTokensByModality,
      cachedInputTokens: context.cachedInputTokens,
      cachedInputTokensByModality: context.cachedInputTokensByModality,
    });
    lineItems.push(...inputResult.lineItems.filter((item) => item.billingMode !== 'output-tokens'));
    calculationInputs.push(...inputResult.inputs.filter((item) => !item.name.includes('output')));
    missing.push(...inputResult.missing.filter((item) => !item.includes('output')));
    if (context.estimatedInputTokens === undefined && !context.estimatedInputTokensByModality) {
      missing.push('maximum input token count');
    }
  }

  if (model.pricing.audioOutputTokensPerSecond !== undefined) {
    if (!isNonNegativeFinite(context.audioOutputSeconds) || context.audioOutputSeconds === 0) {
      missing.push('positive maximum audio output duration');
    } else if (!context.estimatedOutputTokensByModality?.audio) {
      const tier = model.pricing.tokenTiers?.[0];
      const rate = tier?.outputPerMillionUsd?.audio;
      if (!isNonNegativeFinite(rate) || rate === 0) {
        missing.push('audio output token price');
      } else {
        const outputTokens = context.audioOutputSeconds * model.pricing.audioOutputTokensPerSecond;
        lineItems.push({
          billingMode: 'audio-output-tokens',
          billingUnit: '1M audio output tokens',
          quantity: outputTokens / 1_000_000,
          unitPriceUsd: rate,
          subtotalUsd: roundUsd((outputTokens / 1_000_000) * rate),
          explanation: `${context.audioOutputSeconds} seconds × ${model.pricing.audioOutputTokensPerSecond} audio tokens/second.`,
        });
        calculationInputs.push({
          name: 'maximum audio output seconds',
          value: context.audioOutputSeconds,
        });
      }
    }
    confidence = 'upper-bound';
  }

  if (model.pricing.flatRequestUsd !== undefined) {
    const count = context.requestCount;
    if (!isNonNegativeFinite(count) || count === 0) {
      missing.push('positive request count');
    } else if (model.pricing.flatRequestUsd <= 0) {
      missing.push('positive flat request price');
    } else {
      lineItems.push({
        billingMode: model.capabilities.operations.includes('music')
          ? 'music-request'
          : 'flat-request',
        billingUnit: 'request',
        quantity: count,
        unitPriceUsd: model.pricing.flatRequestUsd,
        subtotalUsd: roundUsd(count * model.pricing.flatRequestUsd),
        explanation: `${count} provider request(s).`,
      });
      calculationInputs.push({ name: 'requests', value: count });
    }
  }

  const uniqueMissing = [...new Set(missing)];
  if (uniqueMissing.length > 0) return unavailable(model, uniqueMissing, calculationInputs);

  const maximumChargeUsd = roundUsd(
    lineItems.reduce((sum, lineItem) => sum + lineItem.subtotalUsd, 0),
  );
  if (!Number.isFinite(maximumChargeUsd) || maximumChargeUsd <= 0) {
    return unavailable(model, ['a positive calculated maximum charge'], calculationInputs);
  }

  return {
    confidence,
    maximumChargeUsd,
    currency: model.pricing.source.currency,
    calculationInputs,
    lineItems,
    source: model.pricing.source,
    assumptions: model.pricing.assumptions,
    explanation: `${confidence === 'exact' ? 'Exact' : 'Conservative upper-bound'} maximum for ${model.displayName}: $${maximumChargeUsd.toFixed(6)} USD.`,
    missingInformation: [],
  };
};

export const requireUsableCostEstimate = (estimate: ModelCostEstimate): number => {
  if (
    estimate.confidence === 'unavailable' ||
    estimate.maximumChargeUsd === null ||
    !Number.isFinite(estimate.maximumChargeUsd) ||
    estimate.maximumChargeUsd <= 0
  ) {
    const detail = estimate.missingInformation.join(', ') || 'pricing information';
    throw new Error(
      `Paid execution is blocked because the maximum charge is unavailable: ${detail}.`,
    );
  }
  return estimate.maximumChargeUsd;
};
