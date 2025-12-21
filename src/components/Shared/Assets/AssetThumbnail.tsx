/**
 * AssetThumbnail Component
 *
 * Displays an asset as a thumbnail card in the Asset Manager grid.
 * Shows preview, metadata, and context menu for actions.
 *
 * @module components/Shared/AssetThumbnail
 */

import { useCallback, useMemo, useState } from 'react';
import { useContextMenu } from '@/hooks';
import styles from '@/styles/components/shared/AssetThumbnail.module.css';
import {
  ASSET_TYPE_ICONS,
  ASSET_TYPE_LABELS,
  type AssetType,
  type AssetWithUrl,
} from '@/ts/services/upload/index.js';
import { ContextMenu, type ContextMenuItem } from '@/components/Shared/UI/ContextMenu';

// Asset types for reclassify submenu
const ASSET_TYPES: AssetType[] = [
  'character-icon',
  'token-background',
  'script-background',
  'setup-overlay',
  'accent',
  'logo',
];

// ============================================================================
// Types
// ============================================================================

export interface AssetThumbnailProps {
  /** Asset to display */
  asset: AssetWithUrl;
  /** Whether this asset is selected */
  isSelected?: boolean;
  /** Callback when selection changes */
  onSelect?: (id: string) => void;
  /** Callback when delete is clicked */
  onDelete?: (id: string) => void;
  /** Callback when rename is clicked */
  onRename?: (id: string) => void;
  /** Callback when download is clicked */
  onDownload?: (id: string) => void;
  /** Callback when duplicate is clicked */
  onDuplicate?: (id: string) => void;
  /** Callback when reclassify is clicked */
  onReclassify?: (id: string, newType: AssetType) => void;
  /** Callback when promote to global is clicked */
  onPromoteToGlobal?: (id: string) => void;
  /** Whether to show selection checkbox */
  showSelect?: boolean;
  /** Whether actions are disabled */
  disabled?: boolean;
  /** Size variant */
  size?: 'small' | 'medium' | 'large';
}

// ============================================================================
// Helpers
// ============================================================================

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ============================================================================
// Component
// ============================================================================

export function AssetThumbnail({
  asset,
  isSelected = false,
  onSelect,
  onDelete,
  onRename,
  onDownload,
  onDuplicate,
  onReclassify,
  onPromoteToGlobal,
  showSelect = true,
  disabled = false,
  size = 'medium',
}: AssetThumbnailProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Context menu hook
  const contextMenu = useContextMenu();

  // Handle checkbox change
  const handleCheckboxChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      e.stopPropagation();
      onSelect?.(asset.id);
    },
    [asset.id, onSelect]
  );

  // Handle card click - always trigger onSelect if available (for selection mode)
  const handleClick = useCallback(() => {
    if (!disabled && onSelect) {
      onSelect(asset.id);
    }
  }, [asset.id, disabled, onSelect]);

  // Handle context menu
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        contextMenu.open(e);
      }
    },
    [disabled, contextMenu]
  );

  // Handle image error
  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  // Build context menu items
  const contextMenuItems = useMemo((): ContextMenuItem[] => {
    const items: ContextMenuItem[] = [];

    if (onRename) {
      items.push({
        icon: '✏️',
        label: 'Rename',
        onClick: () => onRename(asset.id),
      });
    }

    if (onReclassify) {
      items.push({
        icon: '🏷️',
        label: 'Reclassify',
        description: 'Change asset type',
        submenu: ASSET_TYPES.map((type) => ({
          icon: ASSET_TYPE_ICONS[type],
          label: ASSET_TYPE_LABELS[type],
          onClick: () => onReclassify(asset.id, type),
          disabled: type === asset.type,
        })),
      });
    }

    if (onDownload) {
      items.push({
        icon: '⬇️',
        label: 'Download',
        onClick: () => onDownload(asset.id),
      });
    }

    if (onDuplicate) {
      items.push({
        icon: '📋',
        label: 'Duplicate',
        onClick: () => onDuplicate(asset.id),
      });
    }

    if (onPromoteToGlobal && asset.projectId !== null) {
      items.push({
        icon: '🌐',
        label: 'Make Global',
        description: 'Make this asset available globally',
        onClick: () => onPromoteToGlobal(asset.id),
      });
    }

    if (onDelete) {
      items.push({
        icon: '🗑️',
        label: 'Delete',
        variant: 'danger',
        onClick: () => onDelete(asset.id),
      });
    }

    return items;
  }, [
    asset.id,
    asset.type,
    asset.projectId,
    onRename,
    onReclassify,
    onDownload,
    onDuplicate,
    onPromoteToGlobal,
    onDelete,
  ]);

  // Build class names
  const cardClasses = [
    styles.card,
    isSelected ? styles.selected : '',
    isHovered ? styles.hovered : '',
    disabled ? styles.disabled : '',
    styles[size],
  ]
    .filter(Boolean)
    .join(' ');

  const isGlobal = asset.projectId === null;
  // Provide fallbacks for unknown asset types (backward compatibility)
  const typeIcon = ASSET_TYPE_ICONS[asset.type] ?? '📄';
  const typeLabel = ASSET_TYPE_LABELS[asset.type] ?? asset.type;

  return (
    <>
      <button
        type="button"
        className={cardClasses}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
            e.preventDefault();
            handleClick();
          }
        }}
        disabled={disabled}
        aria-label={`${asset.metadata.filename} - ${typeLabel}`}
        tabIndex={disabled ? -1 : 0}
      >
        {/* Thumbnail Image */}
        <div className={styles.thumbnailWrapper}>
          {imageError ? (
            <div className={styles.imageFallback}>
              <span>{typeIcon}</span>
            </div>
          ) : (
            <img
              src={asset.thumbnailUrl}
              alt={asset.metadata.filename}
              className={styles.thumbnail}
              onError={handleImageError}
              loading="lazy"
            />
          )}

          {/* Selection Checkbox */}
          {showSelect && (
            <div className={styles.checkboxWrapper}>
              <input
                type="checkbox"
                checked={isSelected}
                onChange={handleCheckboxChange}
                className={styles.checkbox}
                disabled={disabled}
                aria-label={`Select ${asset.metadata.filename}`}
              />
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className={styles.info}>
          <p className={styles.filename} title={asset.metadata.filename}>
            {asset.metadata.filename}
          </p>
          <div className={styles.meta}>
            <span className={styles.typeBadge} title={typeLabel}>
              {typeIcon} {typeLabel}
            </span>
            <span className={styles.size}>{formatFileSize(asset.metadata.size)}</span>
          </div>
          <div className={styles.scopeRow}>
            <span className={isGlobal ? styles.globalBadge : styles.projectBadge}>
              {isGlobal ? '🌐 Global' : '📁 Project'}
            </span>
            {asset.linkedTo.length > 0 && (
              <span
                className={styles.usedBy}
                title={`Used by ${asset.linkedTo.length} character(s)`}
              >
                Used: {asset.linkedTo.length}
              </span>
            )}
          </div>
        </div>
      </button>

      {/* Context Menu */}
      <ContextMenu
        ref={contextMenu.menuRef}
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        items={contextMenuItems}
        onClose={contextMenu.close}
      />
    </>
  );
}

export default AssetThumbnail;
