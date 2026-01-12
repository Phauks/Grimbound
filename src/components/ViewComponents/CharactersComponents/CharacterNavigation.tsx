import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/Shared/UI/Button';
import type { ContextMenuItem } from '@/components/Shared/UI/ContextMenu';
import { ContextMenu } from '@/components/Shared/UI/ContextMenu';
import { useCharacterImageResolver, useContextMenu } from '@/hooks';
import styles from '@/styles/components/characterEditor/CharacterNavigation.module.css';
import type { Character, Team, Token } from '@/ts/types/index.js';

interface CharacterNavigationProps {
  characters: Character[];
  tokens: Token[];
  selectedCharacterUuid: string;
  isMetaSelected?: boolean;
  onSelectCharacter: (characterUuid: string) => void;
  onAddCharacter: () => void;
  onAddOfficialCharacter?: () => void;
  onDeleteCharacter: (characterId: string) => void;
  onDuplicateCharacter: (characterId: string) => void;
  onSelectMetaToken?: (token: Token) => void;
  onSelectMeta?: () => void;
  onChangeTeam?: (characterId: string, newTeam: Team) => void;
  onHoverCharacter?: (characterUuid: string) => void;
}

// Order teams for display
const TEAM_ORDER: Team[] = [
  'townsfolk',
  'outsider',
  'minion',
  'demon',
  'traveller',
  'fabled',
  'loric',
];

// Team display names
const TEAM_DISPLAY_NAMES: Record<Team, string> = {
  townsfolk: 'Townsfolk',
  outsider: 'Outsiders',
  minion: 'Minions',
  demon: 'Demons',
  traveller: 'Travellers',
  fabled: 'Fabled',
  loric: 'Loric',
  meta: 'Meta',
};

// Auto-scroll configuration
const SCROLL_EDGE_SIZE = 60; // pixels from edge to trigger scroll
const SCROLL_SPEED = 8; // pixels per frame

export function CharacterNavigation({
  characters,
  tokens,
  selectedCharacterUuid,
  onSelectCharacter,
  onAddCharacter,
  onAddOfficialCharacter,
  onDeleteCharacter,
  onDuplicateCharacter,
  onSelectMetaToken,
  onChangeTeam,
  onHoverCharacter,
}: CharacterNavigationProps) {
  const selectedRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const scrollAnimationRef = useRef<number | null>(null);
  const contextMenu = useContextMenu<string>();
  const [deleteConfirm, setDeleteConfirm] = useState<{
    characterId: string;
    characterName: string;
  } | null>(null);
  const [draggedCharId, setDraggedCharId] = useState<string | null>(null);
  const [dropTargetTeam, setDropTargetTeam] = useState<Team | null>(null);

  // Use shared hook for character image resolution
  const { resolvedUrls: resolvedImageUrls } = useCharacterImageResolver({ characters });

  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, []);

  const handleContextMenu = (e: React.MouseEvent, characterId: string) => {
    contextMenu.onContextMenu(e, characterId);
  };

  // Build context menu items dynamically based on the right-clicked character
  const contextMenuItems: ContextMenuItem[] = (() => {
    if (!contextMenu.data) return [];
    const characterId = contextMenu.data;
    const char = characters.find((c) => c.id === characterId);
    return [
      {
        icon: '📋',
        label: 'Duplicate',
        onClick: () => onDuplicateCharacter(characterId),
      },
      {
        icon: '🗑️',
        label: 'Delete',
        variant: 'danger' as const,
        onClick: () => {
          setDeleteConfirm({ characterId, characterName: char?.name || 'this character' });
        },
      },
    ];
  })();

  // Match by UUID only (UUID is required on all characters)
  const getReminderCount = (char: Character) => {
    if (!char.uuid) return 0;
    return tokens.filter((t) => t.type === 'reminder' && t.parentUuid === char.uuid).length;
  };

  // Get meta tokens (not character or reminder)
  const metaTokens = tokens.filter((t) => t.type !== 'character' && t.type !== 'reminder');

  // Group characters by team
  const charactersByTeam = TEAM_ORDER.reduce(
    (acc, team) => {
      acc[team] = characters.filter((char) => char.team === team);
      return acc;
    },
    {} as Record<Team, Character[]>
  );

  const handleDragStart = (e: React.DragEvent, charId: string) => {
    setDraggedCharId(charId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', charId);
  };

  const handleDragEnd = () => {
    setDraggedCharId(null);
    setDropTargetTeam(null);
    // Stop auto-scroll
    if (scrollAnimationRef.current) {
      cancelAnimationFrame(scrollAnimationRef.current);
      scrollAnimationRef.current = null;
    }
  };

  // Auto-scroll when dragging near edges
  const handleListDragOver = (e: React.DragEvent) => {
    if (!(listRef.current && draggedCharId)) return;

    const rect = listRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;

    // Cancel any existing animation
    if (scrollAnimationRef.current) {
      cancelAnimationFrame(scrollAnimationRef.current);
      scrollAnimationRef.current = null;
    }

    // Check if near top or bottom edge
    if (y < SCROLL_EDGE_SIZE) {
      // Near top - scroll up
      const scrollUp = () => {
        if (listRef.current && listRef.current.scrollTop > 0) {
          listRef.current.scrollTop -= SCROLL_SPEED;
          scrollAnimationRef.current = requestAnimationFrame(scrollUp);
        }
      };
      scrollAnimationRef.current = requestAnimationFrame(scrollUp);
    } else if (y > height - SCROLL_EDGE_SIZE) {
      // Near bottom - scroll down
      const scrollDown = () => {
        if (listRef.current) {
          const maxScroll = listRef.current.scrollHeight - listRef.current.clientHeight;
          if (listRef.current.scrollTop < maxScroll) {
            listRef.current.scrollTop += SCROLL_SPEED;
            scrollAnimationRef.current = requestAnimationFrame(scrollDown);
          }
        }
      };
      scrollAnimationRef.current = requestAnimationFrame(scrollDown);
    }
  };

  const handleDragOverTeam = (e: React.DragEvent, team: Team) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTargetTeam(team);
  };

  const handleDragLeaveTeam = () => {
    setDropTargetTeam(null);
  };

  const handleDropOnTeam = (e: React.DragEvent, team: Team) => {
    e.preventDefault();
    if (draggedCharId && onChangeTeam) {
      onChangeTeam(draggedCharId, team);
    }
    setDraggedCharId(null);
    setDropTargetTeam(null);
  };

  const renderCharacterItem = (char: Character) => {
    const reminderCount = getReminderCount(char);
    const isSelected = char.uuid === selectedCharacterUuid;
    const isDragging = draggedCharId === char.id;
    const isOfficial = char.source === 'official';
    const characterImageUrl = char.uuid ? resolvedImageUrls.get(char.uuid) : undefined;

    return (
      <button
        key={char.uuid || char.id}
        ref={isSelected ? selectedRef : null}
        type="button"
        className={`${styles.item} ${isSelected ? styles.selected : ''} ${isDragging ? styles.dragging : ''} ${isOfficial ? styles.official : ''}`}
        onClick={() => char.uuid && onSelectCharacter(char.uuid)}
        onMouseEnter={() => char.uuid && onHoverCharacter?.(char.uuid)}
        onContextMenu={(e) => handleContextMenu(e, char.id)}
        draggable={!!onChangeTeam && !isOfficial}
        onDragStart={(e) => handleDragStart(e, char.id)}
        onDragEnd={handleDragEnd}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            char.uuid && onSelectCharacter(char.uuid);
          }
        }}
        title={`${char.name}${reminderCount > 0 ? ` (${reminderCount} reminders)` : ''} - Right-click for options${onChangeTeam && !isOfficial ? ' - Drag to change team' : ''}${isOfficial ? ' - Official character' : ''}`}
      >
        <div className={styles.thumbnail}>
          {characterImageUrl ? (
            <img src={characterImageUrl} alt={char.name} className={styles.characterIcon} />
          ) : (
            <div className={styles.iconPlaceholder}>?</div>
          )}
        </div>
        <div className={styles.info}>
          <div className={styles.name}>{char.name}</div>
        </div>
        {reminderCount > 0 && <div className={styles.badge}>{reminderCount}</div>}
        {isOfficial && (
          <div className={styles.officialBadge} title="Official character">
            ✦
          </div>
        )}
      </button>
    );
  };

  const renderMetaTokenItem = (token: Token) => (
    <button
      key={token.filename}
      type="button"
      className={styles.item}
      title={token.name}
      onClick={() => onSelectMetaToken?.(token)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onSelectMetaToken?.(token);
        }
      }}
    >
      <div className={styles.thumbnail}>
        {token.dataUrl ? (
          <img src={token.dataUrl} alt={token.name} width="32" height="32" />
        ) : (
          <div className={styles.thumbnailPlaceholder} />
        )}
      </div>
      <div className={styles.info}>
        <div className={styles.name}>{token.name}</div>
      </div>
    </button>
  );

  return (
    <aside className={styles.nav}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <h3 className={styles.headerTitle}>Characters</h3>
          <div className={styles.headerButtons}>
            <Button
              variant="ghost"
              size="small"
              isIconOnly
              onClick={onAddCharacter}
              title="Create Custom Character"
              aria-label="Create Custom Character"
            >
              +
            </Button>
            {onAddOfficialCharacter && (
              <Button
                variant="ghost"
                size="small"
                isIconOnly
                onClick={onAddOfficialCharacter}
                title="Add Official Character"
                aria-label="Add Official Character"
              >
                📚
              </Button>
            )}
          </div>
        </div>
      </div>
      <nav
        ref={listRef}
        aria-label="Character list"
        className={styles.list}
        onDragOver={handleListDragOver}
      >
        {TEAM_ORDER.map((team) => {
          const teamCharacters = charactersByTeam[team];
          if (teamCharacters.length === 0) return null;

          const isDropTarget = dropTargetTeam === team;

          return (
            <section
              key={team}
              aria-label={`${TEAM_DISPLAY_NAMES[team]} characters`}
              className={`${styles.teamSection} ${isDropTarget ? styles.dropTarget : ''}`}
              onDragOver={(e) => handleDragOverTeam(e, team)}
              onDragLeave={handleDragLeaveTeam}
              onDrop={(e) => handleDropOnTeam(e, team)}
            >
              <div className={styles.teamLabel}>
                <span className={`${styles.teamName} ${styles[team]}`}>
                  {TEAM_DISPLAY_NAMES[team]}
                </span>
                <div className={styles.teamLine} />
                <span className={styles.teamCount}>{teamCharacters.length}</span>
              </div>
              <div className={styles.teamCharacters}>
                {teamCharacters.map((char) => renderCharacterItem(char))}
              </div>
            </section>
          );
        })}

        {/* Meta tokens section - only visible when there are generated meta tokens */}
        {metaTokens.length > 0 && (
          <div className={styles.teamSection}>
            <div className={styles.teamLabel}>
              <span className={`${styles.teamName} ${styles.meta}`}>{TEAM_DISPLAY_NAMES.meta}</span>
              <div className={styles.teamLine} />
              <span className={styles.teamCount}>{metaTokens.length}</span>
            </div>
            <div className={styles.teamCharacters}>
              {metaTokens.map((token) => renderMetaTokenItem(token))}
            </div>
          </div>
        )}
      </nav>

      {/* Context menu */}
      <ContextMenu
        ref={contextMenu.menuRef}
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        items={contextMenuItems}
        onClose={contextMenu.close}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <button
          type="button"
          className={styles.confirmOverlay}
          onClick={() => setDeleteConfirm(null)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setDeleteConfirm(null);
            }
          }}
          aria-label="Close delete confirmation"
        >
          <section
            className={styles.confirmModal}
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              e.stopPropagation();
            }}
          >
            <h3>Delete Character?</h3>
            <p>
              Are you sure you want to delete "{deleteConfirm.characterName}"? This action cannot be
              undone.
            </p>
            <div className={styles.confirmButtons}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.dangerBtn}
                onClick={() => {
                  onDeleteCharacter(deleteConfirm.characterId);
                  setDeleteConfirm(null);
                }}
              >
                Delete
              </button>
            </div>
          </section>
        </button>
      )}
    </aside>
  );
}
