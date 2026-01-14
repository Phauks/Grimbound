/**
 * DraggableAsset Component
 *
 * Asset tile that can be dragged and dropped onto folders.
 *
 * @module components/Shared/Assets/DraggableAsset
 */

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import styles from '@/styles/components/shared/FolderNavigationGrid.module.css';
import { TAG_TYPE_ICONS } from '@/ts/services/upload/constants.js';
import { getTypeFromTags } from '@/ts/services/upload/tagUtils.js';
import type { AssetWithUrl } from '@/ts/services/upload/types.js';
import { cn } from '@/ts/utils/classNames.js';

// ============================================================================
// Types
// ============================================================================

export interface DraggableAssetProps {
  /** Asset to display */
  asset: AssetWithUrl;
  /** Whether asset is selected */
  isSelected: boolean;
  /** Called when asset is clicked */
  onClick: () => void;
  /** Called when asset is double-clicked */
  onDoubleClick?: () => void;
  /** Whether this asset can be dragged (default: true) */
  isDraggable?: boolean;
  /** Called when asset is right-clicked */
  onContextMenu?: (asset: AssetWithUrl, position: { x: number; y: number }) => void;
}

// ============================================================================
// Component
// ============================================================================

export function DraggableAsset({
  asset,
  isSelected,
  onClick,
  onDoubleClick,
  isDraggable = true,
  onContextMenu,
}: DraggableAssetProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: asset.id,
    disabled: !isDraggable,
  });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined;

  const assetType = getTypeFromTags(asset.tags);
  const typeIcon = assetType ? TAG_TYPE_ICONS[assetType] : '📄';
  const isStarred = asset.tags.includes('starred');

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onContextMenu?.(asset, { x: e.clientX, y: e.clientY });
  };

  return (
    <article
      ref={setNodeRef}
      className={cn(styles.assetTile, isSelected && styles.selected, isDragging && styles.dragging)}
      style={style}
      onContextMenu={handleContextMenu}
      {...(isDraggable ? listeners : {})}
      {...(isDraggable ? attributes : {})}
    >
      {/* Thumbnail area */}
      <button
        type="button"
        className={styles.assetThumbnail}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
      >
        <img
          src={asset.thumbnailUrl || asset.url}
          alt={asset.metadata.filename}
          className={styles.assetImage}
          loading="lazy"
        />
        {/* Type badge */}
        <span className={styles.assetTypeBadge}>{typeIcon}</span>
        {/* Star indicator */}
        {isStarred && <span className={styles.assetStar}>⭐</span>}
      </button>

      {/* Filename bar */}
      <span className={styles.assetName}>{asset.metadata.filename}</span>
    </article>
  );
}
