/**
 * Character List View
 *
 * Alternative display mode showing characters in a compact table format:
 * [Icon | Name | Ability]
 *
 * Grouped by team with colored headers that can be collapsed.
 * Shows the raw character icon (not the rendered token).
 * Designed for quick scanning of script contents.
 */

import { useMemo, useState, useCallback } from 'react'
import { TEAM_COLORS, TEAM_LABELS } from '../../../ts/config.js'
import { useCharacterImageResolver } from '../../../hooks/useCharacterImageResolver.js'
import type { Token, Team, Character } from '../../../ts/types/index.js'
import styles from '../../../styles/components/projects/CharacterListView.module.css'

interface CharacterListViewProps {
  /** Characters to display directly (preferred - instant loading) */
  characters?: Character[]
  /** Tokens to display - extracts character data (fallback for backward compatibility) */
  tokens?: Token[]
  /** Whether to show the ability text column */
  showAbility?: boolean
  /** Whether to show the first night reminder column */
  showFirstNightReminder?: boolean
  /** Whether to show the other night reminder column */
  showOtherNightReminder?: boolean
  /** Whether to show the reminders column */
  showReminders?: boolean
}

interface CharacterRow {
  uuid: string
  id: string
  name: string
  team: Team
  ability: string
  order: number
  firstNightReminder?: string
  otherNightReminder?: string
  reminders?: string[]
  isOfficial: boolean
}

// Team order for grouping
const TEAM_ORDER: Team[] = ['townsfolk', 'outsider', 'minion', 'demon', 'traveller', 'fabled', 'loric']

export function CharacterListView({
  characters: charactersProp,
  tokens,
  showAbility = true,
  showFirstNightReminder = false,
  showOtherNightReminder = false,
  showReminders = false,
}: CharacterListViewProps) {
  // Track which team sections are collapsed
  const [collapsedTeams, setCollapsedTeams] = useState<Set<Team>>(new Set())

  // Get characters - either directly from prop or extracted from tokens
  const characters = useMemo(() => {
    // Prefer direct characters prop (instant loading)
    if (charactersProp && charactersProp.length > 0) {
      return charactersProp
    }

    // Fallback: extract from tokens (backward compatibility)
    if (!tokens) return []

    const characterTokens = tokens.filter(t => t.type === 'character')
    const seenIds = new Set<string>()
    const chars: Character[] = []

    for (const token of characterTokens) {
      const character = token.characterData
      if (!character) continue

      // Skip duplicates (from variants)
      if (seenIds.has(character.id)) continue
      seenIds.add(character.id)

      chars.push(character)
    }

    return chars
  }, [charactersProp, tokens])

  // Use the shared hook for async image resolution
  const { resolvedUrls, isLoading } = useCharacterImageResolver({ characters })

  // Group characters by team
  const groupedCharacters = useMemo(() => {
    // Create unique character rows
    const seenIds = new Set<string>()
    const characterRows: CharacterRow[] = []

    characters.forEach((character, index) => {
      // Skip duplicates (from variants)
      const uniqueKey = character.id
      if (seenIds.has(uniqueKey)) return
      seenIds.add(uniqueKey)

      characterRows.push({
        uuid: character.uuid || character.id,
        id: character.id,
        name: character.name,
        team: character.team as Team,
        ability: character.ability || '',
        order: index,
        firstNightReminder: character.firstNightReminder,
        otherNightReminder: character.otherNightReminder,
        reminders: character.reminders,
        isOfficial: character.source === 'official',
      })
    })

    // Group by team
    const grouped = new Map<Team, CharacterRow[]>()

    for (const team of TEAM_ORDER) {
      const teamCharacters = characterRows
        .filter(c => c.team === team)
        .sort((a, b) => a.order - b.order)

      if (teamCharacters.length > 0) {
        grouped.set(team, teamCharacters)
      }
    }

    return grouped
  }, [characters])

  const toggleTeamCollapse = useCallback((team: Team) => {
    setCollapsedTeams(prev => {
      const next = new Set(prev)
      if (next.has(team)) {
        next.delete(team)
      } else {
        next.add(team)
      }
      return next
    })
  }, [])

  const isTeamCollapsed = (team: Team) => collapsedTeams.has(team)

  // Check if there are any characters to display
  const totalCharacters = Array.from(groupedCharacters.values()).reduce(
    (sum, chars) => sum + chars.length,
    0
  )

  if (totalCharacters === 0) {
    return (
      <div className={styles.emptyState}>
        <p>No characters to display</p>
      </div>
    )
  }

  // Check if any additional info is being shown
  const hasAdditionalInfo = showAbility || showFirstNightReminder || showOtherNightReminder || showReminders

  return (
    <div className={styles.container}>
      {Array.from(groupedCharacters.entries()).map(([team, characters]) => (
        <div key={team} className={styles.teamSection}>
          <button
            type="button"
            className={styles.teamHeader}
            style={{ backgroundColor: TEAM_COLORS[team] }}
            onClick={() => toggleTeamCollapse(team)}
            aria-expanded={!isTeamCollapsed(team)}
          >
            <span className={styles.collapseIcon}>
              {isTeamCollapsed(team) ? '▶' : '▼'}
            </span>
            <span className={styles.teamName}>{TEAM_LABELS[team]}</span>
            <span className={styles.teamCount}>{characters.length}</span>
          </button>

          {!isTeamCollapsed(team) && (
            <div className={styles.characterList}>
              {characters.map(character => {
                const iconUrl = resolvedUrls.get(character.uuid)
                const hasContent = (showAbility && character.ability) ||
                                   (showFirstNightReminder && character.firstNightReminder) ||
                                   (showOtherNightReminder && character.otherNightReminder) ||
                                   (showReminders && character.reminders && character.reminders.length > 0)

                return (
                  <div
                    key={character.id}
                    className={styles.characterRow}
                  >
                    {/* Left side: Icon + Name + Official badge */}
                    <div className={styles.characterLeft}>
                      <div className={styles.characterIcon}>
                        {iconUrl ? (
                          <img
                            src={iconUrl}
                            alt={character.name}
                            className={styles.iconImage}
                          />
                        ) : (
                          <div
                            className={styles.iconPlaceholder}
                            style={{ backgroundColor: TEAM_COLORS[character.team] }}
                          >
                            {isLoading ? '...' : character.name.charAt(0)}
                          </div>
                        )}
                      </div>

                      <div className={styles.characterNameCell}>
                        <span className={styles.characterName}>
                          {character.name}
                        </span>
                        {character.isOfficial && (
                          <span className={styles.officialBadge}>Official</span>
                        )}
                      </div>
                    </div>

                    {/* Right side: Additional info rows */}
                    {hasAdditionalInfo && (
                      <div className={styles.characterRight}>
                        {/* Ability text row */}
                        {showAbility && character.ability && (
                          <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>Ability:</span>
                            <span className={styles.infoText}>{character.ability}</span>
                          </div>
                        )}

                        {/* First Night Reminder row */}
                        {showFirstNightReminder && character.firstNightReminder && (
                          <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>First Night:</span>
                            <span className={styles.infoText}>{character.firstNightReminder}</span>
                          </div>
                        )}

                        {/* Other Night Reminder row */}
                        {showOtherNightReminder && character.otherNightReminder && (
                          <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>Other Nights:</span>
                            <span className={styles.infoText}>{character.otherNightReminder}</span>
                          </div>
                        )}

                        {/* Reminders row */}
                        {showReminders && character.reminders && character.reminders.length > 0 && (
                          <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>Reminders:</span>
                            <div className={styles.reminderTagsContainer}>
                              {character.reminders.map((reminder, idx) => (
                                <span key={idx} className={styles.reminderTag}>{reminder}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Show placeholder if no content for this character */}
                        {!hasContent && <div className={styles.noContent}>—</div>}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
