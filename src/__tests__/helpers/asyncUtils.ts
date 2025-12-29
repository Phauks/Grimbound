/**
 * Async utilities for testing.
 */

/**
 * Wait for a specific amount of time.
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait for next tick (microtask queue to flush).
 */
export function nextTick(): Promise<void> {
  return Promise.resolve();
}

/**
 * Flush all pending promises and timers.
 * Useful for testing async operations.
 */
export async function flushPromises(): Promise<void> {
  await nextTick();
  await nextTick();
}

/**
 * Wait for a condition to become true.
 *
 * @param condition - Function that returns true when condition is met
 * @param timeout - Maximum time to wait in ms (default: 1000)
 * @param interval - Check interval in ms (default: 50)
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 1000,
  interval = 50
): Promise<void> {
  const startTime = Date.now();

  while (true) {
    const result = await condition();
    if (result) return;

    if (Date.now() - startTime >= timeout) {
      throw new Error(`Condition not met within ${timeout}ms`);
    }

    await wait(interval);
  }
}

/**
 * Deferred promise type for testing async flows.
 */
export interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
}

/**
 * Create a deferred promise for testing async flows.
 */
export function createDeferred<T>(): Deferred<T> {
  const deferred: Partial<Deferred<T>> = {};

  deferred.promise = new Promise<T>((res, rej) => {
    deferred.resolve = res;
    deferred.reject = rej;
  });

  return deferred as Deferred<T>;
}
