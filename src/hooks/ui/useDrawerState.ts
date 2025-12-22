/**
 * useDrawerState Hook
 *
 * A shared hook that provides common drawer state management for selector
 * components that use drawer-based panels (e.g., BackgroundStyleSelector).
 *
 * Similar interface to useExpandablePanel but tailored for drawer UIs:
 * - No portal positioning logic (drawer handles its own positioning)
 * - Open/close state management
 * - Pending value state with apply/cancel/reset
 * - Live preview support
 *
 * @module hooks/ui/useDrawerState
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface UseDrawerStateOptions<T> {
  /** Current committed value */
  value: T;
  /** Called when changes are confirmed (Apply) */
  onChange: (value: T) => void;
  /** Called on every change for live preview */
  onPreviewChange?: (value: T) => void;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Default value for reset functionality */
  defaultValue?: T;
}

export interface UseDrawerStateReturn<T> {
  /** Whether the drawer is currently open */
  isOpen: boolean;
  /** Pending value (may differ from committed value while editing) */
  pendingValue: T;
  /** Open the drawer */
  open: () => void;
  /** Toggle drawer open/closed */
  toggle: () => void;
  /** Update entire pending value and trigger preview callback */
  updatePending: (value: T) => void;
  /** Update a single field of pending value (for object values) */
  updatePendingField: <K extends keyof T>(key: K, fieldValue: T[K]) => void;
  /** Apply pending changes, call onChange, and close */
  apply: () => void;
  /** Cancel changes, revert to original, call onPreviewChange with original, and close */
  cancel: () => void;
  /** Reset to default value (does not close drawer) */
  reset: () => void;
  /** Whether there are unsaved changes */
  hasChanges: boolean;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useDrawerState<T>({
  value,
  onChange,
  onPreviewChange,
  disabled = false,
  defaultValue,
}: UseDrawerStateOptions<T>): UseDrawerStateReturn<T> {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingValue, setPendingValue] = useState<T>(value);

  // Store original value when drawer opens for cancel functionality
  const originalValueRef = useRef<T>(value);

  // Sync pending value when drawer opens
  useEffect(() => {
    if (isOpen) {
      setPendingValue(value);
      originalValueRef.current = value;
    }
  }, [isOpen, value]);

  // Open drawer
  const open = useCallback(() => {
    if (disabled) return;
    originalValueRef.current = value;
    setPendingValue(value);
    setIsOpen(true);
  }, [disabled, value]);

  // Toggle drawer
  const toggle = useCallback(() => {
    if (disabled) return;
    if (isOpen) {
      // Closing via toggle - apply changes
      onChange(pendingValue);
      setIsOpen(false);
    } else {
      // Opening
      originalValueRef.current = value;
      setPendingValue(value);
      setIsOpen(true);
    }
  }, [disabled, isOpen, value, pendingValue, onChange]);

  // Update entire pending value
  const updatePending = useCallback(
    (newValue: T) => {
      setPendingValue(newValue);
      onPreviewChange?.(newValue);
    },
    [onPreviewChange]
  );

  // Update a single field of pending value (for object types)
  const updatePendingField = useCallback(
    <K extends keyof T>(key: K, fieldValue: T[K]) => {
      const newValue = { ...pendingValue, [key]: fieldValue } as T;
      setPendingValue(newValue);
      onPreviewChange?.(newValue);
    },
    [pendingValue, onPreviewChange]
  );

  // Apply and close
  const apply = useCallback(() => {
    onChange(pendingValue);
    setIsOpen(false);
  }, [pendingValue, onChange]);

  // Cancel and close - revert to original value
  const cancel = useCallback(() => {
    const original = originalValueRef.current;
    setPendingValue(original);
    onPreviewChange?.(original);
    setIsOpen(false);
  }, [onPreviewChange]);

  // Reset to default value (does not close)
  const reset = useCallback(() => {
    if (defaultValue !== undefined) {
      setPendingValue(defaultValue);
      onPreviewChange?.(defaultValue);
    }
  }, [defaultValue, onPreviewChange]);

  // Check if there are unsaved changes
  const hasChanges = isOpen && JSON.stringify(pendingValue) !== JSON.stringify(value);

  return {
    isOpen,
    pendingValue,
    open,
    toggle,
    updatePending,
    updatePendingField,
    apply,
    cancel,
    reset,
    hasChanges,
  };
}

export default useDrawerState;
