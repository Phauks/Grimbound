/**
 * Night Sheet Component
 *
 * A single night order sheet (First Night or Other Nights).
 * Fills the page container with customizable background.
 * Includes drag-and-drop reordering via @dnd-kit.
 */

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { type Ref, useEffect, useState } from 'react';
import styles from '@/styles/components/script/NightSheet.module.css';
import {
  calculateScaleConfig,
  getFullScaleConfig,
  getScaleWarning,
} from '@/ts/nightOrder/index.js';
import type { NightOrderEntry as NightOrderEntryType } from '@/ts/nightOrder/nightOrderTypes.js';
import type { MarginConfig } from '@/ts/scriptPdf/types.js';
import type { BackgroundStyle } from '@/ts/types/backgroundEffects.js';
import type { Character, ScriptMeta } from '@/ts/types/index.js';
import { NightOrderEntry } from './NightOrderEntry';
import { SortableNightOrderEntry } from './SortableNightOrderEntry';

export type NightSheetType = 'first' | 'other';

interface NightSheetProps {
  type: NightSheetType;
  entries: NightOrderEntryType[];
  /** Characters array to derive isOfficial status (from Character.source) */
  characters: Character[];
  scriptMeta?: ScriptMeta | null;
  /** Show drag handles for movable entries */
  enableDragDrop?: boolean;
  /** Callback when entry is moved (for drag-drop) */
  onMoveEntry?: (entryId: string, newIndex: number) => void;
  /** Background style configuration */
  background?: BackgroundStyle;
  /** Callback when "Edit Character" is selected from context menu */
  onEditCharacter?: (characterId: string) => void;
  /** Callback when lock state is toggled for an entry */
  onToggleLock?: (entryId: string) => void;
  /** Current page number (1-based) for multi-page exports */
  pageNumber?: number;
  /** Total number of pages for this night type */
  totalPages?: number;
  /** Icon scale multiplier (0.5 to 1.5, default 1.0) */
  iconScale?: number;
  /** Page margins in inches */
  margins?: MarginConfig;
}

/**
 * Get the display title for the sheet
 */
function getSheetTitle(type: NightSheetType): string {
  return type === 'first' ? 'First Night' : 'Other Nights';
}

export function NightSheet({
  type,
  entries,
  characters,
  scriptMeta,
  enableDragDrop = false,
  onMoveEntry,
  background,
  onEditCharacter,
  onToggleLock,
  pageNumber,
  totalPages,
  iconScale = 1.0,
  margins,
  ref,
}: NightSheetProps & { ref?: Ref<HTMLDivElement> }) {
  // Build title with page number if multi-page
  const baseTitle = getSheetTitle(type);
  const title =
    pageNumber && totalPages && totalPages > 1
      ? `${baseTitle} (${pageNumber}/${totalPages})`
      : baseTitle;
  const scriptName = scriptMeta?.name || 'Untitled Script';
  const scriptLogo = scriptMeta?.logo;

  // Create a lookup map for character source (case-insensitive)
  const characterSourceMap = (() => {
    const map = new Map<string, 'official' | 'custom'>();
    for (const char of characters) {
      map.set(char.id.toLowerCase(), char.source || 'custom');
    }
    return map;
  })();

  // Helper to check if an entry is official
  const isEntryOfficial = (entry: NightOrderEntryType): boolean => {
    // Special entries are not "official" in the movable sense
    if (entry.type === 'special') return false;
    // Check character source
    const source = characterSourceMap.get(entry.id.toLowerCase());
    return source === 'official';
  };

  // Calculate scaling: full scale when paginated, dynamic scaling otherwise
  const scaleConfig = (() => {
    // If paginated (pageNumber provided), use full scale - pagination handles overflow
    if (pageNumber !== undefined) {
      return getFullScaleConfig(entries);
    }
    // Otherwise, scale to fit all entries on one page
    return calculateScaleConfig(entries);
  })();

  // Get warning message if scaled to minimum (only applies when not paginated)
  const scaleWarning = pageNumber !== undefined ? null : getScaleWarning(scaleConfig);

  // Build dynamic background style with CSS custom properties for scaling
  const sheetStyle: React.CSSProperties = {
    // Background customization (uses solidColor from BackgroundStyle)
    backgroundColor: background?.solidColor || '#f4edd9',
    // Page margins (override CSS defaults if provided)
    ...(margins && {
      padding: `${margins.top}in ${margins.right}in ${margins.bottom}in ${margins.left}in`,
    }),
    // CSS custom properties for dynamic scaling
    '--scale-factor': scaleConfig.scaleFactor,
    '--entry-height': `${scaleConfig.entryHeight}in`,
    '--icon-size': `${scaleConfig.iconSize}in`,
    '--icon-scale': iconScale, // Transform-based scale (doesn't affect layout)
    '--name-font-size': `${scaleConfig.nameFontSize}pt`,
    '--ability-font-size': `${scaleConfig.abilityFontSize}pt`,
    '--entry-spacing': `${scaleConfig.entrySpacing}in`,
    '--header-font-size': `${scaleConfig.headerFontSize}rem`,
  } as React.CSSProperties;

  // Track if currently dragging for cursor state
  const [isDragging, setIsDragging] = useState(false);

  // Apply grabbing cursor to body when dragging
  useEffect(() => {
    if (isDragging) {
      document.body.style.cursor = 'grabbing';
      // Prevent text selection during drag
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging]);

  // Configure dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag start
  const handleDragStart = () => {
    setIsDragging(true);
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    setIsDragging(false);
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const overIndex = entries.findIndex((e) => e.id === over.id);
      if (overIndex !== -1 && onMoveEntry) {
        onMoveEntry(active.id as string, overIndex);
      }
    }
  };

  // Handle drag cancel (e.g., pressing Escape)
  const handleDragCancel = () => {
    setIsDragging(false);
  };

  // Get IDs for sortable context
  const entryIds = entries.map((entry) => entry.id);

  // Check if we have any draggable entries (custom characters)
  const hasDraggableEntries = entries.some((e) => !isEntryOfficial(e));

  // Render entries list
  const renderEntries = () => {
    if (entries.length === 0) {
      return (
        <div className={styles.emptyState}>
          <p>No characters with night actions found.</p>
          <p className={styles.hint}>Load a script to see the night order.</p>
        </div>
      );
    }

    // If drag-drop is disabled or no draggable entries, render simple list
    if (!(enableDragDrop && hasDraggableEntries)) {
      return entries.map((entry, index) => {
        const isOfficial = isEntryOfficial(entry);
        return (
          <NightOrderEntry
            key={`${entry.id}-${index}`}
            entry={entry}
            isOfficial={isOfficial}
            showDragHandle={false}
            showLockIcon={isOfficial}
            onEditCharacter={onEditCharacter}
            onToggleLock={onToggleLock}
          />
        );
      });
    }

    // Render with DndContext for drag-drop support
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      >
        <SortableContext items={entryIds} strategy={verticalListSortingStrategy}>
          {entries.map((entry) => (
            <SortableNightOrderEntry
              key={entry.id}
              entry={entry}
              isOfficial={isEntryOfficial(entry)}
              enableDragDrop={enableDragDrop}
              onEditCharacter={onEditCharacter}
              onToggleLock={onToggleLock}
            />
          ))}
        </SortableContext>
      </DndContext>
    );
  };

  return (
    <div ref={ref} className={styles.sheet} data-night-type={type} style={sheetStyle}>
      {/* Sheet Header */}
      <header className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        <div className={styles.scriptInfo}>
          {scriptLogo ? (
            <img
              src={scriptLogo}
              alt={scriptName}
              className={styles.scriptLogo}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  const textFallback = document.createElement('span');
                  textFallback.className = styles.scriptName;
                  textFallback.textContent = scriptName;
                  parent.appendChild(textFallback);
                }
              }}
            />
          ) : (
            <span className={styles.scriptName}>{scriptName}</span>
          )}
        </div>
      </header>

      {/* Scaling Warning (if entries scaled to minimum size) */}
      {scaleWarning && <div className={styles.scalingWarning}>{scaleWarning}</div>}

      {/* Night Order Entries */}
      <div className={styles.entriesContainer}>{renderEntries()}</div>
    </div>
  );
}
