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
 * - Controlled field state (debounce + cursor protection)
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
// Controlled field hooks (debounce + cursor protection)
export type {
  UseControlledFieldOptions,
  UseControlledFieldResult,
} from './useControlledField';
export { useControlledField } from './useControlledField';
export type {
  FieldState,
  UseControlledFieldsOptions,
  UseControlledFieldsResult,
} from './useControlledFields';
export { useControlledFields } from './useControlledFields';
// Debounced callback hook
export type {
  UseDebouncedCallbackOptions,
  UseDebouncedCallbackResult,
} from './useDebouncedCallback';
export { useDebouncedCallback } from './useDebouncedCallback';
export type { UseDraggableListOptions, UseDraggableListResult } from './useDraggableList';
// Draggable list hooks
export { useDraggableList } from './useDraggableList';
export type {
  DragState,
  Position,
  ResizeHandle,
  Size,
  UseDraggablePositionOptions,
  UseDraggablePositionResult,
} from './useDraggablePosition';
// Draggable position hooks (for draggable drawers/panels)
export { useDraggablePosition } from './useDraggablePosition';
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
export type {
  UseIntersectionObserverOptions,
  UseIntersectionObserverReturn,
} from './useIntersectionObserver';
// Intersection observer hooks
export { useIntersectionObserver } from './useIntersectionObserver';
export type { UseModalBehaviorOptions, UseModalBehaviorReturn } from './useModalBehavior';
// Modal behavior hooks
export { useModalBehavior } from './useModalBehavior';
export type { UsePageScaleResult } from './usePageScale';
// Page scale hooks (WYSIWYG preview)
export { usePageScale } from './usePageScale';
export type {
  UseRecentColorsOptions,
  UseRecentColorsResult,
} from './useRecentColors';
// Recent colors hooks
export { addRecentColor, getRecentColors, useRecentColors } from './useRecentColors';
// Resizable sidebar hooks
export type {
  UseResizableSidebarOptions,
  UseResizableSidebarResult,
} from './useResizableSidebar';
export { useResizableSidebar } from './useResizableSidebar';
export type { UseSelectionOptions, UseSelectionReturn } from './useSelection';
// Selection hooks
export { useSelection } from './useSelection';
export type { UseUndoStackReturn } from './useUndoStack';
// Undo stack hooks
export { useUndoStack } from './useUndoStack';
// Virtual scroll hooks
export type {
  UseVirtualGridOptions,
  UseVirtualGridReturn,
  UseVirtualScrollOptions,
  UseVirtualScrollReturn,
} from './useVirtualScroll';
export { useVirtualGrid, useVirtualScroll } from './useVirtualScroll';
