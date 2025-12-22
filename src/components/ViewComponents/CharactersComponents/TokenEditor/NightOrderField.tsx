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

import { memo, useCallback, useEffect, useState } from 'react';
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
  /** Current reminder text value */
  reminderValue: string;
  /** Current night order value */
  nightOrderValue: number;
  /** Whether the field is disabled (official character) */
  disabled: boolean;
  /** Callback when reminder text changes */
  onReminderChange: (value: string) => void;
  /** Callback when reminder text is committed (blur) */
  onReminderBlur: (value: string) => void;
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
  // Local state for controlled inputs
  const [localReminder, setLocalReminder] = useState(reminderValue);
  const [localNightOrder, setLocalNightOrder] = useState(nightOrderValue);
  const [formatIssues, setFormatIssues] = useState<FormatIssue[]>([]);

  // Auto-resize textarea
  const textareaRef = useAutoResizeTextarea({
    value: localReminder,
    enabled: !disabled,
    minRows: 2,
  });

  // Sync local state when props change
  useEffect(() => {
    setLocalReminder(reminderValue);
    setLocalNightOrder(nightOrderValue);
  }, [reminderValue, nightOrderValue]);

  // Analyze format issues when reminder changes
  useEffect(() => {
    setFormatIssues(analyzeReminderText(localReminder));
  }, [localReminder]);

  // Handle reminder text change
  const handleReminderChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (disabled) return;
      const newValue = e.target.value;
      setLocalReminder(newValue);
      onReminderChange(newValue);

      // Auto-set night order to 1 if reminder has text but order is 0
      if (newValue.trim() && localNightOrder === 0) {
        setLocalNightOrder(1);
        onNightOrderChange(1);
      }
    },
    [disabled, localNightOrder, onReminderChange, onNightOrderChange]
  );

  // Handle reminder blur
  const handleReminderBlur = useCallback(() => {
    if (disabled) return;
    onReminderBlur(localReminder);
  }, [disabled, localReminder, onReminderBlur]);

  // Handle night order change
  const handleNightOrderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled) return;
      const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
      setLocalNightOrder(val);
    },
    [disabled]
  );

  // Handle night order blur
  const handleNightOrderBlur = useCallback(() => {
    if (disabled) return;
    let normalizedValue = localNightOrder || 0;
    // If there's reminder text but night order is 0, set to 1
    if (localReminder.trim() && normalizedValue === 0) {
      normalizedValue = 1;
    }
    setLocalNightOrder(normalizedValue);
    onNightOrderBlur(normalizedValue);
  }, [disabled, localNightOrder, localReminder, onNightOrderBlur]);

  // Handle format fix
  const handleFixFormat = useCallback(() => {
    if (disabled) return;
    const normalized = normalizeReminderText(localReminder);
    setLocalReminder(normalized);
    onReminderBlur(normalized);
  }, [disabled, localReminder, onReminderBlur]);

  return (
    <div className={styles.formGroup}>
      <div className={styles.labelWithAction}>
        <label htmlFor={`${idPrefix}-reminder`}>{label}</label>
        <span className={styles.nightOrderLabel}>
          Night Order
          <input
            type="number"
            className={styles.nightOrderInput}
            value={localNightOrder === 0 ? '' : localNightOrder}
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
        value={localReminder}
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
