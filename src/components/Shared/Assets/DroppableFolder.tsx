/**
 * DroppableFolder Component
 *
 * Folder tile that can receive dropped assets and folders.
 * Also supports being dragged into other folders (subfolder creation).
 *
 * @module components/Shared/Assets/DroppableFolder
 */

import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import styles from '@/styles/components/shared/FolderNavigationGrid.module.css';
import { cn } from '@/ts/utils/classNames.js';

// ============================================================================
// Types
// ============================================================================

export interface DroppableFolderProps {
  /** Folder identifier */
  id: string;
  /** Display name */
  name: string;
  /** Icon to display */
  icon: string;
  /** Whether an asset is being dragged over this folder */
  isOver: boolean;
  /** Called when folder is clicked (to navigate into it) */
  onClick: () => void;
  /** Whether this is the back button to root */
  isBackButton?: boolean;
  /** Whether this folder can be dragged (for subfolder support) */
  isDraggable?: boolean;
  /** Whether this folder can receive drops (default: true) */
  isDroppable?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function DroppableFolder({
  id,
  name,
  icon,
  isOver,
  onClick,
  isBackButton = false,
  isDraggable = false,
  isDroppable = true,
}: DroppableFolderProps) {
  // Droppable for receiving assets/folders
  const { setNodeRef: setDropRef, isOver: isDropOver } = useDroppable({
    id: `folder:${id}`,
    disabled: !isDroppable,
  });

  // Draggable for being moved into other folders
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `drag-folder:${id}`,
    disabled: !isDraggable || isBackButton,
  });

  const showDropHighlight = isDroppable && (isOver || isDropOver);

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  // Combine refs for both draggable and droppable
  const setNodeRef = (node: HTMLButtonElement | null) => {
    setDropRef(node);
    setDragRef(node);
  };

  return (
    <button
      ref={setNodeRef}
      type="button"
      className={cn(
        styles.folderTile,
        showDropHighlight && styles.dropTarget,
        isBackButton && styles.backButton,
        isDragging && styles.dragging
      )}
      style={style}
      onClick={onClick}
      {...(isDraggable && !isBackButton ? listeners : {})}
      {...(isDraggable && !isBackButton ? attributes : {})}
    >
      <div className={styles.folderIconArea}>
        <span className={styles.folderTileIcon}>{icon}</span>
        {showDropHighlight && <span className={styles.dropHint}>Drop here</span>}
      </div>
      <span className={styles.folderTileName}>{name}</span>
    </button>
  );
}
