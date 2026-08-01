import { describe, expect, it, vi } from 'vitest';
import { getModel } from '@core/models/catalog';
import { ElectronBridgeAdapter, type PrivilegedProviderBridge } from './electronBridgeAdapter';

const model = (id: string) => {
  const entry = getModel(id);
  if (!entry) throw new Error(`missing fixture model ${id}`);
  return entry;
};

describe('ElectronBridgeAdapter', () => {
  it('passes provider IDs to the privileged bridge without credentials', async () => {
    const bridge: PrivilegedProviderBridge = {
      approveProviderCost: vi.fn().mockResolvedValue('approval-token'),
      testProviderConnection: vi.fn(),
      executeProvider: vi.fn().mockResolvedValue({ rawModelId: 'gemini-3.1-pro-preview' }),
    };
    const adapter = new ElectronBridgeAdapter('gemini-api', bridge);
    await adapter.execute({
      operation: 'plan',
      model: model('gemini-3.1-pro'),
      prompt: 'Plan.',
      costContext: {
        approvedCeilingUsd: 0.02,
        estimatedInputTokens: 100,
        estimatedOutputTokens: 1_000,
      },
    });
    expect(bridge.executeProvider).toHaveBeenCalledWith({
      provider: 'gemini-api',
      providerModelId: 'gemini-3.1-pro-preview',
      operation: 'plan',
      prompt: 'Plan.',
      inputs: undefined,
      interactionId: undefined,
      approvalToken: 'approval-token',
    });
  });

  it('does not claim desktop video support before the paid-job adapter is selected', () => {
    const bridge = {
      approveProviderCost: vi.fn(),
      testProviderConnection: vi.fn(),
      executeProvider: vi.fn(),
    };
    const adapter = new ElectronBridgeAdapter('gemini-api', bridge);
    expect(adapter.supports(model('gemini-3.5-flash'))).toBe(true);
    expect(adapter.supports(model('veo-3.1-fast'))).toBe(false);
  });

  it('uses the Vertex-specific model binding and passes only the non-secret profile', async () => {
    const bridge: PrivilegedProviderBridge = {
      approveProviderCost: vi.fn().mockResolvedValue('approval-token'),
      testProviderConnection: vi.fn(),
      executeProvider: vi.fn().mockResolvedValue({ rawModelId: 'gemini-3.1-pro' }),
    };
    const profile = {
      id: 'vertex-production',
      provider: 'vertex-ai' as const,
      label: 'Production',
      projectId: 'studio-project-123',
      location: 'europe-west4',
    };
    const adapter = new ElectronBridgeAdapter('vertex-ai', bridge, profile);
    expect(adapter.supports(model('gemini-3.1-pro'))).toBe(true);
    await adapter.execute({
      operation: 'plan',
      model: model('gemini-3.1-pro'),
      prompt: 'Plan.',
      costContext: {
        approvedCeilingUsd: 0.02,
        estimatedInputTokens: 100,
        estimatedOutputTokens: 1_000,
      },
    });
    expect(bridge.executeProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'vertex-ai',
        providerModelId: 'gemini-3.1-pro',
        profile,
      }),
    );
  });

  it('routes Omni follow-up revisions through the privileged Interactions bridge', async () => {
    const bridge: PrivilegedProviderBridge = {
      approveProviderCost: vi.fn().mockResolvedValue('approval-token'),
      testProviderConnection: vi.fn(),
      executeProvider: vi.fn(),
      executeInteraction: vi.fn().mockResolvedValue({
        rawModelId: 'gemini-omni-flash-preview',
        interactionId: 'interaction-child',
      }),
    };
    const adapter = new ElectronBridgeAdapter('gemini-api', bridge);
    expect(adapter.supports(model('gemini-omni-flash'))).toBe(true);
    await adapter.execute({
      operation: 'video-edit',
      model: model('gemini-omni-flash'),
      prompt: 'Slow the camera.',
      interactionId: 'interaction-parent',
      costContext: {
        approvedCeilingUsd: 0.2,
        estimatedInputTokens: 100,
        videoDurationSeconds: 1,
        videoResolution: '720p',
      },
    });
    expect(bridge.executeProvider).not.toHaveBeenCalled();
    expect(bridge.executeInteraction).toHaveBeenCalledWith(
      expect.objectContaining({
        providerModelId: 'gemini-omni-flash-preview',
        interactionId: 'interaction-parent',
      }),
    );
  });
});
