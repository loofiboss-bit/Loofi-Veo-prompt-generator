import { routeModel, type ModelDecision, type RouteRequest } from '@core/models/router';
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
    const adapter = this.adapters.find((candidate) => candidate.supports(decision.model));
    if (!adapter) throw new Error(`No configured adapter supports ${decision.model.id}.`);
    return adapter.execute({ ...request, model: decision.model });
  }
}
