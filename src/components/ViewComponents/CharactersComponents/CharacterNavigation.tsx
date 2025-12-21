import { useEffect, useMemo, useRef, useState } from 'react';
import { useCharacterImageResolver, useContextMenu } from '@/hooks';
import styles from '@/styles/components/characterEditor/CharacterNavigation.module.css';
import type { Character, Team, Token } from '@/ts/types/index.js';
import type { ContextMenuItem } from '@/components/Shared/UI/ContextMenu';
import { ContextMenu } from '@/components/Shared/UI/ContextMenu';

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

// Map team names to CSS Module class names
const teamHeaderClassMap: Record<string, string> = {
  townsfolk: styles.teamTownsfolk,
  outsider: styles.teamOutsider,
  minion: styles.teamMinion,
  demon: styles.teamDemon,
  traveller: styles.teamTraveller,
  traveler: styles.teamTraveller,
  fabled: styles.teamFabled,
  loric: styles.teamLoric,
  meta: styles.teamMeta,
};

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
  // Meta section is always visible so we don't collapse it by default
  const [collapsedTeams, setCollapsedTeams] = useState<Set<string>>(
    () => new Set([...TEAM_ORDER.map((t) => t as string)])
  );
  // Context menu state using shared hook
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
  const contextMenuItems: ContextMenuItem[] = useMemo(() => {
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
  }, [contextMenu.data, characters, onDuplicateCharacter]);

  // Match by UUID only (UUID is required on all characters)

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

  const toggleTeamCollapse = (team: string) => {
    setCollapsedTeams((prev) => {
      const next = new Set(prev);
      if (next.has(team)) {
        next.delete(team);
      } else {
        next.add(team);
      }
      return next;
    });
  };

  const handleDragStart = (e: React.DragEvent, charId: string) => {
    setDraggedCharId(charId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', charId);
  };

  const handleDragEnd = () => {
    setDraggedCharId(null);
    setDropTargetTeam(null);
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

  const renderCharacterItem = (char: Character, isLast: boolean) => {
    const reminderCount = getReminderCount(char);
    const isSelected = char.uuid === selectedCharacterUuid;
    const teamClass = char.team?.toLowerCase() || 'townsfolk';
    const teamStyle = teamHeaderClassMap[teamClass] || '';
    const isDragging = draggedCharId === char.id;
    // Official based on character source field
    const isOfficial = char.source === 'official';
    // Get resolved character icon image
    const characterImageUrl = char.uuid ? resolvedImageUrls.get(char.uuid) : undefined;

    return (
      <div
        key={char.uuid || char.id}
        className={`${styles.itemWrapper} ${!isLast ? styles.withDivider : ''}`}
      >
        <button
          ref={isSelected ? selectedRef : null}
          type="button"
          className={`${styles.item} ${teamStyle} ${isSelected ? styles.selected : ''} ${isDragging ? styles.dragging : ''} ${isOfficial ? styles.official : ''}`}
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
          title={`${char.name} (${reminderCount} reminders) - Right-click for options${onChangeTeam && !isOfficial ? ' - Drag to change team' : ''}${isOfficial ? ' - Official character (cannot change team)' : ''}`}
        >
          {characterImageUrl ? (
            <div className={styles.thumbnail}>
              <img src={characterImageUrl} alt={char.name} className={styles.characterIcon} />
            </div>
          ) : (
            <div className={styles.thumbnail}>
              <div className={styles.iconPlaceholder}>?</div>
            </div>
          )}
          <div className={styles.info}>
            <div className={styles.name}>{char.name}</div>
          </div>
          {reminderCount > 0 && <div className={styles.badge}>{reminderCount}</div>}
          {isOfficial && <div className={styles.officialBadge} title="Official character">✦</div>}
        </button>
      </div>
    );
  };

  const renderMetaTokenItem = (token: Token, isLast: boolean) => {
    return (
      <div
        key={token.filename}
        className={`${styles.itemWrapper} ${!isLast ? styles.withDivider : ''}`}
      >
        <button
          type="button"
          className={`${styles.item} ${styles.teamMeta}`}
          title={token.name}
          onClick={() => onSelectMetaToken?.(token)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              onSelectMetaToken?.(token);
            }
          }}
        >
          <div className={styles.thumbnail}>
            <canvas
              width="40"
              height="40"
              ref={(canvas) => {
                if (canvas && token.canvas) {
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                    ctx.drawImage(token.canvas, 0, 0, 40, 40);
                  }
                }
              }}
            />
          </div>
          <div className={styles.info}>
            <div className={styles.name}>{token.name}</div>
          </div>
        </button>
      </div>
    );
  };

  // Check if all teams are collapsed
  const allCollapsed =
    TEAM_ORDER.every((team) => collapsedTeams.has(team)) && collapsedTeams.has('meta');

  const toggleAllCollapse = () => {
    if (allCollapsed) {
      // Expand all
      setCollapsedTeams(new Set());
    } else {
      // Collapse all
      const allTeams = new Set([...TEAM_ORDER.map((t) => t as string), 'meta']);
      setCollapsedTeams(allTeams);
    }
  };

  return (
    <aside className={styles.nav}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <h3>Characters</h3>
          <div className={styles.headerButtons}>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={toggleAllCollapse}
              title={allCollapsed ? 'Expand all' : 'Collapse all'}
            >
              {allCollapsed ? '▼' : '▲'}
            </button>
            {onAddOfficialCharacter && (
              <button
                type="button"
                className={styles.iconBtn}
                onClick={onAddOfficialCharacter}
                title="Add Official Characters"
              >
                &#x1F4DA;
              </button>
            )}
            <button
              type="button"
              className={styles.addBtn}
              onClick={onAddCharacter}
              title="Create Character"
            >
              +
            </button>
          </div>
        </div>
      </div>
      <div className={styles.list}>
        {TEAM_ORDER.map((team) => {
          const teamCharacters = charactersByTeam[team];
          const isCollapsed = collapsedTeams.has(team);
          const teamStyle = teamHeaderClassMap[team] || '';
          const isDropTarget = dropTargetTeam === team;

          return (
            <div key={team} className={styles.teamSection}>
              <button
                type="button"
                className={`${styles.teamHeader} ${teamStyle} ${isDropTarget ? styles.dropTarget : ''}`}
                onClick={() => toggleTeamCollapse(team)}
                onDragOver={(e) => handleDragOverTeam(e, team)}
                onDragLeave={handleDragLeaveTeam}
                onDrop={(e) => handleDropOnTeam(e, team)}
                aria-expanded={!isCollapsed}
              >
                <span className={styles.collapseIcon}>{isCollapsed ? '▶' : '▼'}</span>
                <span className={styles.teamName}>{TEAM_DISPLAY_NAMES[team]}</span>
                <span className={styles.teamCount}>{teamCharacters.length}</span>
              </button>
              {!isCollapsed && teamCharacters.length > 0 && (
                <div className={styles.teamCharacters}>
                  {teamCharacters.map((char, index) =>
                    renderCharacterItem(char, index === teamCharacters.length - 1)
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Meta tokens section - only visible when there are generated meta tokens */}
        {metaTokens.length > 0 && (
          <div className={styles.teamSection}>
            <button
              type="button"
              className={`${styles.teamHeader} ${styles.teamMeta}`}
              onClick={() => toggleTeamCollapse('meta')}
              aria-expanded={!collapsedTeams.has('meta')}
            >
              <span className={styles.collapseIcon}>{collapsedTeams.has('meta') ? '▶' : '▼'}</span>
              <span className={styles.teamName}>{TEAM_DISPLAY_NAMES.meta}</span>
              <span className={styles.teamCount}>{metaTokens.length}</span>
            </button>
            {!collapsedTeams.has('meta') && (
              <div className={styles.teamCharacters}>
                {metaTokens.map((token, index) =>
                  renderMetaTokenItem(token, index === metaTokens.length - 1)
                )}
              </div>
            )}
          </div>
        )}
      </div>

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
              // Prevent propagation for keyboard events as well
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
