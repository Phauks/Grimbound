/**
 * AssetContextMenu Component
 *
 * Right-click context menu for asset operations.
 *
 * @module components/Shared/Assets/AssetContextMenu
 */

import { useEffect, useRef } from 'react';
import styles from '@/styles/components/shared/AssetContextMenu.module.css';
import type { AssetWithUrl } from '@/ts/services/upload/types.js';

// ============================================================================
// Types
// ============================================================================

export interface AssetContextMenuProps {
  /** Asset to show menu for */
  asset: AssetWithUrl;
  /** Position of the menu */
  position: { x: number; y: number };
  /** Whether the asset is read-only (built-in) */
  isReadOnly?: boolean;
  /** Called when menu should close */
  onClose: () => void;
  /** Called when rename is clicked */
  onRename?: (asset: AssetWithUrl) => void;
  /** Called when delete is clicked */
  onDelete?: (asset: AssetWithUrl) => void;
  /** Called when duplicate/copy is clicked */
  onDuplicate?: (asset: AssetWithUrl) => void;
  /** Called when download is clicked */
  onDownload?: (asset: AssetWithUrl) => void;
}

// ============================================================================
// Component
// ============================================================================

export function AssetContextMenu({
  asset,
  position,
  isReadOnly = false,
  onClose,
  onRename,
  onDelete,
  onDuplicate,
  onDownload,
}: AssetContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Adjust position to stay within viewport
  useEffect(() => {
    if (!menuRef.current) return;
    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Adjust if menu goes off right edge
    if (rect.right > viewportWidth) {
      menu.style.left = `${viewportWidth - rect.width - 8}px`;
    }

    // Adjust if menu goes off bottom edge
    if (rect.bottom > viewportHeight) {
      menu.style.top = `${viewportHeight - rect.height - 8}px`;
    }
  }, []);

  const handleRename = () => {
    onRename?.(asset);
    onClose();
  };

  const handleDelete = () => {
    onDelete?.(asset);
    onClose();
  };

  const handleDuplicate = () => {
    onDuplicate?.(asset);
    onClose();
  };

  const handleDownload = () => {
    onDownload?.(asset);
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className={styles.contextMenu}
      style={{ left: position.x, top: position.y }}
      role="menu"
      aria-label="Asset actions"
    >
      {/* Rename - disabled for read-only */}
      {onRename && (
        <button
          type="button"
          className={styles.menuItem}
          onClick={handleRename}
          disabled={isReadOnly}
          role="menuitem"
        >
          <span className={styles.menuIcon}>✏️</span>
          Rename
        </button>
      )}

      {/* Download */}
      {onDownload && (
        <button type="button" className={styles.menuItem} onClick={handleDownload} role="menuitem">
          <span className={styles.menuIcon}>⬇️</span>
          Download
        </button>
      )}

      {/* Duplicate/Copy */}
      {onDuplicate && (
        <button type="button" className={styles.menuItem} onClick={handleDuplicate} role="menuitem">
          <span className={styles.menuIcon}>📋</span>
          Duplicate
        </button>
      )}

      {/* Separator */}
      {onDelete && <div className={styles.separator} />}

      {/* Delete - disabled for read-only */}
      {onDelete && (
        <button
          type="button"
          className={`${styles.menuItem} ${styles.danger}`}
          onClick={handleDelete}
          disabled={isReadOnly}
          role="menuitem"
        >
          <span className={styles.menuIcon}>🗑️</span>
          Delete
        </button>
      )}
    </div>
  );
}
