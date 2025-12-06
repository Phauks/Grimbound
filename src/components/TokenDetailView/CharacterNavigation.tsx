import { useState, useRef, useEffect } from 'react'
import type { Token, Character, Team } from '../../ts/types/index.js'
import styles from '../../styles/components/tokenDetail/CharacterNavigation.module.css'

interface CharacterNavigationProps {
  characters: Character[]
  tokens: Token[]
  selectedCharacterId: string
  isMetaSelected?: boolean
  officialCharacterIds?: Set<string>
  onSelectCharacter: (characterId: string) => void
  onAddCharacter: () => void
  onDeleteCharacter: (characterId: string) => void
  onDuplicateCharacter: (characterId: string) => void
  onSelectMetaToken?: (token: Token) => void
  onSelectMeta?: () => void
  onChangeTeam?: (characterId: string, newTeam: Team) => void
  onHoverCharacter?: (characterId: string) => void
}

// Order teams for display
const TEAM_ORDER: Team[] = ['townsfolk', 'outsider', 'minion', 'demon', 'traveller', 'fabled', 'loric']

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
}

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
}

export function CharacterNavigation({
  characters,
  tokens,
  selectedCharacterId,
  isMetaSelected,
  officialCharacterIds,
  onSelectCharacter,
  onAddCharacter,
  onDeleteCharacter,
  onDuplicateCharacter,
  onSelectMetaToken,
  onSelectMeta,
  onChangeTeam,
  onHoverCharacter,
}: CharacterNavigationProps) {
  const selectedRef = useRef<HTMLDivElement>(null)
  // Meta section is always visible so we don't collapse it by default
  const [collapsedTeams, setCollapsedTeams] = useState<Set<string>>(
    () => new Set([...TEAM_ORDER.map(t => t as string)])
  )
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; characterId: string } | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ characterId: string; characterName: string } | null>(null)
  const [draggedCharId, setDraggedCharId] = useState<string | null>(null)
  const [dropTargetTeam, setDropTargetTeam] = useState<Team | null>(null)

  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [selectedCharacterId])

  // Close context menu on click outside
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null)
    if (contextMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [contextMenu])

  const handleContextMenu = (e: React.MouseEvent, characterId: string) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, characterId })
  }

  // Match by UUID only (UUID is required on all characters)
  const getCharacterToken = (char: Character) => {
    if (!char.uuid) return undefined
    return tokens.find((t) => t.type === 'character' && t.parentUuid === char.uuid)
  }

  // Match by UUID only (UUID is required on all characters)
  const getReminderCount = (char: Character) => {
    if (!char.uuid) return 0
    return tokens.filter((t) => t.type === 'reminder' && t.parentUuid === char.uuid).length
  }

  // Get meta tokens (not character or reminder)
  const metaTokens = tokens.filter((t) => t.type !== 'character' && t.type !== 'reminder')

  // Group characters by team
  const charactersByTeam = TEAM_ORDER.reduce((acc, team) => {
    acc[team] = characters.filter((char) => char.team === team)
    return acc
  }, {} as Record<Team, Character[]>)

  const toggleTeamCollapse = (team: string) => {
    setCollapsedTeams((prev) => {
      const next = new Set(prev)
      if (next.has(team)) {
        next.delete(team)
      } else {
        next.add(team)
      }
      return next
    })
  }

  const handleDragStart = (e: React.DragEvent, charId: string) => {
    setDraggedCharId(charId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', charId)
  }

  const handleDragEnd = () => {
    setDraggedCharId(null)
    setDropTargetTeam(null)
  }

  const handleDragOverTeam = (e: React.DragEvent, team: Team) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropTargetTeam(team)
  }

  const handleDragLeaveTeam = () => {
    setDropTargetTeam(null)
  }

  const handleDropOnTeam = (e: React.DragEvent, team: Team) => {
    e.preventDefault()
    if (draggedCharId && onChangeTeam) {
      onChangeTeam(draggedCharId, team)
    }
    setDraggedCharId(null)
    setDropTargetTeam(null)
  }

  const renderCharacterItem = (char: Character, isLast: boolean) => {
    const reminderCount = getReminderCount(char)
    const isSelected = char.id === selectedCharacterId
    const charToken = getCharacterToken(char)
    const teamClass = char.team?.toLowerCase() || 'townsfolk'
    const teamStyle = teamHeaderClassMap[teamClass] || ''
    const isDragging = draggedCharId === char.id
    const isOfficial = officialCharacterIds?.has(char.id) || false

    return (
      <div key={char.id} className={`${styles.itemWrapper} ${!isLast ? styles.withDivider : ''}`}>
        <div
          ref={isSelected ? selectedRef : null}
          className={`${styles.item} ${teamStyle} ${isSelected ? styles.selected : ''} ${isDragging ? styles.dragging : ''} ${isOfficial ? styles.official : ''}`}
          onClick={() => onSelectCharacter(char.id)}
          onMouseEnter={() => onHoverCharacter?.(char.id)}
          onContextMenu={(e) => handleContextMenu(e, char.id)}
          draggable={!!onChangeTeam}
          onDragStart={(e) => handleDragStart(e, char.id)}
          onDragEnd={handleDragEnd}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              onSelectCharacter(char.id)
            }
          }}
          title={`${char.name} (${reminderCount} reminders) - Right-click for options${onChangeTeam ? ' - Drag to change team' : ''}`}
        >
          {charToken && (
            <div className={styles.thumbnail}>
              <canvas
                width="40"
                height="40"
                ref={(canvas) => {
                  if (canvas && charToken.canvas) {
                    const ctx = canvas.getContext('2d')
                    if (ctx) {
                      ctx.drawImage(charToken.canvas, 0, 0, 40, 40)
                    }
                  }
                }}
              />
            </div>
          )}
          <div className={styles.info}>
            <div className={styles.name}>{char.name}</div>
          </div>
          {reminderCount > 0 && (
            <div className={styles.badge}>{reminderCount}</div>
          )}
        </div>
      </div>
    )
  }

  const renderMetaTokenItem = (token: Token, isLast: boolean) => {
    return (
      <div key={token.filename} className={`${styles.itemWrapper} ${!isLast ? styles.withDivider : ''}`}>
        <div
          className={`${styles.item} ${styles.teamMeta}`}
          role="button"
          tabIndex={0}
          title={token.name}
          onClick={() => onSelectMetaToken?.(token)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              onSelectMetaToken?.(token)
            }
          }}
        >
          <div className={styles.thumbnail}>
            <canvas
              width="40"
              height="40"
              ref={(canvas) => {
                if (canvas && token.canvas) {
                  const ctx = canvas.getContext('2d')
                  if (ctx) {
                    ctx.drawImage(token.canvas, 0, 0, 40, 40)
                  }
                }
              }}
            />
          </div>
          <div className={styles.info}>
            <div className={styles.name}>{token.name}</div>
          </div>
        </div>
      </div>
    )
  }

  // Check if all teams are collapsed
  const allCollapsed = TEAM_ORDER.every(team => collapsedTeams.has(team)) && collapsedTeams.has('meta')

  const toggleAllCollapse = () => {
    if (allCollapsed) {
      // Expand all
      setCollapsedTeams(new Set())
    } else {
      // Collapse all
      const allTeams = new Set([...TEAM_ORDER.map(t => t as string), 'meta'])
      setCollapsedTeams(allTeams)
    }
  }

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
              title={allCollapsed ? "Expand all" : "Collapse all"}
            >
              {allCollapsed ? '▼' : '▲'}
            </button>
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
          const teamCharacters = charactersByTeam[team]
          const isCollapsed = collapsedTeams.has(team)
          const teamStyle = teamHeaderClassMap[team] || ''
          const isDropTarget = dropTargetTeam === team

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
          )
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
              <span className={styles.teamName}>{TEAM_DISPLAY_NAMES['meta']}</span>
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
      {contextMenu && (
        <div
          className={styles.contextMenu}
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            type="button"
            onClick={() => {
              onDuplicateCharacter(contextMenu.characterId)
              setContextMenu(null)
            }}
          >
            📋 Duplicate
          </button>
          <button
            type="button"
            className={styles.danger}
            onClick={() => {
              const char = characters.find(c => c.id === contextMenu.characterId)
              setDeleteConfirm({ characterId: contextMenu.characterId, characterName: char?.name || 'this character' })
              setContextMenu(null)
            }}
          >
            🗑️ Delete
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className={styles.confirmOverlay} onClick={() => setDeleteConfirm(null)}>
          <div className={styles.confirmModal} onClick={e => e.stopPropagation()}>
            <h3>Delete Character?</h3>
            <p>Are you sure you want to delete "{deleteConfirm.characterName}"? This action cannot be undone.</p>
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
                  onDeleteCharacter(deleteConfirm.characterId)
                  setDeleteConfirm(null)
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
