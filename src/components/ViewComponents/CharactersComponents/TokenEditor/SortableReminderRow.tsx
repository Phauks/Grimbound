/**
 * SortableReminderRow Component
 *
 * A sortable row for grouped reminder editing.
 * Uses @dnd-kit for drag-and-drop reordering.
 *
 * @module components/CharactersComponents/TokenEditor/SortableReminderRow
 */

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { memo } from 'react';
import type { GroupedReminder } from '@/hooks';
import styles from '@/styles/components/characterEditor/TokenEditor.module.css';

interface SortableReminderRowProps {
  /** Unique ID for dnd-kit */
  id: string;
  /** Grouped reminder data */
  reminder: GroupedReminder;
  /** Index in the grouped list */
  index: number;
  /** Whether editing is disabled */
  disabled: boolean;
  /** Whether there are multiple reminders (enables drag) */
  canDrag: boolean;
  /** Handle reminder text change */
  onTextChange: (oldText: string, newText: string) => void;
  /** Handle reminder count change */
  onCountChange: (text: string, count: number) => void;
  /** Handle remove all instances */
  onRemove: (text: string) => void;
}

export const SortableReminderRow = memo(function SortableReminderRow({
  id,
  reminder,
  index: _index,
  disabled,
  canDrag,
  onTextChange,
  onCountChange,
  onRemove,
}: SortableReminderRowProps) {
  const { text, count } = reminder;

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

  const dragHandleProps =
    canDrag && !disabled
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
      className={`${styles.reminderUrlRow} ${isDragging ? styles.dragging : ''}`}
    >
      <span
        className={styles.dragHandle}
        title={canDrag ? 'Drag to reorder' : ''}
        {...dragHandleProps}
      >
        ⋮⋮
      </span>

      <input
        type="text"
        value={text}
        disabled={disabled}
        onChange={(e) => onTextChange(text, e.target.value)}
        placeholder="Reminder text"
        className={styles.reminderTextInput}
      />

      <input
        type="number"
        value={count}
        disabled={disabled}
        onChange={(e) => {
          const val = e.target.value;
          if (val === '') return; // Allow empty while typing
          onCountChange(text, parseInt(val, 10) || 1);
        }}
        onBlur={(e) => {
          // If empty on blur, reset to 1
          if (e.target.value === '') {
            onCountChange(text, 1);
          }
        }}
        min={1}
        max={20}
        className={styles.reminderCountInput}
        title={disabled ? 'Official character - cannot edit' : 'Number of this reminder token'}
      />

      <button
        type="button"
        className={`${styles.btnIcon} ${styles.btnDanger}`}
        onClick={() => onRemove(text)}
        disabled={disabled}
        title={disabled ? 'Official character - cannot edit' : 'Remove all copies of this reminder'}
      >
        ✕
      </button>
    </div>
  );
});

export default SortableReminderRow;
