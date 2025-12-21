/**
 * DownloadsDrawer Component
 *
 * A slide-out drawer from the right edge of the screen.
 * Triple-dot tab on the right edge, panel slides out on hover.
 *
 * @module components/Shared/Downloads/DownloadsDrawer
 */

import JSZip from 'jszip';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { type BundleData, type DownloadItem, useDownloadsContext } from '@/contexts/DownloadsContext';
import styles from '@/styles/components/shared/DownloadsDrawer.module.css';
import { downloadFile } from '@/ts/utils/imageUtils';

/**
 * Individual download item card
 */
const DownloadItemCard = memo(function DownloadItemCard({
  item,
  isExecuting,
  onExecute,
}: {
  item: DownloadItem;
  isExecuting: boolean;
  onExecute: () => void;
}) {
  return (
    <button
      type="button"
      className={`${styles.downloadItem} ${item.disabled ? styles.disabled : ''} ${isExecuting ? styles.executing : ''}`}
      onClick={onExecute}
      disabled={item.disabled || isExecuting}
      title={item.disabled ? item.disabledReason : item.label}
    >
      <span className={styles.itemIcon}>{item.icon}</span>
      <div className={styles.itemContent}>
        <span className={styles.itemLabel}>{item.label}</span>
        <span className={styles.itemDescription}>
          {item.disabled ? item.disabledReason : item.description}
        </span>
      </div>
      <span className={styles.itemAction}>
        {isExecuting ? (
          <span className={styles.spinner} />
        ) : (
          <span className={styles.downloadIcon}>↓</span>
        )}
      </span>
    </button>
  );
});

/**
 * Main Downloads Drawer component
 */
export const DownloadsDrawer = memo(function DownloadsDrawer() {
  const { downloads, isOpen, openDrawer, closeDrawer, executingId, executeDownload } =
    useDownloadsContext();

  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);

  // All registered downloads are individual downloads
  const individualDownloads = downloads;

  // Check if any downloads are enabled
  const enabledDownloads = individualDownloads.filter((d) => !d.disabled);
  const hasEnabledDownloads = enabledDownloads.length > 0;
  const hasMultipleDownloads = individualDownloads.length > 1;

  // Download All handler - creates a combined ZIP of all enabled downloads
  const handleDownloadAll = useCallback(async () => {
    if (!hasEnabledDownloads || isDownloadingAll) return;

    setIsDownloadingAll(true);
    try {
      // Check if all items support getBlob for bundling
      const bundleableItems = enabledDownloads.filter((d) => d.getBlob);

      if (bundleableItems.length === enabledDownloads.length && bundleableItems.length > 0) {
        // All items support bundling - create a combined ZIP
        const zip = new JSZip();

        for (const item of bundleableItems) {
          const result = await item.getBlob!();
          if (result) {
            // Handle both single and array results
            const items: BundleData[] = Array.isArray(result) ? result : [result];
            for (const { blob, filename } of items) {
              zip.file(filename, blob);
            }
          }
        }

        // Generate and download the combined ZIP
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        downloadFile(zipBlob, 'downloads.zip');
      } else {
        // Fallback: execute each download action separately
        for (const item of enabledDownloads) {
          await item.action();
        }
      }
    } finally {
      setIsDownloadingAll(false);
    }
  }, [enabledDownloads, hasEnabledDownloads, isDownloadingAll]);

  // Clear any pending close timeout
  const clearCloseTimeout = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  // Handle mouse enter - open immediately
  const handleMouseEnter = useCallback(() => {
    clearCloseTimeout();
    openDrawer();
  }, [openDrawer, clearCloseTimeout]);

  // Handle mouse leave - close after delay to prevent finicky behavior
  const handleMouseLeave = useCallback(() => {
    clearCloseTimeout();
    closeTimeoutRef.current = setTimeout(() => {
      closeDrawer();
    }, 300); // Longer delay for smoother UX
  }, [closeDrawer, clearCloseTimeout]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => clearCloseTimeout();
  }, [clearCloseTimeout]);

  // Handle escape key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeDrawer();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeDrawer]);

  const handleExecute = useCallback(
    (item: DownloadItem) => {
      executeDownload(item);
    },
    [executeDownload]
  );

  // Don't render if no downloads are registered (Projects, Studio, Export views)
  if (downloads.length === 0) return null;

  const drawerContent = (
    <section
      ref={containerRef}
      className={`${styles.container} ${isOpen ? styles.containerOpen : ''}`}
      tabIndex={-1}
      aria-label="Downloads drawer"
    >
      {/* Edge Tab - download icon hugging the right edge */}
      <button
        type="button"
        className={`${styles.edgeTab} ${isOpen ? styles.edgeTabOpen : ''}`}
        aria-expanded={isOpen}
        aria-controls="downloads-drawer"
        aria-label="Downloads"
        tabIndex={0}
        onClick={isOpen ? closeDrawer : openDrawer}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="currentColor"
          aria-hidden="true"
          className={styles.edgeIcon}
        >
          <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
        </svg>
        <span className={styles.edgeChevron}>{isOpen ? '›' : '‹'}</span>
      </button>

      {/* Drawer Panel */}
      <div
        id="downloads-drawer"
        className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ''}`}
        role="dialog"
        aria-label="Downloads"
        aria-hidden={!isOpen}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>
            <span className={styles.titleIcon}>📥</span>
            Downloads
          </h2>
        </div>

        {/* Download Items */}
        <div className={styles.content}>
          {/* Individual Downloads */}
          {individualDownloads.map((item) => (
            <DownloadItemCard
              key={item.id}
              item={item}
              isExecuting={executingId === item.id}
              onExecute={() => handleExecute(item)}
            />
          ))}

          {/* Download All - shown when there are multiple downloads */}
          {hasMultipleDownloads && (
            <button
              type="button"
              className={`${styles.downloadItem} ${styles.downloadAll} ${!hasEnabledDownloads ? styles.disabled : ''} ${isDownloadingAll ? styles.executing : ''}`}
              onClick={handleDownloadAll}
              disabled={!hasEnabledDownloads || isDownloadingAll}
            >
              <span className={styles.itemIcon}>📥</span>
              <div className={styles.itemContent}>
                <span className={styles.itemLabel}>Download All</span>
                <span className={styles.itemDescription}>
                  {enabledDownloads.length} item{enabledDownloads.length !== 1 ? 's' : ''}
                </span>
              </div>
              <span className={styles.itemAction}>
                {isDownloadingAll ? (
                  <span className={styles.spinner} />
                ) : (
                  <span className={styles.downloadIcon}>↓</span>
                )}
              </span>
            </button>
          )}
        </div>
      </div>
    </section>
  );

  return createPortal(drawerContent, document.body);
});

export default DownloadsDrawer;
