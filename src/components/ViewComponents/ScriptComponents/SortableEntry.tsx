/**
 * SortableEntry Component
 *
 * Shared sortable wrapper that adds @dnd-kit sortable functionality.
 * Used by both PlayerScriptPreview and NightOrderSheet for consistent drag behavior.
 */

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ReactNode } from 'react';
import styles from '@/styles/components/script/SortableEntry.module.css';

// ============================================================================
// TYPES
// ============================================================================

export interface SortableEntryRenderProps {
  /** Whether the item is currently being dragged */
  isDragging: boolean;
}

export interface SortableEntryProps {
  /** Unique ID for the sortable item */
  id: string;
  /** Whether drag-and-drop is enabled */
  enableDragDrop?: boolean;
  /** Children - can be ReactNode or render function for drag state access */
  children: ReactNode | ((props: SortableEntryRenderProps) => ReactNode);
  /** Optional additional class name */
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SortableEntry({
  id,
  enableDragDrop = true,
  children,
  className,
}: SortableEntryProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !enableDragDrop,
  });

  // Use CSS.Translate to prevent scaling during drag
  // Cursor: grabbing only shows during actual drag
  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
    cursor: isDragging ? 'grabbing' : undefined,
  };

  // Apply drag listeners to the wrapper
  const dragProps = enableDragDrop
    ? {
        ...attributes,
        ...listeners,
      }
    : undefined;

  const classNames = [
    styles.sortableEntry,
    isDragging ? styles.dragging : '',
    enableDragDrop ? styles.draggable : '',
    className || '',
  ]
    .filter(Boolean)
    .join(' ');

  // Support render props pattern for accessing isDragging
  const renderedChildren = typeof children === 'function' ? children({ isDragging }) : children;

  return (
    <div ref={setNodeRef} style={style} className={classNames} {...dragProps}>
      {renderedChildren}
    </div>
  );
}
