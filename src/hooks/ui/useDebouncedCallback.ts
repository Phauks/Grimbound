/**
 * useDebouncedCallback Hook
 *
 * A hook that returns a debounced version of a callback function.
 * Handles cleanup on unmount and always calls the latest callback version
 * to avoid stale closure issues.
 *
 * @module hooks/ui/useDebouncedCallback
 */

import { useEffect, useRef } from 'react';
import { type DebouncedFunction, debounce } from '@/ts/utils/asyncUtils.js';

// ============================================
// Types
// ============================================

export interface UseDebouncedCallbackOptions {
  /** Debounce delay in milliseconds */
  delay: number;
  /** Whether debouncing is disabled (calls immediately) */
  disabled?: boolean;
}

export interface UseDebouncedCallbackResult<T extends (...args: never[]) => void> {
  /** The debounced function - call this instead of the original */
  debouncedFn: (...args: Parameters<T>) => void;
  /** Cancel any pending debounced call (useful for onBlur) */
  cancel: () => void;
  /** Flush: cancel pending and call immediately with latest args */
  flush: (...args: Parameters<T>) => void;
}

// ============================================
// Hook Implementation
// ============================================

/**
 * Creates a debounced version of a callback that:
 * - Delays execution until `delay` ms after the last call
 * - Always uses the latest callback (no stale closures)
 * - Cleans up on unmount
 * - Provides cancel() for manual cancellation
 *
 * @example
 * ```tsx
 * const { debouncedFn, cancel } = useDebouncedCallback(
 *   (value: string) => {
 *     // This always has access to latest state
 *     saveToServer(value, currentUser);
 *   },
 *   { delay: 500 }
 * );
 *
 * const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
 *   setValue(e.target.value);
 *   debouncedFn(e.target.value);
 * };
 *
 * const handleBlur = () => {
 *   cancel(); // Cancel pending debounce
 *   saveImmediately(); // Or use flush()
 * };
 * ```
 */
export function useDebouncedCallback<T extends (...args: never[]) => void>(
  callback: T,
  options: UseDebouncedCallbackOptions
): UseDebouncedCallbackResult<T> {
  const { delay, disabled = false } = options;

  // Store the latest callback in a ref to avoid stale closures
  const callbackRef = useRef<T>(callback);
  callbackRef.current = callback;

  // Store the debounced function in a ref (created once, stable identity)
  const debouncedRef = useRef<DebouncedFunction<T> | null>(null);

  // Store last args for flush functionality
  const lastArgsRef = useRef<Parameters<T> | null>(null);

  // Create the debounced function once (or when delay changes)
  useEffect(() => {
    // Create wrapper that calls the latest callback
    const wrapper = ((...args: Parameters<T>) => {
      callbackRef.current(...args);
    }) as T;

    debouncedRef.current = debounce(wrapper, delay);

    return () => {
      debouncedRef.current?.cancel();
    };
  }, [delay]);

  // The stable function to call
  const debouncedFn = (...args: Parameters<T>): void => {
    lastArgsRef.current = args;

    if (disabled) {
      // If disabled, call immediately
      callbackRef.current(...args);
    } else {
      debouncedRef.current?.(...args);
    }
  };

  // Cancel any pending call
  const cancel = (): void => {
    debouncedRef.current?.cancel();
  };

  // Cancel pending and call immediately with provided args
  const flush = (...args: Parameters<T>): void => {
    debouncedRef.current?.cancel();
    callbackRef.current(...args);
  };

  return {
    debouncedFn,
    cancel,
    flush,
  };
}
