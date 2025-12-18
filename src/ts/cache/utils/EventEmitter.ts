/**
 * Simple EventEmitter implementation for browser environments.
 * Provides basic pub/sub functionality without Node.js dependencies.
 */

import { logger } from '@/ts/utils/logger.js';

/**
 * Type-safe event listener function
 * Uses rest parameters with unknown type for safety
 */
type EventListener<T extends unknown[] = unknown[]> = (...args: T) => void;

/**
 * Event map type for defining event names and their parameter types
 * @example
 * ```typescript
 * interface MyEvents {
 *   'data-loaded': [data: string, count: number];
 *   'error': [error: Error];
 *   'complete': [];
 * }
 * const emitter = new EventEmitter<MyEvents>();
 * ```
 */
export type EventMap = Record<string, unknown[]>;

/**
 * Default event map when no type is specified
 */
export type DefaultEventMap = Record<string, unknown[]>;

/**
 * Simple event emitter for browser environments with optional type safety.
 * Can be used with a typed event map for compile-time safety, or without for dynamic events.
 *
 * @template TEventMap - Optional event map defining event names and parameter types
 */
export class EventEmitter<TEventMap extends EventMap = DefaultEventMap> {
  private events = new Map<keyof TEventMap | string, Set<EventListener>>();

  /**
   * Register an event listener.
   * @param event - Event name
   * @param listener - Listener function
   */
  on<K extends keyof TEventMap | string>(
    event: K,
    listener: K extends keyof TEventMap ? EventListener<TEventMap[K]> : EventListener<unknown[]>
  ): this {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(listener as EventListener);
    return this;
  }

  /**
   * Register a one-time event listener.
   * @param event - Event name
   * @param listener - Listener function
   */
  once<K extends keyof TEventMap | string>(
    event: K,
    listener: K extends keyof TEventMap ? EventListener<TEventMap[K]> : EventListener<unknown[]>
  ): this {
    const onceListener: EventListener<unknown[]> = (...args: unknown[]) => {
      (listener as EventListener<unknown[]>)(...args);
      this.off(
        event,
        onceListener as K extends keyof TEventMap
          ? EventListener<TEventMap[K]>
          : EventListener<unknown[]>
      );
    };
    return this.on(
      event,
      onceListener as K extends keyof TEventMap
        ? EventListener<TEventMap[K]>
        : EventListener<unknown[]>
    );
  }

  /**
   * Unregister an event listener.
   * @param event - Event name
   * @param listener - Listener function to remove
   */
  off<K extends keyof TEventMap | string>(
    event: K,
    listener: K extends keyof TEventMap ? EventListener<TEventMap[K]> : EventListener<unknown[]>
  ): this {
    const listeners = this.events.get(event);
    if (listeners) {
      listeners.delete(listener as EventListener);
      if (listeners.size === 0) {
        this.events.delete(event);
      }
    }
    return this;
  }

  /**
   * Emit an event with arguments.
   * @param event - Event name
   * @param args - Arguments to pass to listeners
   */
  emit<K extends keyof TEventMap | string>(
    event: K,
    ...args: K extends keyof TEventMap ? TEventMap[K] : unknown[]
  ): boolean {
    const listeners = this.events.get(event);
    if (!listeners || listeners.size === 0) {
      return false;
    }

    for (const listener of listeners) {
      try {
        listener(...args);
      } catch (error) {
        logger.error('EventEmitter', `Error in event listener for '${String(event)}'`, error);
      }
    }

    return true;
  }

  /**
   * Remove all listeners for an event, or all listeners if no event specified.
   * @param event - Event name (optional)
   */
  removeAllListeners<K extends keyof TEventMap | string>(event?: K): this {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
    return this;
  }

  /**
   * Get count of listeners for an event.
   * @param event - Event name
   * @returns Number of listeners
   */
  listenerCount<K extends keyof TEventMap | string>(event: K): number {
    return this.events.get(event)?.size ?? 0;
  }
}
