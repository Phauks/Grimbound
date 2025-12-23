/**
 * FeaturedDownloads Component
 *
 * Collapsible section showcasing the most important downloads.
 * Features larger, more prominent cards with accent styling.
 *
 * @module components/ViewComponents/ExportComponents/FeaturedDownloads
 */

import { useState } from 'react';
import type { DownloadItem } from '@/contexts/DownloadsContext';
import styles from '@/styles/components/export/DownloadComponents.module.css';
import { DownloadCard } from './DownloadCard';

export interface FeaturedDownloadsProps {
  /** Featured download items to display */
  items: DownloadItem[];
  /** Currently executing download ID */
  executingId: string | null;
  /** Callback to execute a download */
  onExecute: (item: DownloadItem) => void;
  /** Initial expanded state */
  defaultOpen?: boolean;
}

/**
 * Featured downloads section with collapsible header.
 * Uses larger cards with accent styling to highlight important downloads.
 *
 * @example
 * ```tsx
 * <FeaturedDownloads
 *   items={[printSheetItem, nightOrderItem, playerScriptItem]}
 *   executingId={executingId}
 *   onExecute={executeDownload}
 *   defaultOpen={true}
 * />
 * ```
 */
export function FeaturedDownloads({
  items,
  executingId,
  onExecute,
  defaultOpen = true,
}: FeaturedDownloadsProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Don't render if no featured items
  if (items.length === 0) {
    return null;
  }

  return (
    <section className={styles.featuredSection} aria-labelledby="featured-downloads-title">
      <button
        type="button"
        className={styles.featuredHeader}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span
          className={`${styles.featuredArrow} ${isOpen ? styles.featuredArrowOpen : ''}`}
          aria-hidden="true"
        >
          ▶
        </span>
        <span className={styles.featuredIcon} aria-hidden="true">
          ⭐
        </span>
        <h2 id="featured-downloads-title" className={styles.featuredTitle}>
          Featured Downloads
        </h2>
        <span className={styles.featuredCount}>{items.length}</span>
      </button>

      {isOpen && (
        <>
          <div className={styles.featuredGrid}>
            {items.map((item) => (
              <DownloadCard
                key={item.id}
                item={item}
                isExecuting={executingId === item.id}
                onExecute={() => onExecute(item)}
                variant="featured"
              />
            ))}
          </div>

          <div className={styles.infoBanner}>
            <span className={styles.infoBannerIcon} aria-hidden="true">
              ℹ️
            </span>
            <span className={styles.infoBannerText}>
              PDF Token Sheets are compatible with Avery Presta 94500 (1") and 94509 (1.75") Labels
            </span>
          </div>
        </>
      )}
    </section>
  );
}

export default FeaturedDownloads;
