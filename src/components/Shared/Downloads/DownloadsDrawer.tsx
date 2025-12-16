/**
 * DownloadsDrawer Component
 *
 * A slide-out drawer from the right edge of the screen.
 * Triple-dot tab on the right edge, panel slides out on hover.
 *
 * @module components/Shared/Downloads/DownloadsDrawer
 */

import { memo, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { type DownloadItem, useDownloadsContext } from '../../../contexts/DownloadsContext';
import styles from '../../../styles/components/shared/DownloadsDrawer.module.css';

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

  // Handle mouse leave - close after small delay
  const handleMouseLeave = useCallback(() => {
    clearCloseTimeout();
    closeTimeoutRef.current = setTimeout(() => {
      closeDrawer();
    }, 150); // Small delay to allow moving to drawer
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

  // Don't render if no downloads are registered
  if (downloads.length === 0) return null;

  const drawerContent = (
    <div
      ref={containerRef}
      className={`${styles.container} ${isOpen ? styles.containerOpen : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Edge Tab - chevron hugging the right edge */}
      <div
        className={`${styles.edgeTab} ${isOpen ? styles.edgeTabOpen : ''}`}
        aria-label={isOpen ? 'Close downloads' : 'Open downloads'}
        aria-expanded={isOpen}
        aria-controls="downloads-drawer"
      >
        <span className={styles.edgeChevron}>{isOpen ? '›' : '‹'}</span>
      </div>

      {/* Drawer Panel */}
      <div
        id="downloads-drawer"
        className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ''}`}
        role="dialog"
        aria-label="Downloads"
        aria-hidden={!isOpen}
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
          {downloads.map((item) => (
            <DownloadItemCard
              key={item.id}
              item={item}
              isExecuting={executingId === item.id}
              onExecute={() => handleExecute(item)}
            />
          ))}
        </div>
      </div>
    </div>
  );

  return createPortal(drawerContent, document.body);
});

export default DownloadsDrawer;
