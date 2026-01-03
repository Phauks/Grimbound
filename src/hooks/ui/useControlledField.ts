/**
 * useControlledField Hook
 *
 * A hook that manages local state for controlled inputs with:
 * - Debounced updates to parent
 * - Protection against cursor jumps from prop sync
 * - Proper cleanup on unmount
 *
 * This centralizes the pattern of local state + debounce + lastSentRef
 * to prevent race conditions that cause cursor position issues.
 *
 * @module hooks/ui/useControlledField
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// ============================================
// Types
// ============================================

export interface UseControlledFieldOptions<T> {
  /** The prop value from parent (source of truth for external changes) */
  value: T;
  /** Callback when value should be committed to parent */
  onChange: (value: T) => void;
  /** Debounce delay in ms (default: 500) */
  debounceMs?: number;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Custom equality function for comparing values (default: ===) */
  isEqual?: (a: T, b: T) => boolean;
}

export interface UseControlledFieldResult<T> {
  /** Current local value (use this for input value) */
  localValue: T;
  /** Update local value and schedule debounced commit */
  handleChange: (value: T) => void;
  /** Immediately commit current value (call on blur) */
  handleBlur: () => void;
  /** Whether there are uncommitted changes */
  isDirty: boolean;
  /** Force sync from prop (rarely needed) */
  forceSync: () => void;
}

// ============================================
// Hook Implementation
// ============================================

/**
 * Manages local state for a controlled input with debounced parent updates.
 *
 * @example
 * ```tsx
 * const ability = useControlledField({
 *   value: character.ability || '',
 *   onChange: (value) => onEditChange('ability', value),
 *   debounceMs: 500,
 *   disabled: isOfficial,
 * });
 *
 * <textarea
 *   value={ability.localValue}
 *   onChange={(e) => ability.handleChange(e.target.value)}
 *   onBlur={ability.handleBlur}
 *   disabled={isOfficial}
 * />
 * ```
 */
export function useControlledField<T>({
  value,
  onChange,
  debounceMs = 500,
  disabled = false,
  isEqual = (a, b) => a === b,
}: UseControlledFieldOptions<T>): UseControlledFieldResult<T> {
  // Local state for the input
  const [localValue, setLocalValue] = useState<T>(value);

  // Track the last value we sent to parent to avoid resetting on our own updates
  const lastSentValueRef = useRef<T>(value);

  // Debounce timer
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track if we have uncommitted changes
  const isDirtyRef = useRef(false);

  // Sync from props only when the change came from external source
  useEffect(() => {
    if (!isEqual(value, lastSentValueRef.current)) {
      setLocalValue(value);
      lastSentValueRef.current = value;
      isDirtyRef.current = false;
    }
  }, [value, isEqual]);

  // Cleanup timer on unmount
  useEffect(
    () => () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    },
    []
  );

  // Handle value change with debounce
  const handleChange = useCallback(
    (newValue: T) => {
      if (disabled) return;

      setLocalValue(newValue);
      lastSentValueRef.current = newValue;
      isDirtyRef.current = true;

      // Cancel any pending update
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      // Schedule debounced commit
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        isDirtyRef.current = false;
        onChange(newValue);
      }, debounceMs);
    },
    [disabled, onChange, debounceMs]
  );

  // Immediately commit on blur
  const handleBlur = useCallback(() => {
    if (disabled) return;

    // Cancel pending debounce
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // Commit immediately
    lastSentValueRef.current = localValue;
    isDirtyRef.current = false;
    onChange(localValue);
  }, [disabled, localValue, onChange]);

  // Force sync from prop (rarely needed)
  const forceSync = useCallback(() => {
    setLocalValue(value);
    lastSentValueRef.current = value;
    isDirtyRef.current = false;
  }, [value]);

  return {
    localValue,
    handleChange,
    handleBlur,
    isDirty: isDirtyRef.current,
    forceSync,
  };
}

export default useControlledField;
