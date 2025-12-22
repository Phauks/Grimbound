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

// Auto-resize textarea hooks
export type { UseAutoResizeTextareaOptions } from './useAutoResizeTextarea';
export { useAutoResizeTextarea } from './useAutoResizeTextarea';
export type { EditionFilter, TeamFilter } from './useCharacterFiltering';
// Character filtering hooks
export { useCharacterFiltering } from './useCharacterFiltering';
export type {
  ContextMenuPosition,
  UseContextMenuOptions,
  UseContextMenuReturn,
} from './useContextMenu';
// Context menu hooks
export { useContextMenu } from './useContextMenu';
export type { UseDraggableListOptions, UseDraggableListResult } from './useDraggableList';
// Draggable list hooks
export { useDraggableList } from './useDraggableList';
// Drawer animation hooks
export { useDrawerAnimation } from './useDrawerAnimation';
export type { UseDrawerStateOptions, UseDrawerStateReturn } from './useDrawerState';
// Drawer state hooks
export { useDrawerState } from './useDrawerState';
export type {
  PanelPosition,
  UseExpandablePanelOptions,
  UseExpandablePanelReturn,
} from './useExpandablePanel';
// Expandable panel hooks
export { useExpandablePanel } from './useExpandablePanel';
// Filter hooks
export { useFilters } from './useFilters';
export type { default as UseIntersectionObserverOptions } from './useIntersectionObserver';
// Intersection observer hooks
export { useIntersectionObserver } from './useIntersectionObserver';
export type { default as UseModalBehaviorOptions } from './useModalBehavior';
// Modal behavior hooks
export { useModalBehavior } from './useModalBehavior';
export type { UseSelectionOptions, UseSelectionReturn } from './useSelection';
// Selection hooks
export { useSelection } from './useSelection';
export type { UseUndoStackReturn } from './useUndoStack';
// Undo stack hooks
export { useUndoStack } from './useUndoStack';
