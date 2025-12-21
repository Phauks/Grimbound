/**
 * useDraggableList Hook
 *
 * A wrapper around @dnd-kit for managing sortable list reordering.
 * Provides a simplified API for common list reordering scenarios.
 *
 * @module hooks/ui/useDraggableList
 */

import { useCallback, useState } from 'react';
import type { DragEndEvent, UniqueIdentifier } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';

export interface UseDraggableListOptions<T> {
  /** The list of items to manage */
  items: T[];
  /** Function to get unique ID from an item */
  getItemId: (item: T, index: number) => UniqueIdentifier;
  /** Callback when items are reordered */
  onReorder: (newItems: T[]) => void;
  /** Whether dragging is disabled */
  disabled?: boolean;
}

export interface UseDraggableListResult<T> {
  /** Current items */
  items: T[];
  /** IDs for SortableContext */
  itemIds: UniqueIdentifier[];
  /** Whether an item is currently being dragged */
  isDragging: boolean;
  /** The ID of the currently dragged item */
  activeId: UniqueIdentifier | null;
  /** Handler for DndContext onDragStart */
  onDragStart: (event: { active: { id: UniqueIdentifier } }) => void;
  /** Handler for DndContext onDragEnd */
  onDragEnd: (event: DragEndEvent) => void;
  /** Handler for DndContext onDragCancel */
  onDragCancel: () => void;
}

/**
 * Hook for managing dnd-kit sortable list state and handlers.
 *
 * @example
 * ```tsx
 * import { DndContext, closestCenter } from '@dnd-kit/core';
 * import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
 *
 * const { itemIds, activeId, onDragStart, onDragEnd, onDragCancel } = useDraggableList({
 *   items: images,
 *   getItemId: (_, index) => `image-${index}`,
 *   onReorder: setImages,
 * });
 *
 * return (
 *   <DndContext
 *     collisionDetection={closestCenter}
 *     onDragStart={onDragStart}
 *     onDragEnd={onDragEnd}
 *     onDragCancel={onDragCancel}
 *   >
 *     <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
 *       {items.map((item, index) => (
 *         <SortableItem key={itemIds[index]} id={itemIds[index]} item={item} />
 *       ))}
 *     </SortableContext>
 *   </DndContext>
 * );
 * ```
 */
export function useDraggableList<T>({
  items,
  getItemId,
  onReorder,
  disabled = false,
}: UseDraggableListOptions<T>): UseDraggableListResult<T> {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

  const itemIds = items.map((item, index) => getItemId(item, index));

  const onDragStart = useCallback(
    (event: { active: { id: UniqueIdentifier } }) => {
      if (disabled) return;
      setActiveId(event.active.id);
    },
    [disabled]
  );

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (disabled || !over || active.id === over.id) return;

      const oldIndex = itemIds.indexOf(active.id);
      const newIndex = itemIds.indexOf(over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newItems = arrayMove(items, oldIndex, newIndex);
        onReorder(newItems);
      }
    },
    [items, itemIds, onReorder, disabled]
  );

  const onDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  return {
    items,
    itemIds,
    isDragging: activeId !== null,
    activeId,
    onDragStart,
    onDragEnd,
    onDragCancel,
  };
}

export default useDraggableList;
