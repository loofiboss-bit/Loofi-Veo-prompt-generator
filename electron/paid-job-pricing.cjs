'use strict';

const PRICING_SOURCE_URL = 'https://ai.google.dev/gemini-api/docs/pricing';
const PRICING_VERIFIED_DATE = '2026-08-01';

// Security boundary mirror of src/core/models/catalog.ts. A contract test keeps the values aligned.
const VIDEO_USD_PER_SECOND = Object.freeze({
  'veo-3.1-quality': Object.freeze({ '720p': 0.4, '1080p': 0.4, '4k': 0.6 }),
  'veo-3.1-fast': Object.freeze({ '720p': 0.1, '1080p': 0.12, '4k': 0.3 }),
  'veo-3.1-lite': Object.freeze({ '720p': 0.05, '1080p': 0.08 }),
});

const MUSIC_USD_PER_REQUEST = Object.freeze({
  'lyria-3-clip-preview': 0.04,
  'lyria-3-pro-preview': 0.08,
});

const TEXT_USD_PER_MILLION_TOKENS = Object.freeze({
  'gemini-3.6-flash': Object.freeze({ input: 1.5, output: 7.5 }),
  'gemini-3.5-flash': Object.freeze({ input: 1.5, output: 9 }),
  'gemini-3.5-flash-lite': Object.freeze({ input: 0.3, output: 2.5 }),
  'gemini-3.1-flash-lite': Object.freeze({ input: 0.25, output: 1.5 }),
  'gemini-3.1-pro-preview': Object.freeze({ input: 2, output: 12 }),
  'gemini-3.1-pro': Object.freeze({ input: 2, output: 12 }),
});

const PROVIDER_PRICING = Object.freeze({
  ...Object.fromEntries(
    Object.entries(TEXT_USD_PER_MILLION_TOKENS).map(([modelId, price]) => [modelId, price]),
  ),
  'gemini-2.5-flash-image': Object.freeze({
    input: 0.3,
    images: Object.freeze({ '1k': 0.039 }),
  }),
  'gemini-3.1-flash-image': Object.freeze({
    input: 0.5,
    output: 3,
    images: Object.freeze({ '0.5k': 0.045, '1k': 0.067, '2k': 0.101, '4k': 0.151 }),
  }),
  'gemini-3.1-flash-lite-image': Object.freeze({
    input: 0.25,
    output: 1.5,
    images: Object.freeze({ '1k': 0.0336 }),
  }),
  'gemini-3-pro-image': Object.freeze({
    input: 2,
    output: 12,
    images: Object.freeze({ '1k': 0.134, '2k': 0.134, '4k': 0.24 }),
  }),
  'gemini-3.1-flash-tts-preview': Object.freeze({
    input: 1,
    audioOutput: 20,
    audioTokensPerSecond: 25,
  }),
  'gemini-omni-flash-preview': Object.freeze({
    input: 1.5,
    videoOutput: 17.5,
    videoTokensPerSecond: Object.freeze({ '720p': 5792 }),
  }),
});

function calculateMaximumCharge(task) {
  const request = task?.request;
  if (task?.jobKind === 'music') {
    const requestPrice = MUSIC_USD_PER_REQUEST[request?.modelId];
    if (!Number.isFinite(requestPrice) || requestPrice <= 0) {
      throw new Error('No trusted music request price is available for this model.');
    }
    return requestPrice;
  }
  const rate = VIDEO_USD_PER_SECOND[request?.modelId]?.[request?.resolution];
  if (!Number.isFinite(rate) || rate <= 0 || !Number.isFinite(request?.durationSeconds)) {
    throw new Error('No trusted paid-job price is available for this model and resolution.');
  }
  return rate * request.durationSeconds;
}

function validateCostApproval(task) {
  const approval = task?.costApproval;
  if (!approval || typeof approval !== 'object') {
    throw new Error('An auditable cost approval is required for paid execution.');
  }
  if (approval.modelId !== task.request?.modelId) {
    throw new Error('The cost approval does not match the requested model.');
  }
  if (approval.currency !== 'USD' || !['exact', 'upper-bound'].includes(approval.confidence)) {
    throw new Error('The cost approval has unsupported currency or confidence metadata.');
  }
  if (
    approval.sourceUrl !== PRICING_SOURCE_URL ||
    approval.verifiedDate !== PRICING_VERIFIED_DATE
  ) {
    throw new Error('The cost approval uses stale or untrusted pricing metadata.');
  }
  const calculatedMaximumChargeUsd = calculateMaximumCharge(task);
  if (
    !Number.isFinite(approval.maximumChargeUsd) ||
    approval.maximumChargeUsd <= 0 ||
    approval.maximumChargeUsd + Number.EPSILON < calculatedMaximumChargeUsd
  ) {
    throw new Error('The approved maximum charge is below the trusted conservative estimate.');
  }
  return calculatedMaximumChargeUsd;
}

function calculateProviderMaximumCharge(input) {
  const approval = input?.costApproval;
  const prices = PROVIDER_PRICING[input?.providerModelId];
  const calculation = approval?.calculationInputs;
  if (!prices || !calculation) {
    throw new Error('No trusted provider price is available for this execution request.');
  }
  const inputTokens = calculation.estimatedInputTokens;
  const outputTokens = calculation.estimatedOutputTokens;
  const requiresTextOutput = input.operation === 'plan' || input.operation === 'review';
  const inputCharacters = (input.inputs || []).reduce(
    (total, item) => total + String(item?.data || '').length,
    0,
  );
  const minimumInputTokens = Math.max(
    1,
    Math.ceil((String(input.prompt || '').length + inputCharacters) / 3),
  );
  if (
    !Number.isFinite(inputTokens) ||
    inputTokens < minimumInputTokens ||
    (requiresTextOutput && (!Number.isFinite(outputTokens) || outputTokens <= 0))
  ) {
    throw new Error('The provider cost calculation is incomplete or not conservative.');
  }
  let maximumChargeUsd = (inputTokens * prices.input) / 1_000_000;
  if (input.operation === 'plan' || input.operation === 'review') {
    if (!Number.isFinite(outputTokens) || outputTokens <= 0 || !Number.isFinite(prices.output)) {
      throw new Error('The provider output-token calculation is incomplete.');
    }
    maximumChargeUsd += (outputTokens * prices.output) / 1_000_000;
  } else if (input.operation === 'image') {
    const imageCount = calculation.imageCount;
    const imageResolution = calculation.imageResolution;
    const imagePrice = prices.images?.[imageResolution];
    if (!Number.isFinite(imageCount) || imageCount <= 0 || !Number.isFinite(imagePrice)) {
      throw new Error('The provider image calculation is incomplete.');
    }
    maximumChargeUsd += imageCount * imagePrice;
    if (Number.isFinite(outputTokens) && outputTokens > 0 && Number.isFinite(prices.output)) {
      maximumChargeUsd += (outputTokens * prices.output) / 1_000_000;
    }
  } else if (input.operation === 'tts') {
    const audioOutputSeconds = calculation.audioOutputSeconds;
    if (
      !Number.isFinite(audioOutputSeconds) ||
      audioOutputSeconds <= 0 ||
      !Number.isFinite(prices.audioOutput) ||
      !Number.isFinite(prices.audioTokensPerSecond)
    ) {
      throw new Error('The provider audio calculation is incomplete.');
    }
    maximumChargeUsd +=
      (audioOutputSeconds * prices.audioTokensPerSecond * prices.audioOutput) / 1_000_000;
  } else if (input.operation === 'video' || input.operation === 'video-edit') {
    const duration = calculation.videoDurationSeconds;
    const resolution = calculation.videoResolution;
    const tokensPerSecond = prices.videoTokensPerSecond?.[resolution];
    if (
      !Number.isFinite(duration) ||
      duration <= 0 ||
      !Number.isFinite(tokensPerSecond) ||
      !Number.isFinite(prices.videoOutput)
    ) {
      throw new Error('The provider video calculation is incomplete.');
    }
    maximumChargeUsd += (duration * tokensPerSecond * prices.videoOutput) / 1_000_000;
  } else {
    throw new Error('Unsupported paid provider operation.');
  }
  return maximumChargeUsd;
}

function validateProviderCostApproval(input) {
  const approval = input?.costApproval;
  if (!approval || typeof approval !== 'object') {
    throw new Error('An auditable cost approval is required for provider execution.');
  }
  if (
    approval.providerModelId !== input.providerModelId ||
    approval.currency !== 'USD' ||
    !['exact', 'upper-bound'].includes(approval.confidence) ||
    approval.sourceUrl !== PRICING_SOURCE_URL ||
    approval.verifiedDate !== PRICING_VERIFIED_DATE
  ) {
    throw new Error('The provider cost approval does not match trusted pricing metadata.');
  }
  const calculatedMaximumChargeUsd = calculateProviderMaximumCharge(input);
  if (
    !Number.isFinite(approval.maximumChargeUsd) ||
    approval.maximumChargeUsd <= 0 ||
    approval.maximumChargeUsd + Number.EPSILON < calculatedMaximumChargeUsd
  ) {
    throw new Error('The approved provider maximum is below the trusted conservative estimate.');
  }
  return calculatedMaximumChargeUsd;
}

module.exports = {
  PRICING_SOURCE_URL,
  PRICING_VERIFIED_DATE,
  VIDEO_USD_PER_SECOND,
  MUSIC_USD_PER_REQUEST,
  TEXT_USD_PER_MILLION_TOKENS,
  PROVIDER_PRICING,
  calculateMaximumCharge,
  calculateProviderMaximumCharge,
  validateCostApproval,
  validateProviderCostApproval,
};
