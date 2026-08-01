import { describe, expect, it } from 'vitest';
import { routeModel } from './router';

describe('routeModel', () => {
  it('uses Veo quality when a request requires first and last frames', () => {
    const decision = routeModel({
      operation: 'video',
      mode: 'smart',
      requiresFirstLastFrame: true,
    });
    expect(decision.model.id).toBe('veo-3.1-quality');
    expect(decision.fallback?.id).toBe('veo-3.1-fast');
  });

  it('does not route reference-image requests to Veo Lite', () => {
    const decision = routeModel({
      operation: 'video',
      mode: 'economy',
      requiresReferenceImages: true,
    });
    expect(decision.model.id).toBe('veo-3.1-fast');
  });

  it('uses Omni Flash only for conversational video revisions', () => {
    const decision = routeModel({ operation: 'video-edit', mode: 'smart', conversational: true });
    expect(decision.model.id).toBe('gemini-omni-flash');
  });

  it('prefers Omni Flash for ordinary unconstrained video generation', () => {
    const decision = routeModel({ operation: 'video', mode: 'smart', requestedResolution: '720p' });
    expect(decision.model.id).toBe('gemini-omni-flash');
    expect(decision.reason).toContain('recommended general video model');
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
