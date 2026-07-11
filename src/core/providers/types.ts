import type { ModelCatalogEntry, ModelOperation, ModelProvider } from '@core/models/catalog';

export interface ProviderConnectionProfile {
  id: string;
  provider: ModelProvider;
  label: string;
  projectId?: string;
  location?: string;
  endpoint?: string;
}

export type ProviderFailureKind =
  | 'authentication'
  | 'quota'
  | 'rate-limit'
  | 'model-unavailable'
  | 'invalid-capability'
  | 'safety'
  | 'network'
  | 'provider-incident'
  | 'unknown';

export interface ProviderConnectionResult {
  ok: boolean;
  provider: ModelProvider;
  model?: string;
  failure?: ProviderFailureKind;
  message: string;
  hints: string[];
}

export interface ProviderRequest {
  operation: ModelOperation;
  model: ModelCatalogEntry;
  prompt: string;
  inputs?: readonly { mimeType: string; data: string }[];
  interactionId?: string;
}

export interface ProviderResponse {
  text?: string;
  media?: readonly { mimeType: string; data: string }[];
  operationId?: string;
  interactionId?: string;
  rawModelId: string;
}

export interface GenerativeProviderAdapter {
  readonly provider: ModelProvider;
  supports(model: ModelCatalogEntry): boolean;
  testConnection(
    profile: ProviderConnectionProfile,
    model?: ModelCatalogEntry,
  ): Promise<ProviderConnectionResult>;
  execute(request: ProviderRequest): Promise<ProviderResponse>;
}
