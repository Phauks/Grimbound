/**
 * Night Order Entry Component
 *
 * Renders a single row in the night order sheet.
 * Layout: [Icon] [Character Name] (with ability text below)
 *
 * Typography:
 * - Character name: Goudy Old Style
 * - Ability text: Trade Gothic (with Trade Gothic Bold for reminder tokens)
 */

import { useMemo, useState, useEffect, useCallback } from 'react'
import type { NightOrderEntry as NightOrderEntryType } from '../../../ts/nightOrder/nightOrderTypes.js'
import { parseAbilityText, getTeamColor } from '../../../ts/nightOrder/nightOrderUtils.js'
import { resolveCharacterImageUrl } from '../../../ts/utils/characterImageResolver.js'
import { useContextMenu } from '../../../hooks/useContextMenu'
import { ContextMenu, type ContextMenuItem } from '../../Shared/UI/ContextMenu'
import styles from '../../../styles/components/script/NightOrderEntry.module.css'

interface NightOrderEntryProps {
    entry: NightOrderEntryType
    /** Whether to show the drag handle (only for movable entries) */
    showDragHandle?: boolean
    /** Whether to show the lock icon (only for locked entries) */
    showLockIcon?: boolean
    /** Drag handle props from dnd-kit (optional) */
    dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
    /** Whether this entry is currently being dragged */
    isDragging?: boolean
    /** Callback when "Edit Character" is selected from context menu */
    onEditCharacter?: (characterId: string) => void
}

/**
 * Render ability text with bold reminder tokens and circle indicators
 */
function AbilityText({ text }: { text: string }) {
    const segments = useMemo(() => parseAbilityText(text), [text])

    return (
        <span className={styles.abilityText}>
            {segments.map((segment, index) => {
                if (segment.isCircle) {
                    return (
                        <span key={index} className={styles.reminderCircle}>
                            ●
                        </span>
                    )
                } else if (segment.isBold) {
                    return (
                        <strong key={index} className={styles.reminderToken}>
                            {segment.text}
                        </strong>
                    )
                } else {
                    return <span key={index}>{segment.text}</span>
                }
            })}
        </span>
    )
}

export function NightOrderEntry({
    entry,
    showDragHandle = false,
    showLockIcon = true,
    dragHandleProps,
    isDragging = false,
    onEditCharacter,
}: NightOrderEntryProps) {
    const teamColor = getTeamColor(entry.team)

    // Context menu using shared hook
    const contextMenu = useContextMenu<string>()

    // Resolve image URL using SSOT utility (handles asset refs, external URLs, and sync storage)
    const [resolvedImageUrl, setResolvedImageUrl] = useState<string>('')

    useEffect(() => {
        let cancelled = false
        const blobUrls: string[] = []

        resolveCharacterImageUrl(entry.image, entry.id, { logContext: 'NightOrderEntry' })
            .then(result => {
                if (!cancelled) {
                    // Track blob URLs for cleanup
                    if (result.blobUrl) {
                        blobUrls.push(result.blobUrl)
                    }
                    setResolvedImageUrl(result.url)
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setResolvedImageUrl(entry.image) // Fallback to original on error
                }
            })

        // Cleanup blob URLs on unmount or when image changes
        return () => {
            cancelled = true
            blobUrls.forEach(url => URL.revokeObjectURL(url))
        }
    }, [entry.image, entry.id])

    // Handle right-click to show context menu (only for character entries)
    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        // Only show context menu for character entries (not special entries like DUSK/DAWN)
        if (entry.type === 'special') return
        contextMenu.onContextMenu(e, entry.id)
    }, [entry.type, entry.id, contextMenu])

    // Build context menu items
    const menuItems = useMemo((): ContextMenuItem[] => [
        {
            icon: '✏️',
            label: 'Edit Character',
            onClick: () => {
                if (onEditCharacter && contextMenu.data) {
                    onEditCharacter(contextMenu.data)
                }
            },
        },
    ], [onEditCharacter, contextMenu.data])

    return (
        <div
            className={`${styles.entry} ${isDragging ? styles.dragging : ''} ${entry.type === 'special' ? styles.special : ''}`}
            data-team={entry.team}
            data-type={entry.type}
            onContextMenu={handleContextMenu}
        >
            {/* Drag handle or lock icon */}
            <div className={styles.dragArea}>
                {entry.isLocked && showLockIcon ? (
                    <span className={styles.lockIcon} title="This entry cannot be moved">
                        🔒
                    </span>
                ) : showDragHandle ? (
                    <div
                        className={styles.dragHandle}
                        {...dragHandleProps}
                        title="Drag to reorder"
                    >
                        <span className={styles.dragIcon}>⋮⋮</span>
                    </div>
                ) : (
                    <span className={styles.spacer} />
                )}
            </div>

            {/* Character/Special icon */}
            <div className={styles.iconContainer}>
                <img
                    src={resolvedImageUrl}
                    alt={entry.name}
                    className={styles.icon}
                    onError={(e) => {
                        // Fallback for missing images
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                    }}
                />
            </div>

            {/* Content: Name and ability */}
            <div className={styles.content}>
                <div
                    className={styles.name}
                    style={{ color: teamColor }}
                >
                    {entry.name}
                </div>
                <div className={styles.ability}>
                    <AbilityText text={entry.ability} />
                </div>
            </div>

            {/* Reminder indicator dot (if ability mentions reminder tokens) */}
            {entry.ability.includes('*') && (
                <div className={styles.reminderIndicator} title="Uses reminder tokens">
                    ●
                </div>
            )}

            {/* Context menu */}
            <ContextMenu
                ref={contextMenu.menuRef}
                isOpen={contextMenu.isOpen}
                position={contextMenu.position}
                items={menuItems}
                onClose={contextMenu.close}
            />
        </div>
    )
}
