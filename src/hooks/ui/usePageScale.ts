/**
 * usePageScale Hook
 *
 * Calculates scale factor for WYSIWYG page preview.
 * Uses ResizeObserver to track container size changes and
 * computes scale relative to reference dimensions.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

/** Reference dimensions the content is designed for */
const REFERENCE_WIDTH = 680;

export interface UsePageScaleResult {
  /** Ref to attach to the page container */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Current scale factor (0 to 1, where 1 = no scaling needed) */
  scale: number;
  /** Whether the container is being observed */
  isObserving: boolean;
}

/**
 * Hook to calculate scale factor for WYSIWYG page preview
 *
 * @returns Object with containerRef to attach and current scale factor
 */
export function usePageScale(): UsePageScaleResult {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [isObserving, setIsObserving] = useState(false);

  const calculateScale = useCallback((entry: ResizeObserverEntry) => {
    const containerWidth = entry.contentRect.width;
    // Scale down to fit, but never scale up beyond 1
    const newScale = Math.min(1, containerWidth / REFERENCE_WIDTH);
    setScale(newScale);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        calculateScale(entry);
      }
    });

    observer.observe(container);
    setIsObserving(true);

    // Initial calculation
    const rect = container.getBoundingClientRect();
    const initialScale = Math.min(1, rect.width / REFERENCE_WIDTH);
    setScale(initialScale);

    return () => {
      observer.disconnect();
      setIsObserving(false);
    };
  }, [calculateScale]);

  return {
    containerRef,
    scale,
    isObserving,
  };
}
