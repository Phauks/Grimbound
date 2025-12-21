/**
 * FeaturedDownloads Component
 *
 * Always-visible section showcasing the most important downloads.
 * Features larger, more prominent cards with accent styling.
 *
 * @module components/ViewComponents/ExportComponents/FeaturedDownloads
 */

import type { DownloadItem } from '@/contexts/DownloadsContext';
import styles from '@/styles/components/views/ExportDownloads.module.css';
import { DownloadCard } from './DownloadCard';

export interface FeaturedDownloadsProps {
  /** Featured download items to display */
  items: DownloadItem[];
  /** Currently executing download ID */
  executingId: string | null;
  /** Callback to execute a download */
  onExecute: (item: DownloadItem) => void;
}

/**
 * Featured downloads section that's always visible at the top.
 * Uses larger cards with accent styling to highlight important downloads.
 *
 * @example
 * ```tsx
 * <FeaturedDownloads
 *   items={[printSheetItem, nightOrderItem, playerScriptItem]}
 *   executingId={executingId}
 *   onExecute={executeDownload}
 * />
 * ```
 */
export function FeaturedDownloads({ items, executingId, onExecute }: FeaturedDownloadsProps) {
  // Don't render if no featured items
  if (items.length === 0) {
    return null;
  }

  return (
    <section className={styles.featuredSection} aria-labelledby="featured-downloads-title">
      <header className={styles.featuredHeader}>
        <span className={styles.featuredIcon} aria-hidden="true">
          ⭐
        </span>
        <h2 id="featured-downloads-title" className={styles.featuredTitle}>
          Featured Downloads
        </h2>
      </header>

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
    </section>
  );
}

export default FeaturedDownloads;
