import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AiCoDirectorService } from './aiCoDirectorService';
import { useAppStore } from '@core/store/useAppStore';

vi.mock('@core/services/apiKeyService', () => ({
  getStoredApiKeyAsync: vi.fn().mockResolvedValue(null), // Test offline fallback mode
}));

describe('aiCoDirectorService', () => {
  let service: AiCoDirectorService;

  beforeEach(() => {
    service = new AiCoDirectorService();
  });

  it('initializes in disconnected status', () => {
    expect(service.getStatus()).toBe('disconnected');
    expect(service.getConfig().model).toBe('gemini-3.8-live');
  });

  it('notifies status listeners on connection', async () => {
    const statusListener = vi.fn();
    service.onStatusChange(statusListener);

    const connected = await service.connect();
    expect(connected).toBe(true);
    expect(statusListener).toHaveBeenCalledWith('connecting');
    expect(statusListener).toHaveBeenCalledWith('listening');
    expect(service.getStatus()).toBe('listening');
  });

  it('dispatches setCameraRig and mutates store promptState and shots', () => {
    const actionListener = vi.fn();
    service.onAction(actionListener);

    const res = service.dispatchToolCall('setCameraRig', {
      lens: '50mm-natural',
      aperture: 'f/1.8',
      trajectory: 'orbit-clockwise',
    });

    expect(res.status).toBe('success');
    expect(actionListener).toHaveBeenCalledWith(
      expect.objectContaining({
        toolName: 'setCameraRig',
        success: true,
      }),
    );

    const state = useAppStore.getState();
    expect(state.promptState.spatialCamera?.lens).toBe('50mm-natural');
    expect(state.promptState.spatialCamera?.aperture).toBe('f/1.8');
    expect(state.promptState.spatialCamera?.trajectory).toBe('orbit-clockwise');
  });

  it('dispatches setSceneAesthetics and updates lighting', () => {
    const res = service.dispatchToolCall('setSceneAesthetics', {
      lighting: 'cinematic neon backlight with wet reflections',
      mood: 'neo-noir suspense',
    });

    expect(res.status).toBe('success');
    const state = useAppStore.getState();
    expect(state.promptState.lightingStyle).toBe('cinematic neon backlight with wet reflections');
    expect(state.promptState.characterMood).toBe('neo-noir suspense');
  });

  it('dispatches createOrModifyShot and adds a new shot to timeline', () => {
    const initialCount = useAppStore.getState().sbShots.length;

    const res = service.dispatchToolCall('createOrModifyShot', {
      action: 'Kuriren rusar upp på taket i hällregn',
      camera: 'dolly push-in',
      duration: 6,
    });

    expect(res.status).toBe('success');
    const afterShots = useAppStore.getState().sbShots;
    expect(afterShots.length).toBe(initialCount + 1);
    expect(afterShots[afterShots.length - 1].action).toBe('Kuriren rusar upp på taket i hällregn');
  });

  it('processes natural Swedish directive and triggers camera mutations', () => {
    const result = service.processLocalDirective(
      'Gör scenen mer intim med ett 50mm objektiv och motljus',
    );

    expect(result.responseSpeech).toContain('50mm');
    expect(result.responseSpeech).toContain('motljus');
    expect(result.actions.length).toBeGreaterThanOrEqual(1);

    const state = useAppStore.getState();
    expect(state.promptState.spatialCamera?.lens).toBe('50mm-natural');
  });

  it('processes trajectory directives like FPV drone dive', () => {
    const result = service.processLocalDirective('Lägg till en drönardykning');

    expect(result.responseSpeech).toContain('fpv-drone-dive');
    const state = useAppStore.getState();
    expect(state.promptState.spatialCamera?.trajectory).toBe('fpv-drone-dive');
  });

  it('sends directive and emits message history', async () => {
    const messageListener = vi.fn();
    service.onMessage(messageListener);

    await service.sendDirective('Byt till 85mm porträttobjektiv');

    // User message and Director response should be emitted
    expect(messageListener).toHaveBeenCalledWith(
      expect.objectContaining({
        sender: 'user',
        text: 'Byt till 85mm porträttobjektiv',
      }),
    );
  });
});
