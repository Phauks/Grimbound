/**
 * NightOrderField Component
 *
 * A reusable component for night order reminder fields (first night / other night).
 * Includes:
 * - Night order number input
 * - Reminder text textarea with auto-resize
 * - Format validation with fix button
 *
 * @module components/CharactersComponents/TokenEditor/NightOrderField
 */

import { memo, useCallback, useMemo } from 'react';
import { useAutoResizeTextarea } from '@/hooks/ui/useAutoResizeTextarea';
import styles from '@/styles/components/characterEditor/TokenEditor.module.css';
import {
  analyzeReminderText,
  type FormatIssue,
  normalizeReminderText,
} from '@/ts/utils/textFormatAnalyzer';
import { FormatWarning } from './FormatWarning';

interface NightOrderFieldProps {
  /** Field label (e.g., "First Night Reminder") */
  label: string;
  /** HTML id prefix for accessibility */
  idPrefix: string;
  /** Current reminder text value (managed by parent's useControlledField) */
  reminderValue: string;
  /** Current night order value */
  nightOrderValue: number;
  /** Whether the field is disabled (official character) */
  disabled: boolean;
  /** Callback when reminder text changes (parent handles local state) */
  onReminderChange: (value: string) => void;
  /** Callback when reminder text is committed (blur) */
  onReminderBlur: () => void;
  /** Callback when night order changes */
  onNightOrderChange: (value: number) => void;
  /** Callback when night order is committed (blur) */
  onNightOrderBlur: (value: number) => void;
  /** Placeholder text for the textarea */
  placeholder?: string;
}

export const NightOrderField = memo(function NightOrderField({
  label,
  idPrefix,
  reminderValue,
  nightOrderValue,
  disabled,
  onReminderChange,
  onReminderBlur,
  onNightOrderChange,
  onNightOrderBlur,
  placeholder = 'Reminder text',
}: NightOrderFieldProps) {
  // Auto-resize textarea - uses prop value directly (parent manages local state)
  const textareaRef = useAutoResizeTextarea({
    value: reminderValue,
    enabled: !disabled,
    minRows: 2,
  });

  // Analyze format issues (memoized to avoid recalc on every render)
  const formatIssues: FormatIssue[] = useMemo(
    () => analyzeReminderText(reminderValue),
    [reminderValue]
  );

  // Handle reminder text change - pass to parent's useControlledField
  const handleReminderChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (disabled) return;
      const newValue = e.target.value;
      onReminderChange(newValue);

      // Auto-set night order to 1 if reminder has text but order is 0
      if (newValue.trim() && nightOrderValue === 0) {
        onNightOrderChange(1);
      }
    },
    [disabled, nightOrderValue, onReminderChange, onNightOrderChange]
  );

  // Handle reminder blur - parent's useControlledField flushes debounced value
  const handleReminderBlur = useCallback(() => {
    if (disabled) return;
    onReminderBlur();
  }, [disabled, onReminderBlur]);

  // Handle night order change - update parent immediately
  const handleNightOrderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled) return;
      const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
      onNightOrderChange(val);
    },
    [disabled, onNightOrderChange]
  );

  // Handle night order blur - normalize and commit
  const handleNightOrderBlur = useCallback(() => {
    if (disabled) return;
    let normalizedValue = nightOrderValue || 0;
    // If there's reminder text but night order is 0, set to 1
    if (reminderValue.trim() && normalizedValue === 0) {
      normalizedValue = 1;
    }
    onNightOrderBlur(normalizedValue);
  }, [disabled, nightOrderValue, reminderValue, onNightOrderBlur]);

  // Handle format fix - normalize and commit via parent
  const handleFixFormat = useCallback(() => {
    if (disabled) return;
    const normalized = normalizeReminderText(reminderValue);
    onReminderChange(normalized);
    onReminderBlur();
  }, [disabled, reminderValue, onReminderChange, onReminderBlur]);

  return (
    <div className={styles.formGroup}>
      <div className={styles.labelWithAction}>
        <label htmlFor={`${idPrefix}-reminder`}>{label}</label>
        <span className={styles.nightOrderLabel}>
          Night Order
          <input
            type="number"
            className={styles.nightOrderInput}
            value={nightOrderValue === 0 ? '' : nightOrderValue}
            disabled={disabled}
            min={0}
            placeholder="0"
            onChange={handleNightOrderChange}
            onBlur={handleNightOrderBlur}
          />
        </span>
      </div>
      <textarea
        ref={textareaRef}
        id={`${idPrefix}-reminder`}
        className={styles.autoExpand}
        value={reminderValue}
        disabled={disabled}
        onChange={handleReminderChange}
        onBlur={handleReminderBlur}
        placeholder={placeholder}
        rows={2}
      />
      <p className={styles.fieldHint}>Use *TEXT* for bold, :reminder: for reminder circle.</p>
      <FormatWarning issues={formatIssues} disabled={disabled} onFix={handleFixFormat} />
    </div>
  );
});

export default NightOrderField;
