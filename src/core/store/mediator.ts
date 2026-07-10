/**
 * Store Mediator — Event Bus for Cross-Store Communication
 *
 * Decouples Zustand stores by providing a typed publish/subscribe mechanism.
 * Stores emit events instead of importing each other directly, preventing
 * cyclic dependencies and enabling loose coupling.
 *
 * Usage:
 *   // In a store action — emit an event
 *   storeMediator.emit('prompt:updated', { promptState });
 *
 *   // In another store or hook — subscribe
 *   const unsub = storeMediator.on('prompt:updated', (payload) => { ... });
 *   // Call unsub() to unsubscribe
 */

import { logger } from '@core/services/loggerService';

// ─── Event Map ───────────────────────────────────────────────────────────────

export interface StoreMediatorEvents {
  // Prompt domain
  'prompt:updated': { field: string; value: unknown };
  'prompt:reset': undefined;
  'prompt:qualityScored': { score: number; breakdown: Record<string, number> };

  // Project domain
  'project:loaded': { projectId: string };
  'project:saved': { projectId: string };
  'project:closed': undefined;

  // Timeline domain
  'timeline:shotAdded': { shotId: number };
  'timeline:shotRemoved': { shotId: number };
  'timeline:clipMoved': { clipId: string; trackId: string };

  // History domain
  'history:entryAdded': { entryId: string };
  'history:restored': { entryId: string };

  // Video generation domain
  'video:generationStarted': { taskId: string };
  'video:generationCompleted': { taskId: string; status: string };

  // Director Mode production domain
  'production:runUpdated': {
    runId: string;
    projectId: string;
    status: import('@core/types').ProductionRunStatus;
  };
  'production:runDeleted': { runId: string; projectId: string };
  'production:takeAccepted': { runId: string; shotId: number; takeId: string };

  // Composer domain
  'composer:evaluated': { blockCount: number };
  'composer:snapshotRestored': { snapshotId: string };

  // Settings domain
  'settings:changed': { key: string; value: unknown };

  // Collaboration domain
  'collaboration:peerJoined': { peerId: string };
  'collaboration:peerLeft': { peerId: string };
  'collaboration:stateReceived': { peerId: string };
}

// ─── Types ───────────────────────────────────────────────────────────────────

type EventName = keyof StoreMediatorEvents;
type EventPayload<E extends EventName> = StoreMediatorEvents[E];
type EventHandler<E extends EventName> = (payload: EventPayload<E>) => void;
type Unsubscribe = () => void;

interface MediatorOptions {
  maxListeners?: number;
  debug?: boolean;
}

// ─── Mediator Class ──────────────────────────────────────────────────────────

class StoreMediator {
  private listeners = new Map<EventName, Set<EventHandler<EventName>>>();
  private readonly maxListeners: number;
  private readonly debug: boolean;

  constructor(options: MediatorOptions = {}) {
    this.maxListeners = options.maxListeners ?? 100;
    this.debug = options.debug ?? false;
  }

  on<E extends EventName>(event: E, handler: EventHandler<E>): Unsubscribe {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    const handlers = this.listeners.get(event)!;

    if (handlers.size >= this.maxListeners) {
      logger.warn(`StoreMediator: listener limit (${this.maxListeners}) reached for "${event}"`);
    }

    handlers.add(handler as EventHandler<EventName>);

    return () => {
      handlers.delete(handler as EventHandler<EventName>);
      if (handlers.size === 0) {
        this.listeners.delete(event);
      }
    };
  }

  once<E extends EventName>(event: E, handler: EventHandler<E>): Unsubscribe {
    const wrapper = ((payload: EventPayload<E>) => {
      unsub();
      handler(payload);
    }) as EventHandler<E>;

    const unsub = this.on(event, wrapper);
    return unsub;
  }

  emit<E extends EventName>(
    event: E,
    ...args: EventPayload<E> extends undefined ? [] : [EventPayload<E>]
  ): void {
    const handlers = this.listeners.get(event);

    if (this.debug) {
      logger.debug(`StoreMediator: emit "${event}" → ${handlers?.size ?? 0} listener(s)`);
    }

    if (!handlers || handlers.size === 0) return;

    const payload = args[0] as EventPayload<E>;

    for (const handler of handlers) {
      try {
        (handler as EventHandler<E>)(payload);
      } catch (error) {
        logger.error(`StoreMediator: error in handler for "${event}"`, undefined, error);
      }
    }
  }

  off<E extends EventName>(event: E, handler?: EventHandler<E>): void {
    if (!handler) {
      this.listeners.delete(event);
      return;
    }

    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler as EventHandler<EventName>);
      if (handlers.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  listenerCount(event: EventName): number {
    return this.listeners.get(event)?.size ?? 0;
  }

  clear(): void {
    this.listeners.clear();
  }
}

// ─── Singleton Export ────────────────────────────────────────────────────────

export const storeMediator = new StoreMediator();

// Re-export class for testing
export { StoreMediator };
