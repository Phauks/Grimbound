/**
 * SortableImageUrlRow Component
 *
 * A sortable row for image URL input with thumbnail preview.
 * Uses @dnd-kit for drag-and-drop reordering.
 *
 * @module components/CharactersComponents/TokenEditor/SortableImageUrlRow
 */

import { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import styles from '@/styles/components/characterEditor/TokenEditor.module.css';

interface SortableImageUrlRowProps {
  /** Unique ID for dnd-kit */
  id: string;
  /** Image URL value */
  url: string;
  /** Resolved URL for display (handles official character images) */
  resolvedUrl?: string | null;
  /** Index in the list */
  index: number;
  /** Whether this is the currently previewed variant */
  isPreviewActive: boolean;
  /** Whether editing is disabled */
  disabled: boolean;
  /** Whether there are multiple images (enables drag) */
  canDrag: boolean;
  /** Handle URL text change */
  onChange: (index: number, value: string) => void;
  /** Handle blur (commit changes) */
  onBlur: () => void;
  /** Handle click on thumbnail to preview */
  onPreviewClick: (index: number, url: string) => void;
  /** Handle remove/clear */
  onRemove: (index: number) => void;
  /** Whether this is the last remaining item */
  isLastItem: boolean;
}

export const SortableImageUrlRow = memo(function SortableImageUrlRow({
  id,
  url,
  resolvedUrl,
  index,
  isPreviewActive,
  disabled,
  canDrag,
  onChange,
  onBlur,
  onPreviewClick,
  onRemove,
  isLastItem,
}: SortableImageUrlRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: disabled || !canDrag,
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  const dragHandleProps = canDrag && !disabled
    ? {
        ...attributes,
        ...listeners,
        style: { cursor: 'grab' } as React.CSSProperties,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.imageUrlRow} ${isDragging ? styles.dragging : ''}`}
    >
      <span
        className={styles.dragHandle}
        title={canDrag ? 'Drag to reorder' : ''}
        {...dragHandleProps}
      >
        ⋮⋮
      </span>

      {url.trim() && (
        <button
          type="button"
          className={`${styles.inlineThumbnail} ${isPreviewActive ? styles.thumbnailActive : ''}`}
          onClick={() => onPreviewClick(index, url)}
          title="Click to preview this variant"
        >
          <img
            src={resolvedUrl || url}
            alt={`Preview ${index + 1}`}
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23333" width="100" height="100"/><text fill="%23999" x="50" y="55" text-anchor="middle" font-size="14">?</text></svg>';
            }}
          />
        </button>
      )}

      <input
        type="text"
        value={url}
        disabled={disabled}
        onChange={(e) => onChange(index, e.target.value)}
        onBlur={onBlur}
        placeholder="URL to character image"
      />

      <button
        type="button"
        className={`${styles.btnIcon} ${styles.btnDanger}`}
        onClick={() => onRemove(index)}
        disabled={disabled}
        title={
          disabled
            ? 'Official character - cannot edit'
            : isLastItem
              ? 'Clear URL'
              : 'Remove URL'
        }
      >
        ✕
      </button>
    </div>
  );
});

export default SortableImageUrlRow;
