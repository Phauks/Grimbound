/**
 * useGroupedReminders Hook
 *
 * Manages reminder tokens with grouping by text.
 * Converts a flat array of reminders to grouped format for editing,
 * and handles text/count changes while maintaining the flat array.
 *
 * @module hooks/scripts/useGroupedReminders
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * A grouped reminder combines duplicate text entries with a count
 */
export interface GroupedReminder {
  text: string;
  count: number;
}

export interface UseGroupedRemindersOptions {
  /** Initial flat array of reminder strings */
  reminders: string[];
  /** Callback when reminders change */
  onChange: (reminders: string[]) => void;
  /** Whether editing is disabled */
  disabled?: boolean;
}

export interface UseGroupedRemindersResult {
  /** Grouped reminders for display */
  grouped: GroupedReminder[];
  /** Flat reminders array */
  flat: string[];
  /** Update the text of a grouped reminder (changes all instances) */
  updateText: (oldText: string, newText: string) => void;
  /** Update the count of a grouped reminder */
  updateCount: (text: string, newCount: number) => void;
  /** Remove all instances of a reminder text */
  remove: (text: string) => void;
  /** Add a new empty reminder */
  add: () => void;
  /** Reorder grouped reminders */
  reorder: (newGrouped: GroupedReminder[]) => void;
}

/**
 * Converts a flat array of reminders to grouped format.
 * Groups are ordered by first occurrence.
 */
function groupReminders(reminders: string[]): GroupedReminder[] {
  const groups = new Map<string, number>();
  const order: string[] = [];

  for (const reminder of reminders) {
    if (!groups.has(reminder)) {
      order.push(reminder);
      groups.set(reminder, 1);
    } else {
      groups.set(reminder, groups.get(reminder)! + 1);
    }
  }

  return order.map((text) => ({ text, count: groups.get(text)! }));
}

/**
 * Converts grouped reminders back to flat array.
 */
function ungroupReminders(grouped: GroupedReminder[]): string[] {
  const result: string[] = [];
  for (const { text, count } of grouped) {
    for (let i = 0; i < count; i++) {
      result.push(text);
    }
  }
  return result;
}

/**
 * Hook for managing grouped reminders.
 *
 * @example
 * ```tsx
 * const { grouped, updateText, updateCount, remove, add, reorder } = useGroupedReminders({
 *   reminders: character.reminders || [],
 *   onChange: (reminders) => onEditChange('reminders', reminders),
 *   disabled: isOfficial,
 * });
 *
 * return grouped.map(({ text, count }) => (
 *   <div key={text}>
 *     <input value={text} onChange={(e) => updateText(text, e.target.value)} />
 *     <input type="number" value={count} onChange={(e) => updateCount(text, +e.target.value)} />
 *     <button onClick={() => remove(text)}>Remove</button>
 *   </div>
 * ));
 * ```
 */
export function useGroupedReminders({
  reminders: initialReminders,
  onChange,
  disabled = false,
}: UseGroupedRemindersOptions): UseGroupedRemindersResult {
  const [reminders, setReminders] = useState<string[]>(initialReminders);

  // Sync with external changes
  useEffect(() => {
    setReminders(initialReminders);
  }, [initialReminders]);

  const grouped = useMemo(() => groupReminders(reminders), [reminders]);

  const updateReminders = useCallback(
    (newReminders: string[]) => {
      setReminders(newReminders);
      onChange(newReminders);
    },
    [onChange]
  );

  const updateText = useCallback(
    (oldText: string, newText: string) => {
      if (disabled) return;
      const updated = reminders.map((r) => (r === oldText ? newText : r));
      updateReminders(updated);
    },
    [reminders, updateReminders, disabled]
  );

  const updateCount = useCallback(
    (text: string, newCount: number) => {
      if (disabled) return;

      // Clamp count between 1 and 20
      const clampedCount = Math.max(1, Math.min(20, newCount));
      const currentCount = reminders.filter((r) => r === text).length;

      if (clampedCount === currentCount) return;

      let updated: string[];
      if (clampedCount > currentCount) {
        // Add more instances at the end
        const toAdd = clampedCount - currentCount;
        updated = [...reminders, ...Array(toAdd).fill(text)];
      } else {
        // Remove instances from the end
        let removeCount = currentCount - clampedCount;
        updated = [];
        const reversed = [...reminders].reverse();
        for (const r of reversed) {
          if (r === text && removeCount > 0) {
            removeCount--;
          } else {
            updated.unshift(r);
          }
        }
      }

      updateReminders(updated);
    },
    [reminders, updateReminders, disabled]
  );

  const remove = useCallback(
    (text: string) => {
      if (disabled) return;
      const updated = reminders.filter((r) => r !== text);
      updateReminders(updated);
    },
    [reminders, updateReminders, disabled]
  );

  const add = useCallback(() => {
    if (disabled) return;
    const updated = [...reminders, ''];
    updateReminders(updated);
  }, [reminders, updateReminders, disabled]);

  const reorder = useCallback(
    (newGrouped: GroupedReminder[]) => {
      if (disabled) return;
      const updated = ungroupReminders(newGrouped);
      updateReminders(updated);
    },
    [updateReminders, disabled]
  );

  return {
    grouped,
    flat: reminders,
    updateText,
    updateCount,
    remove,
    add,
    reorder,
  };
}

export default useGroupedReminders;
