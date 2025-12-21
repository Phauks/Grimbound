/**
 * Sortable Night Order Entry Component
 *
 * Wrapper around NightOrderEntry that adds @dnd-kit sortable functionality.
 * Locked entries are rendered without drag capability.
 */

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import styles from '@/styles/components/script/NightOrderEntry.module.css';
import type { NightOrderEntry as NightOrderEntryType } from '@/ts/nightOrder/nightOrderTypes.js';
import { NightOrderEntry } from './NightOrderEntry';

interface SortableNightOrderEntryProps {
  entry: NightOrderEntryType;
  /** Whether this entry represents an official character (derived from Character.source) */
  isOfficial: boolean;
  /** Whether drag-drop is enabled for this sheet */
  enableDragDrop: boolean;
  /** Callback when "Edit Character" is selected from context menu */
  onEditCharacter?: (characterId: string) => void;
  /** Callback when lock state is toggled for an entry */
  onToggleLock?: (entryId: string) => void;
}

export function SortableNightOrderEntry({
  entry,
  isOfficial,
  enableDragDrop,
  onEditCharacter,
  onToggleLock,
}: SortableNightOrderEntryProps) {
  // Official characters can't be dragged until converted to custom
  const canDrag = enableDragDrop && !isOfficial;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: entry.id,
    disabled: !canDrag,
  });

  // Use CSS.Translate instead of CSS.Transform to prevent scaling during drag
  // CSS.Transform can include scaleX/scaleY which causes elements to shrink
  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
    // Apply grab cursor to entire row when draggable
    cursor: canDrag ? (isDragging ? 'grabbing' : 'grab') : undefined,
  };

  // Apply drag listeners to the whole row wrapper instead of just the handle
  const rowProps = canDrag
    ? {
        ...attributes,
        ...listeners,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${isDragging ? styles.sorting : ''} ${canDrag ? styles.draggable : ''}`}
      {...rowProps}
    >
      <NightOrderEntry
        entry={entry}
        isOfficial={isOfficial}
        showDragHandle={false}
        showLockIcon={isOfficial}
        isDragging={isDragging}
        onEditCharacter={onEditCharacter}
        onToggleLock={onToggleLock}
      />
    </div>
  );
}
