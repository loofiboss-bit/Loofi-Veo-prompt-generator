import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StoreMediator, storeMediator } from './mediator';

vi.mock('@core/services/loggerService', () => ({
  logger: {
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('StoreMediator', () => {
  let mediator: StoreMediator;

  beforeEach(() => {
    mediator = new StoreMediator();
  });

  it('should emit and receive events with payload', () => {
    const handler = vi.fn();
    mediator.on('prompt:updated', handler);

    mediator.emit('prompt:updated', { field: 'subject', value: 'A sunset' });

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith({ field: 'subject', value: 'A sunset' });
  });

  it('should emit events with undefined payload', () => {
    const handler = vi.fn();
    mediator.on('prompt:reset', handler);

    mediator.emit('prompt:reset');

    expect(handler).toHaveBeenCalledOnce();
  });

  it('should support multiple listeners for the same event', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    mediator.on('project:loaded', handler1);
    mediator.on('project:loaded', handler2);

    mediator.emit('project:loaded', { projectId: 'p1' });

    expect(handler1).toHaveBeenCalledOnce();
    expect(handler2).toHaveBeenCalledOnce();
  });

  it('should unsubscribe via returned function', () => {
    const handler = vi.fn();
    const unsub = mediator.on('prompt:updated', handler);

    unsub();
    mediator.emit('prompt:updated', { field: 'subject', value: 'test' });

    expect(handler).not.toHaveBeenCalled();
  });

  it('should clean up empty event sets after unsubscribe', () => {
    const handler = vi.fn();
    const unsub = mediator.on('prompt:reset', handler);

    expect(mediator.listenerCount('prompt:reset')).toBe(1);
    unsub();
    expect(mediator.listenerCount('prompt:reset')).toBe(0);
  });

  it('should support once() for single-fire listeners', () => {
    const handler = vi.fn();
    mediator.once('video:generationCompleted', handler);

    mediator.emit('video:generationCompleted', { taskId: 't1', status: 'done' });
    mediator.emit('video:generationCompleted', { taskId: 't2', status: 'done' });

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith({ taskId: 't1', status: 'done' });
  });

  it('should not throw when emitting with no listeners', () => {
    expect(() => mediator.emit('prompt:reset')).not.toThrow();
  });

  it('should continue dispatching even if a handler throws', async () => {
    const { logger } = await import('@core/services/loggerService');
    const errorHandler = vi.fn(() => {
      throw new Error('handler error');
    });
    const goodHandler = vi.fn();

    mediator.on('prompt:reset', errorHandler);
    mediator.on('prompt:reset', goodHandler);

    mediator.emit('prompt:reset');

    expect(goodHandler).toHaveBeenCalledOnce();
    expect(logger.error).toHaveBeenCalled();
  });

  it('should remove all listeners for an event via off()', () => {
    mediator.on('settings:changed', vi.fn());
    mediator.on('settings:changed', vi.fn());

    expect(mediator.listenerCount('settings:changed')).toBe(2);
    mediator.off('settings:changed');
    expect(mediator.listenerCount('settings:changed')).toBe(0);
  });

  it('should remove a specific listener via off()', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    mediator.on('settings:changed', handler1);
    mediator.on('settings:changed', handler2);

    mediator.off('settings:changed', handler1);
    mediator.emit('settings:changed', { key: 'theme', value: 'dark' });

    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).toHaveBeenCalledOnce();
  });

  it('should clear all listeners', () => {
    mediator.on('prompt:reset', vi.fn());
    mediator.on('project:closed', vi.fn());
    mediator.on('settings:changed', vi.fn());

    mediator.clear();

    expect(mediator.listenerCount('prompt:reset')).toBe(0);
    expect(mediator.listenerCount('project:closed')).toBe(0);
    expect(mediator.listenerCount('settings:changed')).toBe(0);
  });

  it('should report correct listenerCount', () => {
    expect(mediator.listenerCount('prompt:reset')).toBe(0);

    const unsub1 = mediator.on('prompt:reset', vi.fn());
    mediator.on('prompt:reset', vi.fn());
    expect(mediator.listenerCount('prompt:reset')).toBe(2);

    unsub1();
    expect(mediator.listenerCount('prompt:reset')).toBe(1);
  });

  it('should log warning when maxListeners is reached', async () => {
    const { logger } = await import('@core/services/loggerService');
    const small = new StoreMediator({ maxListeners: 2 });

    small.on('prompt:reset', vi.fn());
    small.on('prompt:reset', vi.fn());
    small.on('prompt:reset', vi.fn()); // exceeds limit

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('listener limit'));
  });

  it('should log events in debug mode', async () => {
    const { logger } = await import('@core/services/loggerService');
    const debugMediator = new StoreMediator({ debug: true });

    debugMediator.emit('prompt:reset');

    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('emit "prompt:reset"'));
  });
});

describe('storeMediator singleton', () => {
  beforeEach(() => {
    storeMediator.clear();
  });

  it('should be a singleton instance', () => {
    expect(storeMediator).toBeInstanceOf(StoreMediator);
  });

  it('should work as a shared instance across modules', () => {
    const handler = vi.fn();
    storeMediator.on('project:loaded', handler);
    storeMediator.emit('project:loaded', { projectId: 'test-123' });

    expect(handler).toHaveBeenCalledWith({ projectId: 'test-123' });
  });
});
