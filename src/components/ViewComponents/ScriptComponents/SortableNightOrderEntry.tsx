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
  /** Whether drag-drop is enabled for this sheet */
  enableDragDrop: boolean;
  /** Callback when "Edit Character" is selected from context menu */
  onEditCharacter?: (characterId: string) => void;
}

export function SortableNightOrderEntry({
  entry,
  enableDragDrop,
  onEditCharacter,
}: SortableNightOrderEntryProps) {
  // For locked entries, we don't enable sorting
  const canDrag = enableDragDrop && !entry.isLocked;

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
  };

  // Build drag handle props for the entry
  const dragHandleProps = canDrag
    ? {
        ...attributes,
        ...listeners,
        style: { cursor: 'grab' } as React.CSSProperties,
      }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? styles.sorting : ''}>
      <NightOrderEntry
        entry={entry}
        showDragHandle={canDrag}
        showLockIcon={entry.isLocked}
        dragHandleProps={dragHandleProps}
        isDragging={isDragging}
        onEditCharacter={onEditCharacter}
      />
    </div>
  );
}
