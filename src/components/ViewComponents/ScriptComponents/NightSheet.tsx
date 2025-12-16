/**
 * Night Sheet Component
 *
 * A single night order sheet (First Night or Other Nights).
 * Fills the page container with customizable background.
 * Includes drag-and-drop reordering via @dnd-kit.
 */

import { forwardRef, useCallback, useMemo } from 'react'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core'
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers'
import type { NightOrderEntry as NightOrderEntryType } from '../../../ts/nightOrder/nightOrderTypes.js'
import type { ScriptMeta } from '../../../ts/types/index.js'
import type { NightSheetBackground } from './NightOrderView'
import { calculateScaleConfig, getScaleWarning } from '../../../ts/nightOrder/index.js'
import { SortableNightOrderEntry } from './SortableNightOrderEntry'
import { NightOrderEntry } from './NightOrderEntry'
import styles from '../../../styles/components/script/NightSheet.module.css'

export type NightSheetType = 'first' | 'other'

interface NightSheetProps {
    type: NightSheetType
    entries: NightOrderEntryType[]
    scriptMeta?: ScriptMeta | null
    /** Show drag handles for movable entries */
    enableDragDrop?: boolean
    /** Callback when entry is moved (for drag-drop) */
    onMoveEntry?: (entryId: string, newIndex: number) => void
    /** Background customization options */
    background?: NightSheetBackground
    /** Callback when "Edit Character" is selected from context menu */
    onEditCharacter?: (characterId: string) => void
}

/**
 * Get the display title for the sheet
 */
function getSheetTitle(type: NightSheetType): string {
    return type === 'first' ? 'First Night' : 'Other Nights'
}

/**
 * Generate SVG noise texture for paper effect
 */
function getNoiseTextureSvg(opacity: number): string {
    const encodedOpacity = opacity.toFixed(2)
    return `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='${encodedOpacity}'/%3E%3C/svg%3E")`
}

export const NightSheet = forwardRef<HTMLDivElement, NightSheetProps>(
    function NightSheet({
        type,
        entries,
        scriptMeta,
        enableDragDrop = false,
        onMoveEntry,
        background,
        onEditCharacter,
    }, ref) {
    const title = getSheetTitle(type)
    const scriptName = scriptMeta?.name || 'Untitled Script'
    const scriptLogo = scriptMeta?.logo

    // Calculate dynamic scaling to fit all entries on one page
    const scaleConfig = useMemo(() => calculateScaleConfig(entries), [entries])

    // Get warning message if scaled to minimum
    const scaleWarning = useMemo(() => getScaleWarning(scaleConfig), [scaleConfig])

    // Build dynamic background style with CSS custom properties for scaling
    const sheetStyle = useMemo(() => {
        const style: React.CSSProperties = {
            // Background customization
            backgroundColor: background?.baseColor || '#f4edd9',
            // CSS custom properties for dynamic scaling
            '--scale-factor': scaleConfig.scaleFactor,
            '--entry-height': `${scaleConfig.entryHeight}in`,
            '--icon-size': `${scaleConfig.iconSize}in`,
            '--name-font-size': `${scaleConfig.nameFontSize}pt`,
            '--ability-font-size': `${scaleConfig.abilityFontSize}pt`,
            '--entry-spacing': `${scaleConfig.entrySpacing}in`,
            '--header-font-size': `${scaleConfig.headerFontSize}rem`,
        } as React.CSSProperties

        if (background?.showTexture) {
            style.backgroundImage = getNoiseTextureSvg(background.textureOpacity)
        }

        return style
    }, [background, scaleConfig])

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
    )

    // Handle drag end
    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event

        if (over && active.id !== over.id) {
            const overIndex = entries.findIndex(e => e.id === over.id)
            if (overIndex !== -1 && onMoveEntry) {
                onMoveEntry(active.id as string, overIndex)
            }
        }
    }, [entries, onMoveEntry])

    // Get IDs for sortable context
    const entryIds = entries.map(entry => entry.id)

    // Check if we have any draggable entries
    const hasDraggableEntries = entries.some(e => !e.isLocked)

    // Render entries list
    const renderEntries = () => {
        if (entries.length === 0) {
            return (
                <div className={styles.emptyState}>
                    <p>No characters with night actions found.</p>
                    <p className={styles.hint}>Load a script to see the night order.</p>
                </div>
            )
        }

        // If drag-drop is disabled or no draggable entries, render simple list
        if (!enableDragDrop || !hasDraggableEntries) {
            return entries.map((entry, index) => (
                <NightOrderEntry
                    key={`${entry.id}-${index}`}
                    entry={entry}
                    showDragHandle={false}
                    showLockIcon={entry.isLocked}
                    onEditCharacter={onEditCharacter}
                />
            ))
        }

        // Render with DndContext for drag-drop support
        return (
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
                modifiers={[restrictToVerticalAxis, restrictToParentElement]}
            >
                <SortableContext
                    items={entryIds}
                    strategy={verticalListSortingStrategy}
                >
                    {entries.map((entry) => (
                        <SortableNightOrderEntry
                            key={entry.id}
                            entry={entry}
                            enableDragDrop={enableDragDrop}
                            onEditCharacter={onEditCharacter}
                        />
                    ))}
                </SortableContext>
            </DndContext>
        )
    }

    return (
        <div
            ref={ref}
            className={styles.sheet}
            data-night-type={type}
            style={sheetStyle}
        >
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
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                                const parent = target.parentElement
                                if (parent) {
                                    const textFallback = document.createElement('span')
                                    textFallback.className = styles.scriptName
                                    textFallback.textContent = scriptName
                                    parent.appendChild(textFallback)
                                }
                            }}
                        />
                    ) : (
                        <span className={styles.scriptName}>{scriptName}</span>
                    )}
                </div>
            </header>

            {/* Scaling Warning (if entries scaled to minimum size) */}
            {scaleWarning && (
                <div className={styles.scalingWarning}>
                    {scaleWarning}
                </div>
            )}

            {/* Night Order Entries */}
            <div className={styles.entriesContainer}>
                {renderEntries()}
            </div>
        </div>
    )
})
