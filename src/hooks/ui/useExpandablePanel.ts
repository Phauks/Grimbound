/**
 * useExpandablePanel Hook
 *
 * A shared hook that provides common expandable panel behavior for all
 * settings selector components. Handles portal positioning, click-outside
 * closing, scroll closing, keyboard navigation, and pending state management.
 *
 * @module hooks/ui/useExpandablePanel
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

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
  /** Called when panel is about to open - use to close other panels */
  onWillOpen?: () => void;
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
  onWillOpen,
}: UseExpandablePanelOptions<T>): UseExpandablePanelReturn<T> {
  const [isExpanded, setIsExpanded] = useState(false);
  const [pendingValue, setPendingValue] = useState<T>(value);
  const [panelPosition, setPanelPosition] = useState<PanelPosition | null>(null);

  // Track previous value for render-time comparison (React's recommended pattern)
  const [prevValueJson, setPrevValueJson] = useState(() => JSON.stringify(value));

  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const originalValueRef = useRef<T>(value);

  // Sync pending value during render when external value changes (and panel is closed)
  // Uses React's "adjusting state during render" pattern - faster than useEffect
  const valueJson = JSON.stringify(value);
  if (!isExpanded && valueJson !== prevValueJson) {
    setPrevValueJson(valueJson);
    setPendingValue(value);
  }

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

  // Close when clicking outside or scrolling (consolidated into single effect)
  useEffect(() => {
    if (!isExpanded) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInContainer = containerRef.current?.contains(target);
      const isInPanel = panelRef.current?.contains(target);

      // Also check if click is inside any nested expandable panel
      // This handles cases where a color picker inside this panel opens its own portal
      const targetElement = target as Element;
      const isInNestedPanel =
        targetElement.closest?.('[data-expandable-panel]') !== null ||
        targetElement.closest?.('[data-color-picker-panel]') !== null;

      if (!(isInContainer || isInPanel || isInNestedPanel)) {
        if (autoApplyOnClose) {
          onChange(pendingValue);
        }
        setIsExpanded(false);
      }
    };

    const handleScroll = (event: Event) => {
      // Don't close if scrolling inside the panel itself
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) {
        return;
      }

      if (autoApplyOnClose) {
        onChange(pendingValue);
      }
      setIsExpanded(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isExpanded, pendingValue, onChange, autoApplyOnClose]);

  // Toggle panel
  const toggle = () => {
    if (disabled) return;

    if (isExpanded) {
      // Closing via toggle: apply changes
      onChange(pendingValue);
      setIsExpanded(false);
    } else {
      // Opening: notify parent to close other panels first
      onWillOpen?.();
      originalValueRef.current = value;
      setPendingValue(value);
      setIsExpanded(true);
    }
  };

  // Open panel
  const open = () => {
    if (disabled || isExpanded) return;
    onWillOpen?.();
    originalValueRef.current = value;
    setPendingValue(value);
    setIsExpanded(true);
  };

  // Close panel
  const close = () => {
    if (!isExpanded) return;
    if (autoApplyOnClose) {
      onChange(pendingValue);
    }
    setIsExpanded(false);
  };

  // Update pending value
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

  // Apply and close
  const apply = () => {
    onChange(pendingValue);
    setIsExpanded(false);
  };

  // Cancel and close
  const cancel = () => {
    const original = originalValueRef.current;
    setPendingValue(original);
    onPreviewChange?.(original);
    setIsExpanded(false);
  };

  // Reset to default
  const reset = (defaultValue: T) => {
    setPendingValue(defaultValue);
    onPreviewChange?.(defaultValue);
  };

  // Keyboard handler
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape' && isExpanded) {
      cancel();
    } else if (event.key === 'Enter' && isExpanded) {
      apply();
    }
  };

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
