/**
 * DownloadSection Component
 *
 * Collapsible section containing download cards with a header,
 * item count badge, and expand/collapse functionality.
 *
 * @module components/ViewComponents/ExportComponents/DownloadSection
 */

import { type ReactNode, useState } from 'react';
import type { DownloadItem } from '@/contexts/DownloadsContext';
import styles from '@/styles/components/export/DownloadComponents.module.css';
import { DownloadCard } from './DownloadCard';

export interface DownloadSectionProps {
  /** Section title */
  title: string;
  /** Section icon (emoji) */
  icon: string;
  /** Download items to display */
  items: DownloadItem[];
  /** Whether the section can be collapsed */
  collapsible?: boolean;
  /** Initial open state (only used when collapsible) */
  defaultOpen?: boolean;
  /** Currently executing download ID */
  executingId: string | null;
  /** Callback to execute a download */
  onExecute: (item: DownloadItem) => void;
  /** Optional children to render instead of default grid */
  children?: ReactNode;
}

/**
 * Collapsible section for grouping related downloads.
 *
 * @example
 * ```tsx
 * <DownloadSection
 *   title="Project Downloads"
 *   icon="📦"
 *   items={projectDownloads}
 *   collapsible
 *   defaultOpen
 *   executingId={executingId}
 *   onExecute={executeDownload}
 * />
 * ```
 */
export function DownloadSection({
  title,
  icon,
  items,
  collapsible = true,
  defaultOpen = true,
  executingId,
  onExecute,
  children,
}: DownloadSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Filter out items with no content if showing a grid
  const enabledItems = items.filter((item) => !item.disabled || item.disabledReason);
  const itemCount = enabledItems.length;

  // Don't render section if no items and no children
  if (itemCount === 0 && !children) {
    return null;
  }

  const handleHeaderClick = () => {
    if (collapsible) {
      setIsOpen(!isOpen);
    }
  };

  return (
    <div className={styles.downloadSection}>
      <button
        type="button"
        className={styles.sectionHeader}
        onClick={handleHeaderClick}
        aria-expanded={isOpen}
        disabled={!collapsible}
      >
        {collapsible && (
          <span
            className={`${styles.sectionArrow} ${isOpen ? styles.sectionArrowOpen : ''}`}
            aria-hidden="true"
          >
            ▶
          </span>
        )}
        <span className={styles.sectionIcon}>{icon}</span>
        <h3 className={styles.sectionTitle}>{title}</h3>
        {itemCount > 0 && <span className={styles.sectionCount}>{itemCount}</span>}
      </button>

      <div className={`${styles.sectionContent} ${isOpen ? styles.sectionContentOpen : ''}`}>
        {children || (
          <div className={styles.downloadGrid}>
            {items.map((item) => (
              <DownloadCard
                key={item.id}
                item={item}
                isExecuting={executingId === item.id}
                onExecute={() => onExecute(item)}
                variant={item.id === 'download-all' ? 'download-all' : 'default'}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default DownloadSection;
