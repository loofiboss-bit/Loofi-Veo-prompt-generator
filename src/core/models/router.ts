import { getModel, type CostMode, type ModelCatalogEntry, type ModelOperation } from './catalog';

export interface RouteRequest {
  operation: ModelOperation;
  mode: CostMode;
  requiresReferenceImages?: boolean;
  requiresFirstLastFrame?: boolean;
  requiresExtension?: boolean;
  requires4k?: boolean;
  conversational?: boolean;
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

export const routeModel = (request: RouteRequest): ModelDecision => {
  if (request.conversational) {
    return {
      model: resolve('gemini-omni-flash'),
      reason: 'Conversational video revisions require an interaction-capable model.',
    };
  }
  if (request.operation === 'video') {
    const constrained =
      request.requiresFirstLastFrame || request.requiresExtension || request.requires4k;
    if (constrained || request.mode === 'quality') {
      return {
        model: resolve('veo-3.1-quality'),
        fallback: resolve('veo-3.1-fast'),
        reason: constrained
          ? 'Requested video controls require the full Veo 3.1 capability set.'
          : 'Quality mode selected.',
      };
    }
    if (request.requiresReferenceImages) {
      return {
        model: resolve('veo-3.1-fast'),
        fallback: resolve('veo-3.1-quality'),
        reason: 'Veo Lite does not support reference images.',
      };
    }
    if (request.mode === 'economy')
      return {
        model: resolve('veo-3.1-lite'),
        fallback: resolve('veo-3.1-fast'),
        reason: 'Economy mode selected for an unconstrained video request.',
      };
    return {
      model: resolve('veo-3.1-fast'),
      fallback: resolve('veo-3.1-quality'),
      reason: 'Fast mode selected for an unconstrained video request.',
    };
  }
  if (request.operation === 'image') {
    const id =
      request.mode === 'quality'
        ? 'nano-banana-pro'
        : request.mode === 'economy'
          ? 'nano-banana-2-lite'
          : 'nano-banana-2';
    return {
      model: resolve(id),
      reason: `${request.mode === 'quality' ? 'Quality' : request.mode === 'economy' ? 'Economy' : 'Smart'} image routing selected.`,
    };
  }
  if (request.operation === 'tts')
    return { model: resolve('gemini-3.1-flash-tts'), reason: 'Default voiceover model.' };
  if (request.mode === 'quality')
    return {
      model: resolve('gemini-3.1-pro'),
      fallback: resolve('gemini-3.5-flash'),
      reason: 'Quality reasoning selected.',
    };
  if (request.mode === 'economy')
    return {
      model: resolve('gemini-3.1-flash-lite'),
      fallback: resolve('gemini-3.5-flash'),
      reason: 'Economy background processing selected.',
    };
  return {
    model: resolve('gemini-3.5-flash'),
    fallback: resolve('gemini-3.1-flash-lite'),
    reason: 'Default planning and review route.',
  };
};
