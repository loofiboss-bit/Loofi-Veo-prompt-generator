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

  it('uses Flash-Lite for economy planning', () => {
    expect(routeModel({ operation: 'plan', mode: 'economy' }).model.id).toBe(
      'gemini-3.1-flash-lite',
    );
  });
});
