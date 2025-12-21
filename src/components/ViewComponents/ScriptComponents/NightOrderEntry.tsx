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

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useContextMenu } from '@/hooks';
import styles from '@/styles/components/script/NightOrderEntry.module.css';
import { tabPreRenderService } from '@/ts/cache/index.js';
import type { NightOrderEntry as NightOrderEntryType } from '@/ts/nightOrder/nightOrderTypes.js';
import { getTeamColor, parseAbilityText } from '@/ts/nightOrder/nightOrderUtils.js';
import { resolveCharacterImageUrl } from '@/ts/utils/characterImageResolver.js';
import { ContextMenu, type ContextMenuItem } from '@/components/Shared/UI/ContextMenu';

interface NightOrderEntryProps {
  entry: NightOrderEntryType;
  /** Whether this entry represents an official character (derived from Character.source) */
  isOfficial: boolean;
  /** Whether to show the drag handle (only for movable entries) */
  showDragHandle?: boolean;
  /** Whether to show the lock icon (only for locked entries) */
  showLockIcon?: boolean;
  /** Drag handle props from dnd-kit (optional) */
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  /** Whether this entry is currently being dragged */
  isDragging?: boolean;
  /** Callback when "Edit Character" is selected from context menu */
  onEditCharacter?: (characterId: string) => void;
  /** Callback when lock state is toggled for an entry */
  onToggleLock?: (entryId: string) => void;
}

/**
 * Render ability text with bold reminder tokens and circle indicators
 */
function AbilityText({ text }: { text: string }) {
  const segments = useMemo(() => parseAbilityText(text), [text]);

  // Pre-compute occurrence counts for stable keys
  const getOccurrenceKey = (segment: typeof segments[0], idx: number): string => {
    const prefix = segment.isCircle ? 'circle' : segment.isBold ? 'bold' : 'text';
    const content = segment.isCircle ? 'dot' : segment.text;
    const priorOccurrences = segments.slice(0, idx).filter(s =>
      (s.isCircle === segment.isCircle) && (s.text === segment.text)
    ).length;
    return `${prefix}-${content}-${priorOccurrences}`;
  };

  return (
    <span className={styles.abilityText}>
      {segments.map((segment, index) => {
        const key = getOccurrenceKey(segment, index);
        if (segment.isCircle) {
          return (
            <span key={key} className={styles.reminderCircle}>
              ●
            </span>
          );
        } else if (segment.isBold) {
          return (
            <strong key={key} className={styles.reminderToken}>
              {segment.text}
            </strong>
          );
        } else {
          return <span key={key}>{segment.text}</span>;
        }
      })}
    </span>
  );
}

export function NightOrderEntry({
  entry,
  isOfficial,
  showDragHandle = false,
  showLockIcon = true,
  dragHandleProps,
  isDragging = false,
  onEditCharacter,
  onToggleLock,
}: NightOrderEntryProps) {
  const teamColor = getTeamColor(entry.team);

  // Context menu using shared hook
  const contextMenu = useContextMenu<string>();

  // Check for pre-cached image URL first (from TabPreRenderService)
  const cachedImageUrl = tabPreRenderService.getCachedCharacterImageUrl(entry.id);

  // Resolve image URL using SSOT utility (handles asset refs, external URLs, and sync storage)
  // Initialize with cached URL if available for instant display
  const [resolvedImageUrl, setResolvedImageUrl] = useState<string>(cachedImageUrl || '');

  useEffect(() => {
    // Skip async resolution if we already have a cached URL
    if (cachedImageUrl) {
      setResolvedImageUrl(cachedImageUrl);
      return;
    }

    let cancelled = false;
    const blobUrls: string[] = [];

    resolveCharacterImageUrl(entry.image, entry.id, { logContext: 'NightOrderEntry' })
      .then((result) => {
        if (!cancelled) {
          // Track blob URLs for cleanup
          if (result.blobUrl) {
            blobUrls.push(result.blobUrl);
          }
          setResolvedImageUrl(result.url);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResolvedImageUrl(entry.image); // Fallback to original on error
        }
      });

    // Cleanup blob URLs on unmount or when image changes
    return () => {
      cancelled = true;
      for (const url of blobUrls) {
        URL.revokeObjectURL(url);
      }
    };
  }, [entry.image, entry.id, cachedImageUrl]);

  // Handle right-click to show context menu (only for character entries)
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      // Only show context menu for character entries (not special entries like DUSK/DAWN)
      if (entry.type === 'special') return;
      contextMenu.onContextMenu(e, entry.id);
    },
    [entry.type, entry.id, contextMenu]
  );

  // Build context menu items
  const menuItems = useMemo((): ContextMenuItem[] => {
    const items: ContextMenuItem[] = [];

    // Convert to Custom option - only for official character entries
    // Converting to custom allows reordering
    if (entry.type === 'character' && isOfficial && onToggleLock && contextMenu.data) {
      items.push({
        icon: '🔓',
        label: 'Convert to Custom',
        description: 'Treat as custom character to enable reordering',
        onClick: () => {
          onToggleLock(contextMenu.data as string);
        },
      });
    }

    // Edit character option
    items.push({
      icon: '✏️',
      label: 'Edit Character',
      onClick: () => {
        if (onEditCharacter && contextMenu.data) {
          onEditCharacter(contextMenu.data);
        }
      },
    });

    return items;
  }, [entry.type, isOfficial, onEditCharacter, onToggleLock, contextMenu.data]);

  return (
    <button
      type="button"
      className={`${styles.entry} ${isDragging ? styles.dragging : ''} ${entry.type === 'special' ? styles.special : ''}`}
      data-team={entry.team}
      data-type={entry.type}
      onContextMenu={handleContextMenu}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && entry.type !== 'special') {
          e.preventDefault();
          contextMenu.onContextMenu(
            // Create a synthetic MouseEvent for context menu
            {
              ...e,
              preventDefault: () => {},
              stopPropagation: () => {},
              button: 2,
              clientX: 0,
              clientY: 0,
            } as unknown as React.MouseEvent,
            entry.id
          );
        }
      }}
      aria-label={`Night order entry for ${entry.name}`}
      tabIndex={0}
      style={{
        background: 'none',
        border: 'none',
        padding: 0,
        width: '100%',
        textAlign: 'inherit',
      }}
    >
      {/* Drag handle or lock icon */}
      <div className={styles.dragArea}>
        {isOfficial && showLockIcon ? (
          <span className={styles.lockIcon} title="This entry cannot be moved">
            🔒
          </span>
        ) : showDragHandle ? (
          <div className={styles.dragHandle} {...dragHandleProps} title="Drag to reorder">
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
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
          }}
        />
      </div>

      {/* Content: Name and ability */}
      <div className={styles.content}>
        <div className={styles.name} style={{ color: teamColor }}>
          {entry.name}
        </div>
        <div className={styles.ability}>
          <AbilityText text={entry.ability} />
        </div>
      </div>

      {/* Context menu */}
      <ContextMenu
        ref={contextMenu.menuRef}
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        items={menuItems}
        onClose={contextMenu.close}
      />
    </button>
  );
}
