/**
 * AssetPreviewPanel Component
 *
 * Right panel showing full preview and metadata for selected asset.
 * Includes token preview, tags editing, and action buttons.
 *
 * @module components/Shared/Assets/AssetPreviewPanel
 */

import { type KeyboardEvent, useState } from 'react';
import styles from '@/styles/components/shared/AssetPreviewPanel.module.css';
import { TAG_TYPE_ICONS } from '@/ts/services/upload/constants.js';
import { getTypeFromTags, getTypeLabel, isSystemTag } from '@/ts/services/upload/tagUtils.js';
import type { AssetWithUrl } from '@/ts/services/upload/types.js';
import { cn } from '@/ts/utils/classNames.js';

// ============================================================================
// Types
// ============================================================================

export interface AssetPreviewPanelProps {
  /** Currently selected asset (null if none selected) */
  asset: AssetWithUrl | null;
  /** Token preview URL (generated token with this asset) */
  tokenPreviewUrl?: string | null;
  /** Whether to show token preview section */
  showTokenPreview?: boolean;
  /** Whether this is in selection mode (show Apply/Cancel) */
  selectionMode?: boolean;
  /** Called when Apply is clicked in selection mode */
  onApply?: (asset: AssetWithUrl) => void;
  /** Called when Cancel is clicked in selection mode */
  onCancel?: () => void;
  /** Called when a tag is added */
  onAddTag?: (assetId: string, tag: string) => void;
  /** Called when a tag is removed */
  onRemoveTag?: (assetId: string, tag: string) => void;
  /** Called when starred status is toggled */
  onToggleStar?: (assetId: string) => void;
  /** Additional CSS class */
  className?: string;
}

// ============================================================================
// Helpers
// ============================================================================

function formatFileSize(bytes: number | undefined): string {
  if (!bytes) return 'Unknown';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDimensions(width?: number, height?: number): string {
  if (!(width && height)) return 'Unknown';
  return `${width} × ${height}`;
}

// ============================================================================
// Component
// ============================================================================

export function AssetPreviewPanel({
  asset,
  tokenPreviewUrl,
  showTokenPreview = false,
  selectionMode = false,
  onApply,
  onCancel,
  onAddTag,
  onRemoveTag,
  onToggleStar,
  className,
}: AssetPreviewPanelProps) {
  const [tagInput, setTagInput] = useState('');

  // All hooks must be called before any early return
  const handleAddTag = () => {
    if (!asset) return;
    const trimmed = tagInput.trim().toLowerCase();
    if (trimmed && onAddTag) {
      onAddTag(asset.id, trimmed);
      setTagInput('');
    }
  };

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleApply = () => {
    if (onApply && asset) {
      onApply(asset);
    }
  };

  // Empty state - after all hooks
  if (!asset) {
    return (
      <aside className={cn(styles.panel, className)} aria-label="Asset preview">
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>🖼️</span>
          <span className={styles.emptyText}>Select an asset to preview</span>
        </div>
      </aside>
    );
  }

  const assetType = getTypeFromTags(asset.tags);
  const typeIcon = assetType ? TAG_TYPE_ICONS[assetType] : '📄';
  const typeLabel = assetType ? getTypeLabel(assetType) : 'Unknown';
  const isStarred = asset.tags.includes('starred');

  // Separate system tags from user tags
  const userTags = asset.tags.filter((tag) => !isSystemTag(tag) && tag !== 'starred');

  return (
    <aside className={cn(styles.panel, className)} aria-label="Asset preview">
      {/* Preview image */}
      <div className={styles.previewSection}>
        <img
          src={asset.url ?? asset.thumbnailUrl}
          alt={asset.metadata?.filename ?? 'Asset preview'}
          className={styles.previewImage}
        />

        {/* Token preview */}
        {showTokenPreview && tokenPreviewUrl && (
          <div className={styles.tokenPreview}>
            <div className={styles.tokenPreviewLabel}>Token Preview</div>
            <img src={tokenPreviewUrl} alt="Token preview" className={styles.tokenPreviewImage} />
          </div>
        )}
      </div>

      {/* Metadata section */}
      <div className={styles.metadataSection}>
        <h3 className={styles.filename}>{asset.metadata?.filename ?? 'Untitled'}</h3>

        <div className={styles.metaList}>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Type</span>
            <span className={cn(styles.metaValue, styles.metaType)}>
              <span className={styles.metaTypeIcon}>{typeIcon}</span>
              {typeLabel}
            </span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Size</span>
            <span className={styles.metaValue}>{formatFileSize(asset.metadata?.size)}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Dimensions</span>
            <span className={styles.metaValue}>
              {formatDimensions(asset.metadata?.width, asset.metadata?.height)}
            </span>
          </div>
          {asset.folder && (
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Folder</span>
              <span className={styles.metaValue}>📁 {asset.folder}</span>
            </div>
          )}
        </div>

        {/* Tags section */}
        <div className={styles.tagsSection}>
          <div className={styles.tagsSectionTitle}>Tags</div>
          <div className={styles.tagsList}>
            {/* Type tag (system, not removable) */}
            {assetType && (
              <span className={cn(styles.tag, styles.system)}>
                {typeIcon} {typeLabel}
              </span>
            )}
            {/* User tags */}
            {userTags.map((tag) => (
              <span key={tag} className={styles.tag}>
                {tag}
                {onRemoveTag && (
                  <button
                    type="button"
                    className={styles.tagRemove}
                    onClick={() => onRemoveTag(asset.id, tag)}
                    aria-label={`Remove tag ${tag}`}
                  >
                    ✕
                  </button>
                )}
              </span>
            ))}
          </div>

          {/* Add tag input */}
          {onAddTag && (
            <div className={styles.addTagInput}>
              <input
                type="text"
                className={styles.tagInput}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Add tag..."
                maxLength={30}
              />
              <button
                type="button"
                className={styles.addTagButton}
                onClick={handleAddTag}
                disabled={!tagInput.trim()}
                aria-label="Add tag"
              >
                +
              </button>
            </div>
          )}

          {/* Star button */}
          {onToggleStar && (
            <button
              type="button"
              className={cn(styles.starButton, isStarred && styles.active)}
              onClick={() => onToggleStar(asset.id)}
            >
              {isStarred ? '⭐ Starred' : '☆ Add to Starred'}
            </button>
          )}
        </div>
      </div>

      {/* Action buttons for selection mode */}
      {selectionMode && (
        <div className={styles.actionsSection}>
          <button type="button" className={styles.applyButton} onClick={handleApply}>
            Apply Asset
          </button>
          {onCancel && (
            <button type="button" className={styles.cancelButton} onClick={onCancel}>
              Cancel
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
