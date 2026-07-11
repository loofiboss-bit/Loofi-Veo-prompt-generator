import { routeModel, type ModelDecision, type RouteRequest } from '@core/models/router';
import { estimateMaximumModelCost } from '@core/models/cost';
import type { ModelCatalogEntry } from '@core/models/catalog';
import { classifyProviderFailure, isSafeSameModelRetry, permitsModelFallback } from './failures';
import type { GenerativeProviderAdapter, ProviderRequest, ProviderResponse } from './types';

export class ProviderRouter {
  constructor(private readonly adapters: readonly GenerativeProviderAdapter[]) {}

  decide(request: RouteRequest): ModelDecision {
    return routeModel(request);
  }

  async execute(
    route: RouteRequest,
    request: Omit<ProviderRequest, 'model'>,
  ): Promise<ProviderResponse> {
    if ((route.operation === 'video' || route.operation === 'image') && !request.costContext) {
      throw new Error(`Approved cost ceiling is required for ${route.operation} execution.`);
    }
    const decision = this.decide(route);
    try {
      return await this.executeCandidate(decision.model, request);
    } catch (primaryError) {
      const primaryFailure = classifyProviderFailure(primaryError);
      if (isSafeSameModelRetry(primaryFailure)) {
        try {
          return await this.executeCandidate(decision.model, request);
        } catch (retryError) {
          // Classification of the final attempt controls whether fallback is safe.
          primaryError = retryError;
        }
      }

      const failure = classifyProviderFailure(primaryError);
      const fallback = decision.fallback;
      if (!fallback || !permitsModelFallback(failure) || !this.isCompatible(route, fallback)) {
        throw primaryError;
      }

      const estimatedMaximumCostUsd = estimateMaximumModelCost(fallback, request.costContext);
      const ceiling = request.costContext?.approvedCeilingUsd ?? Number.POSITIVE_INFINITY;
      if (estimatedMaximumCostUsd > ceiling) throw primaryError;

      const response = await this.executeCandidate(fallback, request);
      return {
        ...response,
        selectedModelId: fallback.id,
        fallbackReason: failure,
        estimatedMaximumCostUsd,
      };
    }
  }

  private async executeCandidate(
    model: ModelCatalogEntry,
    request: Omit<ProviderRequest, 'model'>,
  ): Promise<ProviderResponse> {
    const adapter = this.adapters.find((candidate) => candidate.supports(model));
    if (!adapter) throw new Error(`No configured adapter supports ${model.id}.`);
    const estimatedMaximumCostUsd = estimateMaximumModelCost(model, request.costContext);
    const response = await adapter.execute({ ...request, model });
    return { ...response, selectedModelId: model.id, estimatedMaximumCostUsd };
  }

  private isCompatible(route: RouteRequest, model: ModelCatalogEntry): boolean {
    const capabilities = model.capabilities;
    return (
      capabilities.operations.includes(route.operation) &&
      (!route.requiresReferenceImages || capabilities.supportsReferenceImages === true) &&
      (!route.requiresFirstLastFrame || capabilities.supportsFirstLastFrame === true) &&
      (!route.requiresExtension || capabilities.supportsExtension === true) &&
      (!route.requires4k || capabilities.supportedResolutions?.includes('4k') === true) &&
      (!route.conversational || capabilities.supportsInteraction === true)
    );
  }
}
