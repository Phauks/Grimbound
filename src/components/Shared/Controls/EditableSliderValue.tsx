/**
 * EditableSliderValue Component
 *
 * A compact editable value display for sliders that looks like a span
 * but allows direct text input when clicked.
 *
 * Features:
 * - Displays value with suffix (%, °, x, px, etc.)
 * - Click to edit - shows just the number
 * - Enter to apply, Escape to cancel
 * - Clamps values to min/max range
 * - Supports decimal values via step prop
 *
 * @module components/Shared/Controls/EditableSliderValue
 */

import { memo, useCallback, useRef, useState } from 'react';
import styles from '../../../styles/components/shared/EditableSliderValue.module.css';

export interface EditableSliderValueProps {
  /** Current value */
  value: number;
  /** Called when value changes */
  onChange: (value: number) => void;
  /** Minimum allowed value */
  min?: number;
  /** Maximum allowed value */
  max?: number;
  /** Value suffix (%, °, x, px, etc.) */
  suffix?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Step for decimal handling (e.g., 0.1 for one decimal place) */
  step?: number;
  /** Additional CSS class */
  className?: string;
}

export const EditableSliderValue = memo(function EditableSliderValue({
  value,
  onChange,
  min = 0,
  max = 100,
  suffix = '%',
  disabled = false,
  step = 1,
  className,
}: EditableSliderValueProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFocus = useCallback(() => {
    setIsEditing(true);
    // Show just the number without suffix for editing
    setEditValue(String(step < 1 ? value.toFixed(1) : Math.round(value)));
  }, [value, step]);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    const parsed = parseFloat(editValue);
    if (!Number.isNaN(parsed)) {
      const clamped = Math.min(max, Math.max(min, parsed));
      onChange(clamped);
    }
  }, [editValue, min, max, onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        inputRef.current?.blur();
      } else if (e.key === 'Escape') {
        setEditValue(String(step < 1 ? value.toFixed(1) : Math.round(value)));
        inputRef.current?.blur();
      }
    },
    [value, step]
  );

  const displayValue = step < 1 ? value.toFixed(1) : Math.round(value);

  return (
    <input
      ref={inputRef}
      type="text"
      className={`${styles.editableValue} ${className || ''}`}
      value={isEditing ? editValue : `${displayValue}${suffix}`}
      onChange={(e) => setEditValue(e.target.value)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      title={`Click to edit (${min}-${max})`}
    />
  );
});

export default EditableSliderValue;
