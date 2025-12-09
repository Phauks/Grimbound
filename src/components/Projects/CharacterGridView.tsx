/**
 * Character Grid View Component
 *
 * Displays characters in a grid with token images and team badges.
 * Characters are grouped into collapsible categories by team.
 * Uses TokenCard-style styling for consistency with gallery view.
 * Loads images from character data or falls back to official character data.
 */

import { useState, useEffect, useRef, useMemo } from 'react'
import type { Character, Token, Team } from '../../ts/types/index.js'
import { useTokenContext } from '../../contexts/TokenContext'
import { TEAM_LABELS } from '../../ts/config.js'
import styles from '../../styles/components/projects/CharacterGridView.module.css'

interface CharacterGridViewProps {
  characters: Character[]
  tokens: Token[]
}

// Team sort order (standard Blood on the Clocktower order)
const TEAM_ORDER: Team[] = ['townsfolk', 'outsider', 'minion', 'demon', 'traveller', 'fabled', 'loric']

// Team display configuration (no emojis)
const TEAM_CONFIG: Record<Team, { label: string }> = {
  townsfolk: { label: 'Townsfolk' },
  outsider: { label: 'Outsiders' },
  minion: { label: 'Minions' },
  demon: { label: 'Demons' },
  traveller: { label: 'Travellers' },
  fabled: { label: 'Fabled' },
  loric: { label: 'Loric' },
  meta: { label: 'Meta' },
}

// Get team class name for consistent styling
const getTeamClassName = (team: string | undefined): string => {
  const teamLower = team?.toLowerCase() || 'townsfolk'
  switch (teamLower) {
    case 'townsfolk': return styles.teamTownsfolk
    case 'outsider': return styles.teamOutsider
    case 'minion': return styles.teamMinion
    case 'demon': return styles.teamDemon
    case 'traveller':
    case 'traveler': return styles.teamTraveller
    case 'fabled': return styles.teamFabled
    case 'loric': return styles.teamLoric
    default: return styles.teamTownsfolk
  }
}

export function CharacterGridView({ characters, tokens }: CharacterGridViewProps) {
  const { officialData } = useTokenContext()
  const [imageDataUrls, setImageDataUrls] = useState<Map<string, string>>(new Map())
  const [collapsedCategories, setCollapsedCategories] = useState<Set<Team>>(new Set())
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Build a map of official character IDs for quick lookup
  const officialCharIds = useMemo(() => {
    const ids = new Set<string>()
    for (const char of officialData) {
      if (char.id) {
        ids.add(char.id.toLowerCase())
      }
    }
    return ids
  }, [officialData])

  // Build a map of official character data for image lookup
  const officialCharMap = useMemo(() => {
    const map = new Map<string, Character>()
    for (const char of officialData) {
      if (char.id) {
        map.set(char.id.toLowerCase(), char)
      }
    }
    return map
  }, [officialData])

  // Check if a character is official
  const isCharacterOfficial = (char: Character): boolean => {
    return officialCharIds.has(char.id.toLowerCase())
  }

  // Group characters by team
  const charactersByTeam = useMemo(() => {
    const groups = new Map<Team, Character[]>()
    
    // Initialize all teams in order
    for (const team of TEAM_ORDER) {
      groups.set(team, [])
    }
    
    // Group characters
    for (const char of characters) {
      const teamRaw = char.team?.toLowerCase() || 'townsfolk'
      // Normalize 'traveler' to 'traveller'
      const normalizedTeam = teamRaw === 'traveler' ? 'traveller' : teamRaw
      const validTeam = TEAM_ORDER.includes(normalizedTeam as Team) ? (normalizedTeam as Team) : 'townsfolk'
      
      const existing = groups.get(validTeam) || []
      existing.push(char)
      groups.set(validTeam, existing)
    }
    
    // Remove empty teams
    for (const [team, chars] of groups) {
      if (chars.length === 0) {
        groups.delete(team)
      }
    }
    
    return groups
  }, [characters])

  // Get character's image URL (from character.image property or official data)
  const getCharacterImageUrl = (char: Character): string | undefined => {
    // First try the character's own image property
    if (char.image) {
      if (Array.isArray(char.image)) {
        if (char.image[0]) return char.image[0]
      } else {
        return char.image
      }
    }
    
    // Fall back to official character data from context
    const officialChar = officialCharMap.get(char.id.toLowerCase())
    if (officialChar?.image) {
      if (Array.isArray(officialChar.image)) {
        return officialChar.image[0] || undefined
      }
      return officialChar.image
    }
    
    return undefined
  }

  // Get character token by UUID
  const getCharacterToken = (char: Character): Token | undefined => {
    if (!char.uuid) return undefined
    return tokens.find((t) => t.type === 'character' && t.parentUuid === char.uuid)
  }

  // Get all character token variants by UUID
  const getCharacterTokenVariants = (char: Character): Token[] => {
    if (!char.uuid) return []
    return tokens.filter((t) => t.type === 'character' && t.parentUuid === char.uuid)
  }

  // State to track active variant index per character
  const [activeVariants, setActiveVariants] = useState<Map<string, number>>(new Map())

  const getActiveVariantIndex = (charUuid: string): number => {
    return activeVariants.get(charUuid) || 0
  }

  const handlePrevVariant = (charUuid: string, totalVariants: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setActiveVariants(prev => {
      const next = new Map(prev)
      const current = next.get(charUuid) || 0
      next.set(charUuid, (current - 1 + totalVariants) % totalVariants)
      return next
    })
  }

  const handleNextVariant = (charUuid: string, totalVariants: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setActiveVariants(prev => {
      const next = new Map(prev)
      const current = next.get(charUuid) || 0
      next.set(charUuid, (current + 1) % totalVariants)
      return next
    })
  }

  // Convert canvas to data URL with lazy loading
  useEffect(() => {
    const loadImagesForCharacter = async (char: Character) => {
      const variants = getCharacterTokenVariants(char)
      if (variants.length === 0 || !char.uuid) return

      for (const token of variants) {
        if (!token?.canvas || !token.filename) continue
        // Skip if already loaded
        if (imageDataUrls.has(token.filename)) continue

        try {
          const dataUrl = token.canvas.toDataURL('image/png')
          setImageDataUrls(prev => {
            const next = new Map(prev)
            next.set(token.filename, dataUrl)
            return next
          })
        } catch (error) {
          console.error('Failed to generate data URL for token:', token.name, error)
        }
      }
    }

    // Set up intersection observer for lazy loading
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const characterId = entry.target.getAttribute('data-character-id')
            const char = characters.find(c => c.uuid === characterId)
            if (char) {
              loadImagesForCharacter(char)
              observerRef.current?.unobserve(entry.target)
            }
          }
        })
      },
      { rootMargin: '200px' }
    )

    return () => {
      observerRef.current?.disconnect()
    }
  }, [characters, tokens])

  const toggleCategory = (team: Team) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev)
      if (next.has(team)) {
        next.delete(team)
      } else {
        next.add(team)
      }
      return next
    })
  }

  const renderCharacterCard = (char: Character) => {
    const variants = getCharacterTokenVariants(char)
    const hasVariants = variants.length > 1
    const activeIndex = char.uuid ? getActiveVariantIndex(char.uuid) : 0
    const displayToken = hasVariants ? variants[activeIndex] || variants[0] : variants[0]
    const dataUrl = displayToken?.filename ? imageDataUrls.get(displayToken.filename) : undefined
    const characterImageUrl = getCharacterImageUrl(char)
    const teamClassName = getTeamClassName(char.team)
    const isOfficial = isCharacterOfficial(char)
    const reminderCount = char.uuid
      ? tokens.filter((t) => t.type === 'reminder' && t.parentUuid === char.uuid).length
      : 0

    return (
      <div
        key={char.uuid || char.id}
        className={styles.card}
        data-character-id={char.uuid}
        ref={(el) => {
          if (el && observerRef.current && !dataUrl) {
            observerRef.current.observe(el)
          }
        }}
      >
        <div className={styles.canvasContainer}>
          {dataUrl ? (
            <img src={dataUrl} alt={char.name} className={styles.canvas} />
          ) : characterImageUrl ? (
            <img src={characterImageUrl} alt={char.name} className={styles.characterImage} />
          ) : displayToken ? (
            <div className={styles.skeleton} />
          ) : (
            <div className={styles.imagePlaceholder}>
              <span>❓</span>
            </div>
          )}
        </div>
        <div className={styles.footer}>
          <div className={styles.info}>
            <div className={styles.name}>{char.name || char.id}</div>
            <div className={styles.metadata}>
              <span className={`${styles.team} ${teamClassName}`}>
                {TEAM_LABELS[(char.team?.toLowerCase() || 'townsfolk') as Team] || char.team}
              </span>
              {isOfficial && (
                <span className={styles.official}>Official</span>
              )}
              {reminderCount > 0 && (
                <span className={styles.reminderBadge} title="Reminders">
                  🔔{reminderCount}
                </span>
              )}
            </div>
          </div>
        </div>
        {/* Variant navigation */}
        {hasVariants && char.uuid && (
          <div className={styles.variantNav}>
            <button 
              className={styles.variantButton} 
              onClick={(e) => handlePrevVariant(char.uuid!, variants.length, e)}
              aria-label="Previous variant"
              title="Previous variant"
            >
              ◀
            </button>
            <span className={styles.variantIndicator}>
              v{activeIndex + 1}/{variants.length}
            </span>
            <button 
              className={styles.variantButton} 
              onClick={(e) => handleNextVariant(char.uuid!, variants.length, e)}
              aria-label="Next variant"
              title="Next variant"
            >
              ▶
            </button>
          </div>
        )}
      </div>
    )
  }

  if (characters.length === 0) {
    return (
      <div className={styles.emptyState}>
        <span className={styles.emptyIcon}>📭</span>
        <p>No characters in this project yet.</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h3 className={styles.title}>
          📚 CHARACTERS ({characters.length})
        </h3>
      </div>

      {/* Collapsible categories */}
      <div className={styles.categories}>
        {TEAM_ORDER.map((team) => {
          const teamChars = charactersByTeam.get(team)
          if (!teamChars || teamChars.length === 0) return null
          
          const isCollapsed = collapsedCategories.has(team)
          const config = TEAM_CONFIG[team]
          const teamClassName = getTeamClassName(team)
          
          return (
            <div key={team} className={`${styles.category} ${teamClassName}`}>
              <button
                type="button"
                className={styles.categoryHeader}
                onClick={() => toggleCategory(team)}
                aria-expanded={!isCollapsed}
              >
                <span className={styles.categoryIcon}>
                  {isCollapsed ? '▶' : '▼'}
                </span>
                <span className={styles.categoryName}>{config.label}</span>
                <span className={styles.categoryCount}>({teamChars.length})</span>
              </button>
              
              {!isCollapsed && (
                <div className={styles.categoryContent}>
                  <div className={styles.grid}>
                    {teamChars.map((char) => renderCharacterCard(char))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
