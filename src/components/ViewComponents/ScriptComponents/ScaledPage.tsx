/**
 * Scaled Page Component
 *
 * Wrapper that scales content for WYSIWYG preview.
 * Uses ResizeObserver to detect container size changes and
 * applies CSS transform to scale content proportionally.
 *
 * The content is rendered at a fixed reference size (680px × 880px)
 * and scaled down to fit smaller containers, ensuring text and
 * layout remain proportional at any zoom level or viewport size.
 */

import { type ReactNode, useEffect, useRef, useState } from 'react';
import styles from '@/styles/components/script/NightOrderView.module.css';

/** Reference dimensions the content is designed for */
const REFERENCE_WIDTH = 680;

interface ScaledPageProps {
  /** Content to render inside the scaled page */
  children: ReactNode;
}

export function ScaledPage({ children }: ScaledPageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const calculateScale = (width: number) => {
      // Scale down to fit, but never scale up beyond 1
      const newScale = Math.min(1, width / REFERENCE_WIDTH);
      setScale(newScale);
    };

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        calculateScale(entry.contentRect.width);
      }
    });

    observer.observe(container);

    // Initial calculation
    const rect = container.getBoundingClientRect();
    calculateScale(rect.width);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className={styles.page}>
      <div className={styles.pageScaler} style={{ transform: `scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
}
