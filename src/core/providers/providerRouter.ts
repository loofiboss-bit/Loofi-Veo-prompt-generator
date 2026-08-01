import { routeModel, type ModelDecision, type RouteRequest } from '@core/models/router';
import { estimateMaximumModelCost, requireUsableCostEstimate } from '@core/models/cost';
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

      const costEstimate = estimateMaximumModelCost(fallback, request.costContext);
      const estimatedMaximumCostUsd = requireUsableCostEstimate(costEstimate);
      const ceiling = request.costContext?.approvedCeilingUsd;
      if (!Number.isFinite(ceiling) || (ceiling ?? 0) <= 0) throw primaryError;
      if (estimatedMaximumCostUsd > ceiling!) throw primaryError;

      const response = await this.executeCandidate(fallback, request);
      return {
        ...response,
        selectedModelId: fallback.id,
        fallbackReason: failure,
        estimatedMaximumCostUsd,
        costEstimate,
      };
    }
  }

  private async executeCandidate(
    model: ModelCatalogEntry,
    request: Omit<ProviderRequest, 'model'>,
  ): Promise<ProviderResponse> {
    const costEstimate = estimateMaximumModelCost(model, request.costContext);
    const estimatedMaximumCostUsd = requireUsableCostEstimate(costEstimate);
    const ceiling = request.costContext?.approvedCeilingUsd;
    if (!Number.isFinite(ceiling) || (ceiling ?? 0) <= 0) {
      throw new Error(
        `Approved positive cost ceiling is required for ${request.operation} execution.`,
      );
    }
    if (estimatedMaximumCostUsd > ceiling!) {
      throw new Error(
        `Estimated maximum $${estimatedMaximumCostUsd.toFixed(6)} exceeds approved ceiling $${ceiling!.toFixed(6)}.`,
      );
    }
    const adapter = this.adapters.find((candidate) => candidate.supports(model));
    if (!adapter) throw new Error(`No configured adapter supports ${model.id}.`);
    const response = await adapter.execute({ ...request, model });
    return { ...response, selectedModelId: model.id, estimatedMaximumCostUsd, costEstimate };
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
