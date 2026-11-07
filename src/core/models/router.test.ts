import { describe, expect, it } from 'vitest';
import { routeModel } from './router';

describe('routeModel', () => {
  it('uses Veo quality when a request requires first and last frames', () => {
    const decision = routeModel({
      operation: 'video',
      provider: 'vertex-ai',
      mode: 'smart',
      requiresFirstLastFrame: true,
    });
    expect(decision.model.id).toBe('veo-3.1-quality');
    expect(decision.fallback?.id).toBe('veo-3.1-fast');
  });

  it('does not route reference-image requests to Veo Lite', () => {
    const decision = routeModel({
      operation: 'video',
      provider: 'vertex-ai',
      mode: 'economy',
      requiresReferenceImages: true,
    });
    expect(decision.model.id).toBe('veo-3.1-fast');
  });

  it('uses Omni Flash only for conversational video revisions', () => {
    const decision = routeModel({ operation: 'video-edit', mode: 'smart', conversational: true });
    expect(decision.model.id).toBe('gemini-omni-1.2-flash');
    expect(decision.fallback?.id).toBe('gemini-omni-1.1-flash');
  });

  it('preserves explicitly selected active Vertex Veo routing', () => {
    const decision = routeModel({
      operation: 'video',
      provider: 'vertex-ai',
      mode: 'smart',
      requestedResolution: '720p',
    });
    expect(decision.model.id).toBe('veo-3.1-fast');
    expect(decision.fallback?.id).toBe('veo-3.1-quality');
    expect(decision.reason).toContain('durable video generation');
  });

  it('treats the active Vertex GA binding independently from the retired Gemini preview', () => {
    expect(
      routeModel({ operation: 'video', provider: 'vertex-ai', mode: 'smart', allowPreview: false })
        .model.id,
    ).toBe('veo-3.1-fast');
  });

  it('rejects shut-down Gemini Veo routes without silently switching providers', () => {
    expect(() => routeModel({ operation: 'video', mode: 'smart' })).toThrow(
      'No priced general video model',
    );
    expect(() =>
      routeModel({ operation: 'video', mode: 'manual', requestedModelId: 'veo-3.1-fast' }),
    ).toThrow('unavailable');
  });

  it('uses the current stable Flash-Lite for economy planning', () => {
    expect(routeModel({ operation: 'plan', mode: 'economy' }).model.id).toBe(
      'gemini-3.5-flash-lite',
    );
  });

  it('respects a compatible user override and rejects incompatible or retired choices', () => {
    expect(
      routeModel({
        operation: 'plan',
        mode: 'manual',
        requestedModelId: 'gemini-3.1-flash-lite',
      }).model.id,
    ).toBe('gemini-3.1-flash-lite');
    expect(() =>
      routeModel({
        operation: 'video',
        mode: 'manual',
        requestedModelId: 'gemini-3.5-flash',
      }),
    ).toThrow('incompatible');
  });

  it('uses only available models and handles preview restrictions explicitly', () => {
    expect(
      routeModel({
        operation: 'plan',
        mode: 'smart',
        availableModelIds: ['gemini-3.5-flash'],
      }).model.id,
    ).toBe('gemini-3.5-flash');
    expect(() => routeModel({ operation: 'video', mode: 'smart', allowPreview: false })).toThrow(
      'No priced general video model',
    );
  });
});
