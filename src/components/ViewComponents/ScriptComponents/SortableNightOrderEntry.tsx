/**
 * Sortable Night Order Entry Component
 *
 * Wrapper around NightOrderEntry that adds @dnd-kit sortable functionality.
 * Uses shared SortableEntry component for consistent drag behavior.
 * Locked entries are rendered without drag capability.
 */

import type { NightOrderEntry as NightOrderEntryType } from '@/ts/nightOrder/nightOrderTypes.js';
import { NightOrderEntry } from './NightOrderEntry';
import { SortableEntry } from './SortableEntry';

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

  return (
    <SortableEntry id={entry.id} enableDragDrop={canDrag}>
      {({ isDragging }) => (
        <NightOrderEntry
          entry={entry}
          isOfficial={isOfficial}
          showDragHandle={false}
          showLockIcon={isOfficial}
          isDragging={isDragging}
          onEditCharacter={onEditCharacter}
          onToggleLock={onToggleLock}
        />
      )}
    </SortableEntry>
  );
}
