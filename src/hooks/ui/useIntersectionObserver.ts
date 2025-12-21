/**
 * useIntersectionObserver Hook
 *
 * Custom hook for observing element visibility using IntersectionObserver.
 * Used for lazy rendering of components.
 *
 * @module hooks/ui/useIntersectionObserver
 */

import { type RefObject, useEffect, useRef, useState } from 'react';

interface UseIntersectionObserverOptions {
  /** Threshold for triggering visibility (0-1) */
  threshold?: number;
  /** Margin around the root element */
  rootMargin?: string;
  /** If true, observer disconnects after first visibility */
  triggerOnce?: boolean;
  /** Root element for intersection (null = viewport) */
  root?: Element | null;
}

interface UseIntersectionObserverReturn<T extends Element> {
  ref: RefObject<T | null>;
  isVisible: boolean;
}

/**
 * Custom hook for observing element visibility using IntersectionObserver
 * Used for lazy rendering of TokenCard canvases
 *
 * @param options - Configuration options
 * @returns Object with ref to attach to element and isVisible state
 *
 * @example
 * const { ref, isVisible } = useIntersectionObserver<HTMLDivElement>({
 *   rootMargin: '200px',
 *   triggerOnce: true
 * })
 *
 * return <div ref={ref}>{isVisible && <ExpensiveComponent />}</div>
 */
export function useIntersectionObserver<T extends Element = HTMLDivElement>(
  options: UseIntersectionObserverOptions = {}
): UseIntersectionObserverReturn<T> {
  const { threshold = 0.1, rootMargin = '200px', triggerOnce = true, root = null } = options;

  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);
  const hasTriggered = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // If triggerOnce and already triggered, don't re-observe
    if (triggerOnce && hasTriggered.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        const isIntersecting = entry.isIntersecting;

        if (isIntersecting) {
          setIsVisible(true);
          hasTriggered.current = true;

          // Disconnect if triggerOnce is enabled
          if (triggerOnce) {
            observer.disconnect();
          }
        } else if (!triggerOnce) {
          // Only set to false if not using triggerOnce
          setIsVisible(false);
        }
      },
      {
        root,
        rootMargin,
        threshold,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [root, rootMargin, threshold, triggerOnce]);

  return { ref, isVisible };
}

export default useIntersectionObserver;
