/**
 * DownloadCard Component
 *
 * Reusable download item card with icon, label, description,
 * and loading/disabled states. Used in ExportView download sections.
 *
 * @module components/ViewComponents/ExportComponents/DownloadCard
 */

import type { DownloadItem } from '@/contexts/DownloadsContext';
import styles from '@/styles/components/views/ExportDownloads.module.css';

export interface DownloadCardProps {
  /** The download item to display */
  item: DownloadItem;
  /** Whether this download is currently executing */
  isExecuting: boolean;
  /** Callback when card is clicked */
  onExecute: () => void;
  /** Visual variant */
  variant?: 'default' | 'featured' | 'download-all';
}

/**
 * Card component for a single download item.
 *
 * @example
 * ```tsx
 * <DownloadCard
 *   item={downloadItem}
 *   isExecuting={executingId === downloadItem.id}
 *   onExecute={() => executeDownload(downloadItem)}
 *   variant="featured"
 * />
 * ```
 */
export function DownloadCard({ item, isExecuting, onExecute, variant = 'default' }: DownloadCardProps) {
  const isDisabled = item.disabled || isExecuting;
  const showComingSoon = item.disabled && item.disabledReason?.toLowerCase().includes('coming');

  const cardClasses = [
    styles.downloadCard,
    variant === 'featured' && styles.downloadCardFeatured,
    variant === 'download-all' && styles.downloadAllCard,
    isDisabled && styles.disabled,
    isExecuting && styles.executing,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={cardClasses}
      onClick={onExecute}
      disabled={isDisabled}
      title={item.disabled ? item.disabledReason : item.description}
      aria-busy={isExecuting}
    >
      <span className={styles.cardIcon}>{item.icon}</span>
      <div className={styles.cardContent}>
        <span className={styles.cardLabel}>{item.label}</span>
        <span className={styles.cardDescription}>
          {showComingSoon ? 'Coming Soon' : item.description}
        </span>
      </div>
      <span className={styles.cardAction}>
        {isExecuting ? (
          <span className={styles.spinner} aria-label="Downloading..." />
        ) : showComingSoon ? (
          <span className={styles.comingSoonBadge}>Soon</span>
        ) : (
          <span className={styles.downloadIcon} aria-hidden="true">
            ↓
          </span>
        )}
      </span>
    </button>
  );
}

export default DownloadCard;
