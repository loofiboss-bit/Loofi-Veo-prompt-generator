import {
  getModel,
  type CostMode,
  type MediaModality,
  type ModelCatalogEntry,
  type ModelOperation,
  type VideoResolution,
} from './catalog';

export interface RouteRequest {
  operation: ModelOperation;
  mode: CostMode;
  requiresReferenceImages?: boolean;
  requiresFirstLastFrame?: boolean;
  requiresExtension?: boolean;
  requires4k?: boolean;
  conversational?: boolean;
  requiredInputModalities?: readonly MediaModality[];
  requiredOutputModalities?: readonly MediaModality[];
  requestedResolution?: VideoResolution;
  requestedModelId?: string;
  availableModelIds?: readonly string[];
  allowPreview?: boolean;
}

export interface ModelDecision {
  model: ModelCatalogEntry;
  reason: string;
  fallback?: ModelCatalogEntry;
}

const resolve = (id: string): ModelCatalogEntry => {
  const model = getModel(id);
  if (!model) throw new Error(`Missing model catalog entry: ${id}`);
  return model;
};

const supportsRequest = (model: ModelCatalogEntry, request: RouteRequest): boolean => {
  const capabilities = model.capabilities;
  const requestedResolution = request.requires4k ? '4k' : request.requestedResolution;
  return (
    capabilities.operations.includes(request.operation) &&
    model.lifecycle !== 'deprecated' &&
    model.lifecycle !== 'shut-down' &&
    (request.allowPreview !== false || model.lifecycle !== 'preview') &&
    (!request.availableModelIds || request.availableModelIds.includes(model.id)) &&
    (!request.requiresReferenceImages || capabilities.supportsReferenceImages === true) &&
    (!request.requiresFirstLastFrame || capabilities.supportsFirstLastFrame === true) &&
    (!request.requiresExtension || capabilities.supportsExtension === true) &&
    (!request.conversational || capabilities.supportsInteraction === true) &&
    (!requestedResolution ||
      capabilities.supportedResolutions?.includes(requestedResolution) === true) &&
    (request.requiredInputModalities ?? []).every((modality) =>
      capabilities.inputModalities.includes(modality),
    ) &&
    (request.requiredOutputModalities ?? []).every((modality) =>
      capabilities.outputModalities.includes(modality),
    ) &&
    model.pricing.status === 'priced'
  );
};

const select = (
  candidates: readonly string[],
  request: RouteRequest,
): ModelCatalogEntry | undefined =>
  candidates.map(resolve).find((candidate) => supportsRequest(candidate, request));

const manualDecision = (request: RouteRequest): ModelDecision => {
  if (!request.requestedModelId) {
    throw new Error('Manual model routing requires an explicit model selection.');
  }
  const model = resolve(request.requestedModelId);
  if (!supportsRequest(model, request)) {
    const replacement = model.replacementModelId ? ` Use ${model.replacementModelId} instead.` : '';
    throw new Error(
      `${model.displayName} is unavailable or incompatible with the requested operation.${replacement}`,
    );
  }
  return { model, reason: 'User-selected model retained after capability and lifecycle checks.' };
};

export const routeModel = (request: RouteRequest): ModelDecision => {
  if (request.mode === 'manual' || request.requestedModelId) return manualDecision(request);

  if (request.operation === 'video' || request.operation === 'video-edit') {
    const requiresVeo =
      request.requiresFirstLastFrame ||
      request.requiresExtension ||
      request.requires4k ||
      request.requiresReferenceImages ||
      (request.requestedResolution !== undefined && request.requestedResolution !== '720p');

    if (requiresVeo) {
      const requiresAdvancedVeo =
        request.requiresFirstLastFrame || request.requiresExtension || request.requires4k;
      const primary = select(
        request.mode === 'economy'
          ? ['veo-3.1-lite', 'veo-3.1-fast', 'veo-3.1-quality']
          : request.mode === 'quality' || requiresAdvancedVeo
            ? ['veo-3.1-quality', 'veo-3.1-fast']
            : ['veo-3.1-fast', 'veo-3.1-quality'],
        request,
      );
      const fallback = select(
        ['veo-3.1-quality', 'veo-3.1-fast', 'veo-3.1-lite'].filter((id) => id !== primary?.id),
        request,
      );
      if (!primary) {
        throw new Error(
          'No available Veo model supports the requested specialized video controls.',
        );
      }
      return {
        model: primary,
        fallback,
        reason: 'Requested resolution or creative controls require a compatible Veo 3.1 model.',
      };
    }

    if (request.mode === 'economy') {
      const economy = select(['veo-3.1-lite', 'gemini-omni-flash'], request);
      if (!economy) throw new Error('No priced economy video model is currently available.');
      return {
        model: economy,
        fallback: select(['gemini-omni-flash', 'veo-3.1-fast'], request),
        reason: 'Economy mode selected for an unconstrained video request.',
      };
    }

    const general = select(['gemini-omni-flash', 'veo-3.1-fast'], request);
    if (!general) throw new Error('No priced general video model is currently available.');
    return {
      model: general,
      fallback: select(['veo-3.1-fast', 'veo-3.1-quality'], request),
      reason:
        general.id === 'gemini-omni-flash'
          ? 'Gemini Omni Flash is the recommended general video model for unconstrained requests.'
          : 'The recommended general video model is unavailable; using a compatible Veo fallback.',
    };
  }

  if (request.operation === 'image') {
    const candidates =
      request.mode === 'quality'
        ? ['nano-banana-pro', 'nano-banana-2']
        : request.mode === 'economy'
          ? ['nano-banana-2-lite', 'nano-banana']
          : ['nano-banana-2', 'nano-banana', 'nano-banana-2-lite'];
    const model = select(candidates, request);
    if (!model) throw new Error('No priced image model supports the requested operation.');
    return {
      model,
      reason: `${request.mode === 'quality' ? 'Quality' : request.mode === 'economy' ? 'Economy' : 'Smart'} image routing selected.`,
    };
  }

  if (request.operation === 'tts') {
    const model = select(['gemini-3.1-flash-tts'], request);
    if (!model) throw new Error('No priced TTS model is currently available.');
    return { model, reason: 'Current priced voiceover model selected.' };
  }

  if (request.operation === 'music') {
    throw new Error('Music routing is not enabled until the Lyria durable-job phase is active.');
  }

  const candidates =
    request.mode === 'quality'
      ? ['gemini-3.5-flash', 'gemini-3.1-pro', 'gemini-3.6-flash']
      : request.mode === 'economy'
        ? ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.6-flash']
        : ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite'];
  const model = select(candidates, request);
  const fallback = model
    ? select(
        candidates.filter((id) => id !== model.id),
        request,
      )
    : undefined;
  if (!model) throw new Error('No priced planning or review model is currently available.');
  return {
    model,
    fallback,
    reason:
      request.mode === 'quality'
        ? 'Quality reasoning selected.'
        : request.mode === 'economy'
          ? 'Economy processing selected.'
          : 'Current stable general model selected.',
  };
};
