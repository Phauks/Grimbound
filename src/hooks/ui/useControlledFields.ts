/**
 * useControlledFields Hook
 *
 * A hook that manages local state for multiple controlled inputs with:
 * - Per-field debounced updates to parent
 * - Protection against cursor jumps from prop sync
 * - Proper cleanup on unmount
 *
 * This is the multi-field version of useControlledField, useful for
 * forms with many similar text inputs.
 *
 * Uses React's "adjusting state during render" pattern instead of useEffect
 * for synchronous prop-to-state sync (faster, no extra render cycle).
 *
 * @module hooks/ui/useControlledFields
 */

import { useEffect, useRef, useState } from 'react';

// ============================================
// Types
// ============================================

export interface UseControlledFieldsOptions<T extends Record<string, string>> {
  /** Object mapping field names to their prop values */
  values: T;
  /** Callback when a field value should be committed to parent */
  onChange: (field: keyof T, value: string) => void;
  /** Debounce delay in ms (default: 500) */
  debounceMs?: number;
  /** Whether the fields are disabled */
  disabled?: boolean;
}

export interface FieldState {
  /** Current local value */
  localValue: string;
  /** Update local value and schedule debounced commit */
  handleChange: (value: string) => void;
  /** Immediately commit current value (call on blur) */
  handleBlur: () => void;
}

export interface UseControlledFieldsResult<T extends Record<string, string>> {
  /** Object mapping field names to their state and handlers */
  fields: { [K in keyof T]: FieldState };
  /** Get local values as an object (useful for reading all at once) */
  localValues: T;
  /** Force sync all fields from props */
  forceSync: () => void;
}

// ============================================
// Hook Implementation
// ============================================

/**
 * Manages local state for multiple controlled inputs with debounced parent updates.
 *
 * @example
 * ```tsx
 * const { fields } = useControlledFields({
 *   values: {
 *     flavor: character.flavor || '',
 *     overview: character.overview || '',
 *     tips: character.tips || '',
 *   },
 *   onChange: (field, value) => onEditChange(field, value),
 *   debounceMs: 500,
 *   disabled: isOfficial,
 * });
 *
 * <textarea
 *   value={fields.flavor.localValue}
 *   onChange={(e) => fields.flavor.handleChange(e.target.value)}
 *   onBlur={fields.flavor.handleBlur}
 * />
 * ```
 */
export function useControlledFields<T extends Record<string, string>>({
  values,
  onChange,
  debounceMs = 500,
  disabled = false,
}: UseControlledFieldsOptions<T>): UseControlledFieldsResult<T> {
  // Local state for all fields
  const [localValues, setLocalValues] = useState<T>(values);

  // Track previous values for render-time comparison (React's recommended pattern)
  const [prevValuesJson, setPrevValuesJson] = useState(() => JSON.stringify(values));

  // Track last sent values per field to avoid resetting on our own updates
  const lastSentValuesRef = useRef<Record<string, string>>({});

  // Track timers per field for proper debounce cancellation
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Compute stable JSON string for comparison
  const valuesJson = JSON.stringify(values);

  // Sync from external prop changes during render (React's "adjusting state" pattern)
  // This is synchronous and faster than useEffect (no extra render cycle).
  // Distinguishes between:
  // 1. External changes: propValue differs from what we last sent → sync
  // 2. Our changes propagated back: propValue equals what we sent → ignore
  if (valuesJson !== prevValuesJson) {
    setPrevValuesJson(valuesJson);

    const lastSent = lastSentValuesRef.current;
    for (const key of Object.keys(values)) {
      const propValue = values[key];
      // Only sync if this is an external change (not our own update reflected back)
      if (propValue !== lastSent[key]) {
        setLocalValues((prev) => ({ ...prev, [key]: propValue }));
        lastSent[key] = propValue;
      }
    }
  }

  // Cleanup timers on unmount
  useEffect(
    () => () => {
      for (const timer of timersRef.current.values()) {
        clearTimeout(timer);
      }
      timersRef.current.clear();
    },
    []
  );

  // Create change handler for a field
  const createChangeHandler = (field: keyof T) => (value: string) => {
    if (disabled) return;

    const fieldKey = field as string;

    setLocalValues((prev) => ({ ...prev, [fieldKey]: value }));
    lastSentValuesRef.current[fieldKey] = value;

    // Cancel any pending update for this field
    const existingTimer = timersRef.current.get(fieldKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Schedule debounced commit
    const timer = setTimeout(() => {
      timersRef.current.delete(fieldKey);
      onChange(field, value);
    }, debounceMs);

    timersRef.current.set(fieldKey, timer);
  };

  // Create blur handler for a field
  const createBlurHandler = (field: keyof T) => () => {
    if (disabled) return;

    const fieldKey = field as string;

    // Cancel pending debounce for this field
    const existingTimer = timersRef.current.get(fieldKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
      timersRef.current.delete(fieldKey);
    }

    // Commit immediately
    const value = localValues[field];
    lastSentValuesRef.current[fieldKey] = value;
    onChange(field, value);
  };

  // Force sync all fields from props
  const forceSync = () => {
    setLocalValues(values);
    for (const key of Object.keys(values)) {
      lastSentValuesRef.current[key] = values[key];
    }
  };

  // Build fields object with handlers
  const fields = {} as { [K in keyof T]: FieldState };

  for (const key of Object.keys(values) as Array<keyof T>) {
    fields[key] = {
      localValue: localValues[key],
      handleChange: createChangeHandler(key),
      handleBlur: createBlurHandler(key),
    };
  }

  return {
    fields,
    localValues,
    forceSync,
  };
}
