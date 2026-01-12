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

import { useRef, useState } from 'react';

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
  /** Called when drawer is about to open - use to close other panels */
  onWillOpen?: () => void;
}

export interface UseDrawerStateReturn<T> {
  /** Whether the drawer is currently open */
  isOpen: boolean;
  /** Pending value (may differ from committed value while editing) */
  pendingValue: T;
  /** Open the drawer */
  open: () => void;
  /** Close the drawer (applies pending changes) */
  close: () => void;
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
  onWillOpen,
}: UseDrawerStateOptions<T>): UseDrawerStateReturn<T> {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingValue, setPendingValue] = useState<T>(value);

  // Store original value when drawer opens for cancel functionality
  const originalValueRef = useRef<T>(value);

  // Note: We intentionally do NOT sync pendingValue from value while drawer is open.
  // The open() function handles the initial sync, and user edits are preserved
  // even if external value changes. This prevents losing unsaved changes.

  // Open drawer
  const open = () => {
    if (disabled) return;
    onWillOpen?.();
    originalValueRef.current = value;
    setPendingValue(value);
    setIsOpen(true);
  };

  // Toggle drawer
  const toggle = () => {
    if (disabled) return;
    if (isOpen) {
      // Closing via toggle - apply changes
      onChange(pendingValue);
      setIsOpen(false);
    } else {
      // Opening - notify parent to close other panels first
      onWillOpen?.();
      originalValueRef.current = value;
      setPendingValue(value);
      setIsOpen(true);
    }
  };

  // Update entire pending value
  const updatePending = (newValue: T) => {
    setPendingValue(newValue);
    onPreviewChange?.(newValue);
  };

  // Update a single field of pending value (for object types)
  const updatePendingField = <K extends keyof T>(key: K, fieldValue: T[K]) => {
    const newValue = { ...pendingValue, [key]: fieldValue } as T;
    setPendingValue(newValue);
    onPreviewChange?.(newValue);
  };

  // Close drawer (applies pending changes)
  const close = () => {
    if (!isOpen) return;
    onChange(pendingValue);
    setIsOpen(false);
  };

  // Apply and close
  const apply = () => {
    onChange(pendingValue);
    setIsOpen(false);
  };

  // Cancel and close - revert to original value
  const cancel = () => {
    const original = originalValueRef.current;
    setPendingValue(original);
    onPreviewChange?.(original);
    setIsOpen(false);
  };

  // Reset to default value (does not close)
  const reset = () => {
    if (defaultValue !== undefined) {
      setPendingValue(defaultValue);
      onPreviewChange?.(defaultValue);
    }
  };

  // Check if there are unsaved changes
  const hasChanges = isOpen && JSON.stringify(pendingValue) !== JSON.stringify(value);

  return {
    isOpen,
    pendingValue,
    open,
    close,
    toggle,
    updatePending,
    updatePendingField,
    apply,
    cancel,
    reset,
    hasChanges,
  };
}
