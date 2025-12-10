/**
 * Simple EventEmitter implementation for browser environments.
 * Provides basic pub/sub functionality without Node.js dependencies.
 */

type EventListener = (...args: any[]) => void

/**
 * Simple event emitter for browser environments.
 */
export class EventEmitter {
  private events = new Map<string, Set<EventListener>>()

  /**
   * Register an event listener.
   * @param event - Event name
   * @param listener - Listener function
   */
  on(event: string, listener: EventListener): this {
    if (!this.events.has(event)) {
      this.events.set(event, new Set())
    }
    this.events.get(event)!.add(listener)
    return this
  }

  /**
   * Register a one-time event listener.
   * @param event - Event name
   * @param listener - Listener function
   */
  once(event: string, listener: EventListener): this {
    const onceListener = (...args: any[]) => {
      listener(...args)
      this.off(event, onceListener)
    }
    return this.on(event, onceListener)
  }

  /**
   * Unregister an event listener.
   * @param event - Event name
   * @param listener - Listener function to remove
   */
  off(event: string, listener: EventListener): this {
    const listeners = this.events.get(event)
    if (listeners) {
      listeners.delete(listener)
      if (listeners.size === 0) {
        this.events.delete(event)
      }
    }
    return this
  }

  /**
   * Emit an event with arguments.
   * @param event - Event name
   * @param args - Arguments to pass to listeners
   */
  emit(event: string, ...args: any[]): boolean {
    const listeners = this.events.get(event)
    if (!listeners || listeners.size === 0) {
      return false
    }

    for (const listener of listeners) {
      try {
        listener(...args)
      } catch (error) {
        console.error(`Error in event listener for '${event}':`, error)
      }
    }

    return true
  }

  /**
   * Remove all listeners for an event, or all listeners if no event specified.
   * @param event - Event name (optional)
   */
  removeAllListeners(event?: string): this {
    if (event) {
      this.events.delete(event)
    } else {
      this.events.clear()
    }
    return this
  }

  /**
   * Get count of listeners for an event.
   * @param event - Event name
   * @returns Number of listeners
   */
  listenerCount(event: string): number {
    return this.events.get(event)?.size ?? 0
  }
}
