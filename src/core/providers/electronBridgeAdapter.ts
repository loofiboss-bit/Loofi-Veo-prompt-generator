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

export interface PrivilegedProviderBridge {
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
    profile?: ProviderConnectionProfile;
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
    return (
      Boolean(getProviderBinding(model.id, this.provider)) &&
      model.capabilities.operations.some((operation) =>
        ['plan', 'review', 'image', 'tts'].includes(operation),
      )
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
    const response = await this.bridge.executeProvider({
      provider: this.provider,
      providerModelId:
        getProviderBinding(request.model.id, this.provider)?.modelId ??
        request.model.providerModelId,
      operation: request.operation,
      prompt: request.prompt,
      inputs: request.inputs,
      interactionId: request.interactionId,
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
  return {
    testProviderConnection: electron.testProviderConnection,
    executeProvider: electron.executeProvider,
  };
};
