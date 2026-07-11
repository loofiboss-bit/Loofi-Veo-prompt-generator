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
  costContext?: {
    approvedCeilingUsd: number;
    estimatedInputTokens?: number;
    estimatedOutputTokens?: number;
    imageCount?: number;
    videoDurationSeconds?: number;
    videoResolution?: '720p' | '1080p' | '4k';
  };
}

export interface ProviderResponse {
  text?: string;
  media?: readonly { mimeType: string; data: string }[];
  operationId?: string;
  interactionId?: string;
  rawModelId: string;
  selectedModelId?: string;
  fallbackReason?: ProviderFailureKind;
  estimatedMaximumCostUsd?: number;
}

export class ProviderExecutionError extends Error {
  constructor(
    message: string,
    readonly kind: ProviderFailureKind,
    readonly status?: number,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ProviderExecutionError';
  }
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
