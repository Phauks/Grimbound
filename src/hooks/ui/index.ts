/**
 * UI Hooks Module
 *
 * Collection of hooks for UI interactions and behaviors:
 * - Selection management
 * - Undo/redo stack
 * - Modal behaviors
 * - Context menus
 * - Expandable panels
 * - Drag and drop lists
 * - Filters
 * - Auto-resize textarea
 * - Intersection observer
 *
 * @module hooks/ui
 */

// Selection hooks
export { useSelection } from './useSelection';
export type { UseSelectionOptions, UseSelectionReturn } from './useSelection';

// Undo stack hooks
export { useUndoStack } from './useUndoStack';
export type { UseUndoStackReturn } from './useUndoStack';

// Modal behavior hooks
export { useModalBehavior } from './useModalBehavior';
export type { default as UseModalBehaviorOptions } from './useModalBehavior';

// Context menu hooks
export { useContextMenu } from './useContextMenu';
export type {
  ContextMenuPosition,
  UseContextMenuOptions,
  UseContextMenuReturn,
} from './useContextMenu';

// Expandable panel hooks
export { useExpandablePanel } from './useExpandablePanel';
export type {
  PanelPosition,
  UseExpandablePanelOptions,
  UseExpandablePanelReturn,
} from './useExpandablePanel';

// Draggable list hooks
export { useDraggableList } from './useDraggableList';
export type { UseDraggableListOptions, UseDraggableListResult } from './useDraggableList';

// Filter hooks
export { useFilters } from './useFilters';

// Auto-resize textarea hooks
export { useAutoResizeTextarea } from './useAutoResizeTextarea';

// Intersection observer hooks
export { useIntersectionObserver } from './useIntersectionObserver';
export type { default as UseIntersectionObserverOptions } from './useIntersectionObserver';
