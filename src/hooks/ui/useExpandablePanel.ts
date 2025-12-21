/**
 * useExpandablePanel Hook
 *
 * A shared hook that provides common expandable panel behavior for all
 * settings selector components. Handles portal positioning, click-outside
 * closing, scroll closing, keyboard navigation, and pending state management.
 *
 * @module hooks/ui/useExpandablePanel
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface PanelPosition {
  top: number;
  left: number;
  width: number;
  openUpward: boolean;
}

export interface UseExpandablePanelOptions<T> {
  /** Current committed value */
  value: T;
  /** Called when changes are confirmed (Apply, click outside, scroll) */
  onChange: (value: T) => void;
  /** Called on every change for live preview */
  onPreviewChange?: (value: T) => void;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Estimated panel height for positioning calculation */
  panelHeight?: number;
  /** Minimum panel width */
  minPanelWidth?: number;
  /** Whether to auto-apply on close (click outside, scroll) */
  autoApplyOnClose?: boolean;
}

export interface UseExpandablePanelReturn<T> {
  /** Whether the panel is currently expanded */
  isExpanded: boolean;
  /** Pending value (may differ from committed value while editing) */
  pendingValue: T;
  /** Calculated panel position for portal rendering */
  panelPosition: PanelPosition | null;
  /** Ref to attach to the container element */
  containerRef: React.RefObject<HTMLDivElement>;
  /** Ref to attach to the panel element */
  panelRef: React.RefObject<HTMLDivElement>;
  /** Toggle panel open/closed */
  toggle: () => void;
  /** Open the panel */
  open: () => void;
  /** Close the panel (applies changes if autoApplyOnClose) */
  close: () => void;
  /** Update pending value and trigger preview callback */
  updatePending: (value: T) => void;
  /** Update a single field of pending value (for object values) */
  updatePendingField: <K extends keyof T>(key: K, fieldValue: T[K]) => void;
  /** Apply pending changes and close */
  apply: () => void;
  /** Cancel changes, revert to original, and close */
  cancel: () => void;
  /** Reset to provided default value */
  reset: (defaultValue: T) => void;
  /** Keyboard event handler to attach to container */
  handleKeyDown: (event: React.KeyboardEvent) => void;
  /** Whether there are unsaved changes */
  hasChanges: boolean;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useExpandablePanel<T>({
  value,
  onChange,
  onPreviewChange,
  disabled = false,
  panelHeight = 350,
  minPanelWidth = 280,
  autoApplyOnClose = true,
}: UseExpandablePanelOptions<T>): UseExpandablePanelReturn<T> {
  const [isExpanded, setIsExpanded] = useState(false);
  const [pendingValue, setPendingValue] = useState<T>(value);
  const [panelPosition, setPanelPosition] = useState<PanelPosition | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const originalValueRef = useRef<T>(value);

  // Sync pending value when external value changes (and not expanded)
  // Use JSON comparison to avoid infinite loops from object reference changes
  const valueStringRef = useRef<string>(JSON.stringify(value));

  useEffect(() => {
    if (!isExpanded) {
      const newValueString = JSON.stringify(value);
      // Only sync if value actually changed (not just reference)
      if (valueStringRef.current !== newValueString) {
        valueStringRef.current = newValueString;
        setPendingValue(value);
      }
    }
  }, [value, isExpanded]);

  // Calculate panel position when opening
  useLayoutEffect(() => {
    if (isExpanded && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;

      const openUpward = spaceBelow < panelHeight && spaceAbove > spaceBelow;

      setPanelPosition({
        top: openUpward ? rect.top - 4 : rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, minPanelWidth),
        openUpward,
      });
    }
  }, [isExpanded, panelHeight, minPanelWidth]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInContainer = containerRef.current?.contains(target);
      const isInPanel = panelRef.current?.contains(target);

      if (!(isInContainer || isInPanel) && isExpanded) {
        if (autoApplyOnClose) {
          onChange(pendingValue);
        }
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded, pendingValue, onChange, autoApplyOnClose]);

  // Close on scroll (but not when scrolling inside the panel)
  useEffect(() => {
    const handleScroll = (event: Event) => {
      if (isExpanded) {
        // Don't close if scrolling inside the panel itself
        const target = event.target as Node;
        if (panelRef.current?.contains(target)) {
          return;
        }

        if (autoApplyOnClose) {
          onChange(pendingValue);
        }
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      window.addEventListener('scroll', handleScroll, true);
    }

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isExpanded, pendingValue, onChange, autoApplyOnClose]);

  // Toggle panel
  const toggle = useCallback(() => {
    if (disabled) return;

    if (!isExpanded) {
      // Opening: store original value for cancel
      originalValueRef.current = value;
      setPendingValue(value);
      setIsExpanded(true);
    } else {
      // Closing via toggle: apply changes
      onChange(pendingValue);
      setIsExpanded(false);
    }
  }, [disabled, isExpanded, value, pendingValue, onChange]);

  // Open panel
  const open = useCallback(() => {
    if (disabled || isExpanded) return;
    originalValueRef.current = value;
    setPendingValue(value);
    setIsExpanded(true);
  }, [disabled, isExpanded, value]);

  // Close panel
  const close = useCallback(() => {
    if (!isExpanded) return;
    if (autoApplyOnClose) {
      onChange(pendingValue);
    }
    setIsExpanded(false);
  }, [isExpanded, autoApplyOnClose, pendingValue, onChange]);

  // Update pending value
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
    setIsExpanded(false);
  }, [pendingValue, onChange]);

  // Cancel and close
  const cancel = useCallback(() => {
    const original = originalValueRef.current;
    setPendingValue(original);
    onPreviewChange?.(original);
    setIsExpanded(false);
  }, [onPreviewChange]);

  // Reset to default
  const reset = useCallback(
    (defaultValue: T) => {
      setPendingValue(defaultValue);
      onPreviewChange?.(defaultValue);
    },
    [onPreviewChange]
  );

  // Keyboard handler
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Escape' && isExpanded) {
        cancel();
      } else if (event.key === 'Enter' && isExpanded) {
        apply();
      }
    },
    [isExpanded, cancel, apply]
  );

  // Check if there are unsaved changes
  const hasChanges = isExpanded && JSON.stringify(pendingValue) !== JSON.stringify(value);

  return {
    isExpanded,
    pendingValue,
    panelPosition,
    containerRef: containerRef as React.RefObject<HTMLDivElement>,
    panelRef: panelRef as React.RefObject<HTMLDivElement>,
    toggle,
    open,
    close,
    updatePending,
    updatePendingField,
    apply,
    cancel,
    reset,
    handleKeyDown,
    hasChanges,
  };
}

export default useExpandablePanel;
