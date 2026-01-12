/**
 * useDraggablePosition Hook
 *
 * Enables dragging and resizing an element.
 * Tracks position and size state with event handlers for both operations.
 * Allows dragging freely without viewport constraints.
 *
 * @module hooks/ui/useDraggablePosition
 */

import { useEffect, useRef, useState } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface DragState {
  position: Position;
  size: Size;
}

export type ResizeHandle =
  | 'top'
  | 'right'
  | 'bottom'
  | 'left'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

export interface UseDraggablePositionOptions {
  /** Whether dragging/resizing is enabled */
  enabled?: boolean;
  /** Minimum width when resizing */
  minWidth?: number;
  /** Minimum height when resizing */
  minHeight?: number;
  /** Called when position changes */
  onPositionChange?: (position: Position) => void;
}

export interface UseDraggablePositionResult {
  /** Current drag state (null means use default/initial position) */
  dragState: DragState | null;
  /** Whether currently dragging the element */
  isDragging: boolean;
  /** Whether currently resizing the element */
  isResizing: boolean;
  /** Props to spread on the drag handle element */
  dragHandleProps: {
    onMouseDown: (e: React.MouseEvent) => void;
    onTouchStart: (e: React.TouchEvent) => void;
    style: React.CSSProperties;
  };
  /** Get props for a resize handle */
  getResizeHandleProps: (handle: ResizeHandle) => {
    onMouseDown: (e: React.MouseEvent) => void;
    onTouchStart: (e: React.TouchEvent) => void;
    style: React.CSSProperties;
  };
  /** Reset position and size to initial/default */
  resetPosition: () => void;
}

// ============================================================================
// Resize Helpers (extracted for reduced complexity)
// ============================================================================

/** Check if handle affects right edge */
function isRightHandle(handle: ResizeHandle): boolean {
  return handle === 'right' || handle === 'top-right' || handle === 'bottom-right';
}

/** Check if handle affects left edge */
function isLeftHandle(handle: ResizeHandle): boolean {
  return handle === 'left' || handle === 'top-left' || handle === 'bottom-left';
}

/** Check if handle affects bottom edge */
function isBottomHandle(handle: ResizeHandle): boolean {
  return handle === 'bottom' || handle === 'bottom-left' || handle === 'bottom-right';
}

/** Check if handle affects top edge */
function isTopHandle(handle: ResizeHandle): boolean {
  return handle === 'top' || handle === 'top-left' || handle === 'top-right';
}

/** Calculate horizontal resize adjustments */
function calcHorizontalResize(
  handle: ResizeHandle,
  deltaX: number,
  startWidth: number,
  startX: number,
  minWidth: number
): { width: number; x: number } {
  if (isRightHandle(handle)) {
    return { width: Math.max(minWidth, startWidth + deltaX), x: startX };
  }
  if (isLeftHandle(handle)) {
    const potentialWidth = startWidth - deltaX;
    if (potentialWidth >= minWidth) {
      return { width: potentialWidth, x: startX + deltaX };
    }
    return { width: minWidth, x: startX + (startWidth - minWidth) };
  }
  return { width: startWidth, x: startX };
}

/** Calculate vertical resize adjustments */
function calcVerticalResize(
  handle: ResizeHandle,
  deltaY: number,
  startHeight: number,
  startY: number,
  minHeight: number
): { height: number; y: number } {
  if (isBottomHandle(handle)) {
    return { height: Math.max(minHeight, startHeight + deltaY), y: startY };
  }
  if (isTopHandle(handle)) {
    const potentialHeight = startHeight - deltaY;
    if (potentialHeight >= minHeight) {
      return { height: potentialHeight, y: startY + deltaY };
    }
    return { height: minHeight, y: startY + (startHeight - minHeight) };
  }
  return { height: startHeight, y: startY };
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useDraggablePosition(
  options: UseDraggablePositionOptions = {}
): UseDraggablePositionResult {
  const { enabled = true, minWidth = 200, minHeight = 100, onPositionChange } = options;

  // Drag/resize state (null = use default/initial position)
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  // Refs for tracking drag state without re-renders
  const dragStartRef = useRef<Position | null>(null);
  const elementStartRef = useRef<Position | null>(null);
  const elementSizeRef = useRef<Size>({ width: 0, height: 0 });

  // Refs for resize state
  const resizeHandleRef = useRef<ResizeHandle | null>(null);

  // Reset position and size
  const resetPosition = () => {
    setDragState(null);
  };

  // Handle mouse/touch start on drag handle
  const handleDragStart = (clientX: number, clientY: number, target: HTMLElement) => {
    if (!enabled) return;

    // Find the drawer element (parent with data-draggable-drawer)
    const drawer = target.closest('[data-draggable-drawer]') as HTMLElement | null;
    if (!drawer) return;

    const rect = drawer.getBoundingClientRect();

    // Store initial positions and dimensions
    dragStartRef.current = { x: clientX, y: clientY };
    elementStartRef.current = { x: rect.left, y: rect.top };
    elementSizeRef.current = { width: rect.width, height: rect.height };

    setIsDragging(true);
  };

  // Handle mouse/touch start on resize handle
  const handleResizeStart = (
    clientX: number,
    clientY: number,
    target: HTMLElement,
    handle: ResizeHandle
  ) => {
    if (!enabled) return;

    // Find the drawer element
    const drawer = target.closest('[data-draggable-drawer]') as HTMLElement | null;
    if (!drawer) return;

    const rect = drawer.getBoundingClientRect();

    // Store initial positions and dimensions
    dragStartRef.current = { x: clientX, y: clientY };
    elementStartRef.current = { x: rect.left, y: rect.top };
    elementSizeRef.current = { width: rect.width, height: rect.height };
    resizeHandleRef.current = handle;

    setIsResizing(true);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only handle left mouse button
    if (e.button !== 0) return;
    e.preventDefault();
    handleDragStart(e.clientX, e.clientY, e.target as HTMLElement);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    handleDragStart(touch.clientX, touch.clientY, e.target as HTMLElement);
  };

  // Handle mouse/touch move (attached to document when dragging)
  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (clientX: number, clientY: number) => {
      if (!(dragStartRef.current && elementStartRef.current)) return;

      // Calculate delta from drag start
      const deltaX = clientX - dragStartRef.current.x;
      const deltaY = clientY - dragStartRef.current.y;

      // Calculate new position (no viewport constraints - allow offscreen)
      const newX = elementStartRef.current.x + deltaX;
      const newY = elementStartRef.current.y + deltaY;

      const newPosition = { x: newX, y: newY };
      setDragState({ position: newPosition, size: elementSizeRef.current });
      onPositionChange?.(newPosition);
    };

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      handleMove(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
    };

    const handleEnd = () => {
      setIsDragging(false);
      dragStartRef.current = null;
      elementStartRef.current = null;
    };

    // Add listeners to document for smooth dragging even when cursor leaves element
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleEnd);
    document.addEventListener('touchcancel', handleEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleEnd);
      document.removeEventListener('touchcancel', handleEnd);
    };
  }, [isDragging, onPositionChange]);

  // Handle mouse/touch move for resizing
  useEffect(() => {
    if (!isResizing) return;

    const handleResizeMove = (clientX: number, clientY: number) => {
      if (!(dragStartRef.current && elementStartRef.current && resizeHandleRef.current)) return;

      const deltaX = clientX - dragStartRef.current.x;
      const deltaY = clientY - dragStartRef.current.y;
      const handle = resizeHandleRef.current;

      const horizontal = calcHorizontalResize(
        handle,
        deltaX,
        elementSizeRef.current.width,
        elementStartRef.current.x,
        minWidth
      );

      const vertical = calcVerticalResize(
        handle,
        deltaY,
        elementSizeRef.current.height,
        elementStartRef.current.y,
        minHeight
      );

      setDragState({
        position: { x: horizontal.x, y: vertical.y },
        size: { width: horizontal.width, height: vertical.height },
      });
    };

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      handleResizeMove(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      handleResizeMove(touch.clientX, touch.clientY);
    };

    const handleEnd = () => {
      setIsResizing(false);
      dragStartRef.current = null;
      elementStartRef.current = null;
      resizeHandleRef.current = null;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleEnd);
    document.addEventListener('touchcancel', handleEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleEnd);
      document.removeEventListener('touchcancel', handleEnd);
    };
  }, [isResizing, minWidth, minHeight]);

  const dragHandleProps = {
    onMouseDown: handleMouseDown,
    onTouchStart: handleTouchStart,
    style: {
      userSelect: 'none' as const,
      touchAction: 'none' as const,
    },
  };

  // Factory function to create props for resize handles
  const getResizeHandleProps = (handle: ResizeHandle) => {
    // Get cursor style for resize handle
    const getCursor = (): string => {
      switch (handle) {
        case 'top':
        case 'bottom':
          return 'ns-resize';
        case 'left':
        case 'right':
          return 'ew-resize';
        case 'top-left':
        case 'bottom-right':
          return 'nwse-resize';
        case 'top-right':
        case 'bottom-left':
          return 'nesw-resize';
        default:
          return 'default';
      }
    };

    return {
      onMouseDown: (e: React.MouseEvent) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        handleResizeStart(e.clientX, e.clientY, e.target as HTMLElement, handle);
      },
      onTouchStart: (e: React.TouchEvent) => {
        if (e.touches.length !== 1) return;
        e.stopPropagation();
        const touch = e.touches[0];
        handleResizeStart(touch.clientX, touch.clientY, e.target as HTMLElement, handle);
      },
      style: {
        cursor: getCursor(),
        userSelect: 'none' as const,
        touchAction: 'none' as const,
      },
    };
  };

  return {
    dragState,
    isDragging,
    isResizing,
    dragHandleProps,
    getResizeHandleProps,
    resetPosition,
  };
}
