import {
  getProviderBinding,
  type ModelCatalogEntry,
  type ModelProvider,
} from '@core/models/catalog';
import type {
  GenerativeProviderAdapter,
  ProviderConnectionProfile,
  ProviderConnectionResult,
  ProviderRequest,
  ProviderResponse,
} from './types';
import { ProviderExecutionError } from './types';
import { estimateMaximumModelCost, requireUsableCostEstimate } from '@core/models/cost';

interface ProviderCostApprovalRequest {
  provider: ModelProvider;
  providerModelId: string;
  operation: ProviderRequest['operation'];
  prompt: string;
  inputs?: ProviderRequest['inputs'];
  interactionId?: string;
  systemInstruction?: string;
  config?: Record<string, unknown>;
  costApproval: {
    maximumChargeUsd: number;
    currency: 'USD';
    confidence: 'exact' | 'upper-bound';
    sourceUrl: string;
    verifiedDate: string;
    providerModelId: string;
    calculationInputs: NonNullable<ProviderRequest['costContext']>;
  };
}

export interface PrivilegedProviderBridge {
  approveProviderCost(input: ProviderCostApprovalRequest): Promise<string>;
  testProviderConnection(input: {
    profile: ProviderConnectionProfile;
    providerModelId?: string;
  }): Promise<ProviderConnectionResult>;
  executeProvider(input: {
    provider: ModelProvider;
    providerModelId: string;
    operation: ProviderRequest['operation'];
    prompt: string;
    inputs?: ProviderRequest['inputs'];
    interactionId?: string;
    systemInstruction?: string;
    config?: Record<string, unknown>;
    approvalToken: string;
    profile?: ProviderConnectionProfile;
  }): Promise<
    ProviderResponse & { failure?: ProviderConnectionResult['failure']; message?: string }
  >;
  executeInteraction?(input: {
    provider: 'gemini-api';
    providerModelId: string;
    operation: 'video' | 'video-edit';
    prompt: string;
    inputs?: ProviderRequest['inputs'];
    interactionId?: string;
    systemInstruction?: string;
    config?: Record<string, unknown>;
    approvalToken: string;
  }): Promise<
    ProviderResponse & { failure?: ProviderConnectionResult['failure']; message?: string }
  >;
}

export class ElectronBridgeAdapter implements GenerativeProviderAdapter {
  constructor(
    readonly provider: ModelProvider,
    private readonly bridge: PrivilegedProviderBridge,
    private readonly profile?: ProviderConnectionProfile,
  ) {}

  supports(model: ModelCatalogEntry): boolean {
    if (!getProviderBinding(model.id, this.provider)) return false;
    return (
      model.capabilities.operations.some((operation) =>
        ['plan', 'review', 'image', 'tts'].includes(operation),
      ) ||
      (this.provider === 'gemini-api' &&
        Boolean(this.bridge.executeInteraction) &&
        model.capabilities.supportsInteraction === true)
    );
  }

  testConnection(
    profile: ProviderConnectionProfile,
    model?: ModelCatalogEntry,
  ): Promise<ProviderConnectionResult> {
    return this.bridge.testProviderConnection({
      profile,
      providerModelId: model ? getProviderBinding(model.id, this.provider)?.modelId : undefined,
    });
  }

  async execute(request: ProviderRequest): Promise<ProviderResponse> {
    const providerModelId =
      getProviderBinding(request.model.id, this.provider)?.modelId ?? request.model.providerModelId;
    const isInteraction =
      (request.operation === 'video' || request.operation === 'video-edit') &&
      this.provider === 'gemini-api' &&
      this.bridge.executeInteraction;
    if (!request.costContext) throw new Error('Provider execution requires cost inputs.');
    const minimumInputTokens = Math.max(
      1,
      Math.ceil(
        (request.prompt.length +
          (request.inputs ?? []).reduce((total, input) => total + input.data.length, 0)) /
          3,
      ),
    );
    const calculationInputs = {
      ...request.costContext,
      estimatedInputTokens: Math.max(
        request.costContext.estimatedInputTokens ?? 0,
        minimumInputTokens,
      ),
    };
    const estimate = estimateMaximumModelCost(request.model, calculationInputs);
    const maximumChargeUsd = requireUsableCostEstimate(estimate);
    const approvalRequest: ProviderCostApprovalRequest = {
      provider: this.provider,
      providerModelId,
      operation: request.operation,
      prompt: request.prompt,
      inputs: request.inputs,
      interactionId: request.interactionId,
      systemInstruction: request.systemInstruction,
      config: request.config,
      costApproval: {
        maximumChargeUsd,
        currency: 'USD',
        confidence: estimate.confidence === 'exact' ? 'exact' : 'upper-bound',
        sourceUrl: estimate.source.sourceUrl,
        verifiedDate: estimate.source.verifiedDate,
        providerModelId,
        calculationInputs,
      },
    };
    const approvalToken = await this.bridge.approveProviderCost(approvalRequest);
    const response = isInteraction
      ? await this.bridge.executeInteraction!({
          provider: 'gemini-api',
          providerModelId,
          operation: request.operation as 'video' | 'video-edit',
          prompt: request.prompt,
          inputs: request.inputs,
          interactionId: request.interactionId,
          systemInstruction: request.systemInstruction,
          config: request.config,
          approvalToken,
        })
      : await this.bridge.executeProvider({
          provider: this.provider,
          providerModelId,
          operation: request.operation,
          prompt: request.prompt,
          inputs: request.inputs,
          interactionId: request.interactionId,
          systemInstruction: request.systemInstruction,
          config: request.config,
          approvalToken,
          ...(this.profile ? { profile: this.profile } : {}),
        });
    if (response.failure) {
      throw new ProviderExecutionError(
        response.message ?? `Provider execution failed: ${response.failure}`,
        response.failure,
      );
    }
    return response;
  }
}

export const getDesktopProviderBridge = (): PrivilegedProviderBridge | null => {
  const electron = typeof window === 'undefined' ? undefined : window.electron;
  if (!electron?.testProviderConnection || !electron.executeProvider) return null;
  if (!electron.approveProviderCost) return null;
  return {
    approveProviderCost: electron.approveProviderCost,
    testProviderConnection: electron.testProviderConnection,
    executeProvider: electron.executeProvider,
    executeInteraction: electron.executeInteraction,
  };
};
