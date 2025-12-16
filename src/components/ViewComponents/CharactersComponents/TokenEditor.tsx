import { useState, useEffect, useRef, useCallback, useMemo, type RefCallback } from 'react'
import { JsonEditorPanel } from '../../Shared/Json/JsonEditorPanel'
import { AssetPreviewSelector } from '../../Shared/Selectors/AssetPreviewSelector'
import type { Character, DecorativeOverrides } from '../../../ts/types/index.js'
import { generateRandomName, nameToId } from '../../../ts/utils/nameGenerator'
import { analyzeReminderText, normalizeReminderText, type FormatIssue } from '../../../ts/utils/textFormatAnalyzer'
import { useTokenContext } from '../../../contexts/TokenContext'
import { dataSyncService } from '../../../ts/sync/index.js'
import styles from '../../../styles/components/characterEditor/TokenEditor.module.css'
import viewStyles from '../../../styles/components/views/Views.module.css'

interface TokenEditorProps {
  character: Character
  onEditChange: (field: keyof Character, value: any) => void
  onReplaceCharacter?: (character: Character) => void
  onRefreshPreview?: () => void
  onPreviewVariant?: (imageUrl: string | undefined) => void  // Called when user wants to preview a specific variant
  isOfficial?: boolean
}

// Map team names to CSS Module class names
const teamSelectClassMap: Record<string, string> = {
  townsfolk: styles.teamTownsfolk,
  outsider: styles.teamOutsider,
  minion: styles.teamMinion,
  demon: styles.teamDemon,
  traveller: styles.teamTraveller,
  traveler: styles.teamTraveller,
  fabled: styles.teamFabled,
  loric: styles.teamLoric,
}

export function TokenEditor({ character, onEditChange, onReplaceCharacter, onRefreshPreview, onPreviewVariant, isOfficial = false }: TokenEditorProps) {
  // Access metadata store from context
  const { getMetadata, setMetadata, generationOptions } = useTokenContext()
  const charUuid = character.uuid || ''
  const metadata = getMetadata(charUuid)
  const decoratives = metadata.decoratives || {}

  const [activeTab, setActiveTab] = useState<'info' | 'almanac' | 'decoratives' | 'json'>('info')
  const [jsonSubTab, setJsonSubTab] = useState<'character' | 'metadata'>('character')
  const [reminders, setReminders] = useState<string[]>(character.reminders || [])
  const [newReminder, setNewReminder] = useState('')
  const [previewVariantIndex, setPreviewVariantIndex] = useState<number | null>(null)  // null = default (first image)
  
  // Local state for text inputs to prevent lag
  const [localName, setLocalName] = useState(character.name || '')
  const [localAbility, setLocalAbility] = useState(character.ability || '')
  const [localFlavor, setLocalFlavor] = useState(character.flavor || '')
  const [localOverview, setLocalOverview] = useState(character.overview || '')
  const [localExamples, setLocalExamples] = useState(character.examples || '')
  const [localHowToRun, setLocalHowToRun] = useState(character.howToRun || '')
  const [localTips, setLocalTips] = useState(character.tips || '')
  const [localFirstNightReminder, setLocalFirstNightReminder] = useState(character.firstNightReminder || '')
  const [localOtherNightReminder, setLocalOtherNightReminder] = useState(character.otherNightReminder || '')
  const [localFirstNight, setLocalFirstNight] = useState(character.firstNight ?? 0)
  const [localOtherNight, setLocalOtherNight] = useState(character.otherNight ?? 0)

  // Format issue tracking for night reminder fields
  const [firstNightFormatIssues, setFirstNightFormatIssues] = useState<FormatIssue[]>([])
  const [otherNightFormatIssues, setOtherNightFormatIssues] = useState<FormatIssue[]>([])
  const [localImages, setLocalImages] = useState<string[]>(
    Array.isArray(character.image) ? character.image : [character.image || '']
  )

  // Resolved image URLs for preview (handles official character images from Cache API)
  const [resolvedImageUrls, setResolvedImageUrls] = useState<(string | null)[]>([])

  // Local state for ID linking (immediate UI feedback)
  // Use metadata store for persistence, default to true (linked)
  const [isIdLinked, setIsIdLinked] = useState(metadata.idLinkedToName)
  
  // Local state for unlinked ID (only used when not linked)
  const [localId, setLocalId] = useState(character.id || '')
  
  // Helper to strip internal fields for display/export
  const getExportableCharacter = (char: Character): Omit<Character, 'uuid' | 'source'> => {
    const { uuid, source, ...exportable } = char
    return exportable
  }
  
  // JSON editing state (strip internal fields from display)
  const [jsonText, setJsonText] = useState(() => JSON.stringify(getExportableCharacter(character), null, 2))
  const [jsonError, setJsonError] = useState<string | null>(null)
  
  // Drag and drop state for image URLs
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null)
  const [dragOverImageIndex, setDragOverImageIndex] = useState<number | null>(null)
  
  // Drag and drop state for reminders
  const [draggedReminderIndex, setDraggedReminderIndex] = useState<number | null>(null)
  const [dragOverReminderIndex, setDragOverReminderIndex] = useState<number | null>(null)

  // Auto-resize textareas - track all registered textareas
  const textareaRefs = useRef<Set<HTMLTextAreaElement>>(new Set())

  // Utility function to resize a single textarea to fit its content
  const resizeTextarea = useCallback((textarea: HTMLTextAreaElement | null) => {
    if (!textarea) return
    // Reset height to auto to get accurate scrollHeight
    textarea.style.height = 'auto'
    // Set height to scrollHeight (minimum 60px via CSS)
    textarea.style.height = `${textarea.scrollHeight}px`
  }, [])

  // Callback ref to register textareas for auto-resize
  const registerTextareaRef: RefCallback<HTMLTextAreaElement> = useCallback((element) => {
    if (element) {
      textareaRefs.current.add(element)
      // Initial resize with requestAnimationFrame to ensure styles are computed
      requestAnimationFrame(() => resizeTextarea(element))
    }
  }, [resizeTextarea])

  // Resize all textareas when character changes
  useEffect(() => {
    // Use requestAnimationFrame to ensure DOM has updated
    requestAnimationFrame(() => {
      textareaRefs.current.forEach((textarea) => {
        resizeTextarea(textarea)
      })
    })
  }, [character.uuid, localAbility, localFlavor, localOverview, localExamples, localHowToRun, localTips, localFirstNightReminder, localOtherNightReminder, resizeTextarea])

  // Handler for textarea input that also auto-resizes
  const handleTextareaInput = useCallback((e: React.FormEvent<HTMLTextAreaElement>) => {
    resizeTextarea(e.currentTarget)
  }, [resizeTextarea])

  // Debounce timer refs
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const jsonDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Track if user is actively editing JSON to prevent overwrites
  const isEditingJsonRef = useRef(false)
  
  // Sync local state when switching to a different character (use uuid as stable identifier)
  useEffect(() => {
    setLocalName(character.name || '')
    setLocalId(character.id || '')
    setLocalAbility(character.ability || '')
    setLocalFlavor(character.flavor || '')
    setLocalOverview(character.overview || '')
    setLocalExamples(character.examples || '')
    setLocalHowToRun(character.howToRun || '')
    setLocalTips(character.tips || '')
    setLocalFirstNightReminder(character.firstNightReminder || '')
    setLocalOtherNightReminder(character.otherNightReminder || '')
    setLocalFirstNight(character.firstNight ?? 0)
    setLocalOtherNight(character.otherNight ?? 0)
    setLocalImages(Array.isArray(character.image) ? character.image : [character.image || ''])
    setIsIdLinked(metadata.idLinkedToName)
    setPreviewVariantIndex(null) // Reset variant preview when switching characters
  }, [character.uuid, metadata.idLinkedToName])
  
  // Update reminders when character changes
  useEffect(() => {
    setReminders(character.reminders || [])
  }, [character.id, character.reminders])
  
  // Update JSON text when character changes (but not while user is editing)
  useEffect(() => {
    if (!isEditingJsonRef.current) {
      setJsonText(JSON.stringify(getExportableCharacter(character), null, 2))
      setJsonError(null)
    }
  }, [character])

  // Analyze night reminder format issues when text changes
  useEffect(() => {
    setFirstNightFormatIssues(analyzeReminderText(localFirstNightReminder))
  }, [localFirstNightReminder])

  useEffect(() => {
    setOtherNightFormatIssues(analyzeReminderText(localOtherNightReminder))
  }, [localOtherNightReminder])

  // Auto-detect setup text [in brackets] and enable setup flag
  useEffect(() => {
    if (isOfficial) return

    const hasSetupText = /\[.*?\]/.test(localAbility)
    if (hasSetupText && !character.setup) {
      onEditChange('setup', true)
    }
    // Note: Do NOT auto-disable when brackets are removed
  }, [localAbility, character.setup, isOfficial, onEditChange])

  // Handler to fix format issues in first night reminder
  const handleFixFirstNightFormat = useCallback(() => {
    if (isOfficial) return
    const normalized = normalizeReminderText(localFirstNightReminder)
    setLocalFirstNightReminder(normalized)
    onEditChange('firstNightReminder', normalized)
  }, [localFirstNightReminder, onEditChange, isOfficial])

  // Handler to fix format issues in other night reminder
  const handleFixOtherNightFormat = useCallback(() => {
    if (isOfficial) return
    const normalized = normalizeReminderText(localOtherNightReminder)
    setLocalOtherNightReminder(normalized)
    onEditChange('otherNightReminder', normalized)
  }, [localOtherNightReminder, onEditChange, isOfficial])

  // Resolve official character image URLs from Cache API
  useEffect(() => {
    let isMounted = true
    const objectUrls: string[] = []

    const resolveImages = async () => {
      const resolved = await Promise.all(
        localImages.map(async (url) => {
          if (!url || !url.trim()) return null

          // If it's a full URL (http/https), use it directly
          if (url.startsWith('http://') || url.startsWith('https://')) {
            return url
          }

          // If it's an asset reference (asset:), use it directly (will be resolved by assetResolver)
          if (url.startsWith('asset:')) {
            return url
          }

          // Try to extract character ID and resolve from sync storage
          // Handle formats: "washerwoman", "Icon_washerwoman.png", "icons/washerwoman.webp"
          const extractCharacterId = (path: string): string | null => {
            const segments = path.split('/')
            const filename = segments[segments.length - 1]
            const match = filename.match(/^(?:Icon_)?([a-z_]+)(?:\.(?:webp|png|jpg|jpeg|gif))?$/i)
            return match ? match[1].toLowerCase() : null
          }

          const characterId = extractCharacterId(url)
          if (characterId) {
            try {
              const blob = await dataSyncService.getCharacterImage(characterId)
              if (blob) {
                const objectUrl = URL.createObjectURL(blob)
                objectUrls.push(objectUrl)
                return objectUrl
              }
            } catch (error) {
              console.warn(`Failed to resolve official character image: ${characterId}`, error)
            }
          }

          // Fallback: return original URL (may fail to load, but will show error state)
          return url
        })
      )

      if (isMounted) {
        setResolvedImageUrls(resolved)
      }
    }

    resolveImages()

    // Cleanup: revoke object URLs when component unmounts or URLs change
    return () => {
      isMounted = false
      objectUrls.forEach(url => URL.revokeObjectURL(url))
    }
  }, [localImages])

  // Debounced field update helper
  const debouncedUpdate = useCallback((field: keyof Character, value: any, delay = 500) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = setTimeout(() => {
      onEditChange(field, value)
    }, delay)
  }, [onEditChange])
  
  // Cleanup debounce timers
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      if (jsonDebounceTimerRef.current) {
        clearTimeout(jsonDebounceTimerRef.current)
      }
    }
  }, [])

  
  // Handle JSON text changes with debounced parsing
  const handleJsonChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value
    setJsonText(newText)
    isEditingJsonRef.current = true

    // Clear any existing timer
    if (jsonDebounceTimerRef.current) {
      clearTimeout(jsonDebounceTimerRef.current)
    }

    // Debounce the parsing and applying
    jsonDebounceTimerRef.current = setTimeout(() => {
      try {
        const parsed = JSON.parse(newText)
        setJsonError(null)
        // Replace entire character at once (preserve uuid for tracking)
        if (onReplaceCharacter) {
          onReplaceCharacter({ ...parsed, uuid: character.uuid })
        } else {
          // Fallback: apply field by field
          Object.keys(parsed).forEach(key => {
            onEditChange(key as keyof Character, parsed[key])
          })
        }
        // After applying, allow sync again (with small delay to let state settle)
        setTimeout(() => {
          isEditingJsonRef.current = false
        }, 100)
      } catch (err) {
        setJsonError(err instanceof Error ? err.message : 'Invalid JSON')
      }
    }, 500)
  }, [character.uuid, onReplaceCharacter, onEditChange])
  
  // Handle JSON blur - apply changes immediately and stop editing mode
  const handleJsonBlur = useCallback(() => {
    // Clear debounce timer
    if (jsonDebounceTimerRef.current) {
      clearTimeout(jsonDebounceTimerRef.current)
    }

    try {
      const parsed = JSON.parse(jsonText)
      setJsonError(null)
      // Replace entire character at once (preserve uuid for tracking)
      if (onReplaceCharacter) {
        onReplaceCharacter({ ...parsed, uuid: character.uuid })
      } else {
        Object.keys(parsed).forEach(key => {
          onEditChange(key as keyof Character, parsed[key])
        })
      }
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : 'Invalid JSON')
    }

    // Allow syncing again
    isEditingJsonRef.current = false
  }, [jsonText, character.uuid, onReplaceCharacter, onEditChange])
  
  // Format JSON
  const handleFormatJson = useCallback(() => {
    try {
      const parsed = JSON.parse(jsonText)
      setJsonText(JSON.stringify(parsed, null, 2))
      setJsonError(null)
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : 'Cannot format: Invalid JSON')
    }
  }, [jsonText])
  
  // Handle image URL update with optional refresh
  const handleImageUpdate = useCallback((index: number, value: string) => {
    setLocalImages((prev) => {
      const newImages = [...prev]
      newImages[index] = value
      debouncedUpdate('image', newImages.length === 1 ? newImages[0] : newImages, 800)
      return newImages
    })
  }, [debouncedUpdate])
  
  const handleRefreshImages = () => {
    // Immediately apply current local images and trigger refresh
    const images = localImages.length === 1 ? localImages[0] : localImages
    onEditChange('image', images)
    if (onRefreshPreview) {
      setTimeout(() => onRefreshPreview(), 50)
    }
  }
  
  const updateDecoratives = (updates: Partial<DecorativeOverrides>) => {
    if (charUuid) {
      setMetadata(charUuid, { decoratives: { ...decoratives, ...updates } })
    }
  }

  const handleAddReminder = () => {
    if (newReminder.trim()) {
      const updated = [...reminders, newReminder]
      setReminders(updated)
      onEditChange('reminders', updated)
      setNewReminder('')
    }
  }

  const handleRemoveReminder = (index: number) => {
    const updated = reminders.filter((_, i) => i !== index)
    setReminders(updated)
    onEditChange('reminders', updated)
  }

  // Group reminders by text for display (e.g., ["hello", "hello", "world"] -> [{text: "hello", count: 2}, {text: "world", count: 1}])
  interface GroupedReminder {
    text: string
    count: number
  }
  
  const groupedReminders = useMemo((): GroupedReminder[] => {
    const groups = new Map<string, number>()
    for (const reminder of reminders) {
      groups.set(reminder, (groups.get(reminder) || 0) + 1)
    }
    return Array.from(groups.entries()).map(([text, count]) => ({ text, count }))
  }, [reminders])

  // Update reminder text (changes all instances of that text to keep group intact)
  const handleReminderTextChange = useCallback((oldText: string, newText: string) => {
    setReminders((prev) => {
      const updated = prev.map(r => r === oldText ? newText : r)
      onEditChange('reminders', updated)
      return updated
    })
  }, [onEditChange])

  // Update reminder count (expands or contracts the array)
  const handleReminderCountChange = useCallback((text: string, newCount: number) => {
    setReminders((prev) => {
      // Clamp count between 1 and 20
      const clampedCount = Math.max(1, Math.min(20, newCount))
      const currentCount = prev.filter(r => r === text).length

      if (clampedCount === currentCount) return prev

      let updated: string[]
      if (clampedCount > currentCount) {
        // Add more instances
        const toAdd = clampedCount - currentCount
        updated = [...prev, ...Array(toAdd).fill(text)]
      } else {
        // Remove instances (remove from the end)
        let removeCount = currentCount - clampedCount
        updated = []
        // Iterate backwards to remove from end first
        const reversedReminders = [...prev].reverse()
        for (const r of reversedReminders) {
          if (r === text && removeCount > 0) {
            removeCount--
          } else {
            updated.unshift(r)
          }
        }
      }
      onEditChange('reminders', updated)
      return updated
    })
  }, [onEditChange])

  // Remove all instances of a reminder
  const handleRemoveGroupedReminder = useCallback((text: string) => {
    setReminders((prev) => {
      const updated = prev.filter(r => r !== text)
      onEditChange('reminders', updated)
      return updated
    })
  }, [onEditChange])

  // Convert official character to custom by changing source field
  // This allows the user to keep the original ID while treating it as a custom character
  const handleConvertToCustom = () => {
    onEditChange('source', 'custom')
  }

  return (
    <div className={styles.editor}>
      <div className={styles.tabsContainer}>
        <div className={styles.tabsNav}>
          <button
            className={`${styles.tabButton} ${activeTab === 'info' ? styles.active : ''}`}
            onClick={() => setActiveTab('info')}
          >
            Gameplay
          </button>
          <button
            className={`${styles.tabButton} ${activeTab === 'almanac' ? styles.active : ''}`}
            onClick={() => setActiveTab('almanac')}
          >
            Almanac
          </button>
          <button
            className={`${styles.tabButton} ${activeTab === 'decoratives' ? styles.active : ''}`}
            onClick={() => setActiveTab('decoratives')}
          >
            Decoratives
          </button>
          <button
            className={`${styles.tabButton} ${activeTab === 'json' ? styles.active : ''}`}
            onClick={() => setActiveTab('json')}
          >
            JSON
          </button>
        </div>

        {isOfficial && (
          <div
            className={styles.officialBanner}
            title="This is an official character. Editing is disabled to preserve the original data."
          >
            <div className={styles.officialLeft}>
              <span className={styles.officialBadge}>Official</span>
              <a
                href={`https://wiki.bloodontheclocktower.com/${encodeURIComponent(character.name)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.wikiLink}
                title="View on Wiki"
              >
                <svg className={styles.wikiIcon} viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
              </a>
            </div>
            <div className={styles.officialActions}>
              <button
                type="button"
                className={styles.convertButton}
                onClick={handleConvertToCustom}
                title="Create a custom copy that can be edited"
              >
                Convert to Custom
              </button>
            </div>
          </div>
        )}

        {activeTab === 'info' && (
          <div className={`${styles.tabContent} ${isOfficial ? styles.disabled : ''}`}>
            <div className={styles.formGroup}>
              <div className={styles.labelWithAction}>
                <label htmlFor="edit-id">Character ID</label>
                <button
                  type="button"
                  className={`${styles.iconButton} ${isIdLinked ? styles.linked : ''}`}
                  onClick={() => {
                    if (isOfficial) return
                    const newLinked = !isIdLinked
                    setIsIdLinked(newLinked)
                    if (charUuid) {
                      setMetadata(charUuid, { idLinkedToName: newLinked })
                    }
                    if (newLinked) {
                      // When linking, sync ID to current name
                      const newId = nameToId(localName)
                      setLocalId(newId)
                      onEditChange('id', newId)
                    } else {
                      // When unlinking, keep current computed ID as the editable value
                      setLocalId(nameToId(localName))
                    }
                  }}
                  disabled={isOfficial}
                  title={isOfficial ? 'Official character - cannot edit' : isIdLinked ? 'ID linked to name (click to unlink)' : 'ID not linked (click to link to name)'}
                >
                  {isIdLinked ? '🔗' : '⛓️‍💥'}
                </button>
              </div>
              <input
                id="edit-id"
                type="text"
                value={isIdLinked ? nameToId(localName) : localId}
                readOnly={isIdLinked || isOfficial}
                disabled={isIdLinked || isOfficial}
                className={isIdLinked ? styles.linkedField : ''}
                onChange={(e) => {
                  if (!isIdLinked && !isOfficial) {
                    setLocalId(e.target.value)
                    onEditChange('id', e.target.value)
                  }
                }}
                title={isOfficial ? 'Official character - cannot edit' : isIdLinked ? 'Unlink to edit ID manually' : 'Unique identifier for this character'}
              />
            </div>

            <div className={styles.formGroup}>
              <div className={styles.labelWithAction}>
                <label htmlFor="edit-name">Character Name</label>
                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={() => {
                    if (isOfficial) return
                    const newName = generateRandomName()
                    setLocalName(newName)
                    if (isIdLinked && onReplaceCharacter) {
                      // Update both name and id together in a single state update
                      onReplaceCharacter({
                        ...character,
                        name: newName,
                        id: nameToId(newName),
                      })
                    } else {
                      onEditChange('name', newName)
                    }
                  }}
                  disabled={isOfficial}
                  title={isOfficial ? 'Official character - cannot edit' : 'Generate random name'}
                >
                  🎲
                </button>
              </div>
              <input
                id="edit-name"
                type="text"
                value={localName}
                disabled={isOfficial}
                onChange={(e) => {
                  if (isOfficial) return
                  const newName = e.target.value
                  setLocalName(newName)
                  // Clear existing debounce timer
                  if (debounceTimerRef.current) {
                    clearTimeout(debounceTimerRef.current)
                  }
                  // Batch name and id updates together using onReplaceCharacter
                  debounceTimerRef.current = setTimeout(() => {
                    if (isIdLinked && onReplaceCharacter) {
                      // Update both name and id together in a single state update
                      onReplaceCharacter({
                        ...character,
                        name: newName,
                        id: nameToId(newName),
                      })
                    } else {
                      onEditChange('name', newName)
                    }
                  }, 500)
                }}
                onBlur={() => {
                  if (isOfficial) return
                  if (isIdLinked && onReplaceCharacter) {
                    // Update both name and id together in a single state update
                    onReplaceCharacter({
                      ...character,
                      name: localName,
                      id: nameToId(localName),
                    })
                  } else {
                    onEditChange('name', localName)
                  }
                }}
                placeholder="Character name"
              />
            </div>

            <div className={`${styles.formGroup} ${styles.teamSelectGroup} ${teamSelectClassMap[character.team] || ''}`}>
              <label htmlFor="edit-team">Team</label>
              <select
                id="edit-team"
                value={character.team}
                disabled={isOfficial}
                onChange={(e) => {
                  if (isOfficial) return
                  onEditChange('team', e.target.value)
                }}
              >
                <option value="townsfolk">Townsfolk</option>
                <option value="outsider">Outsider</option>
                <option value="minion">Minion</option>
                <option value="demon">Demon</option>
                <option value="traveller">Traveller</option>
                <option value="fabled">Fabled</option>
                <option value="loric">Loric</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Image</label>
              <p className={styles.fieldHint}>Add one or more image URLs. Drag to reorder.</p>
              <div className={styles.imageUrlsList}>
                {localImages.map((url, index) => (
                  <div
                    key={index}
                    className={`${styles.imageUrlRow} ${draggedImageIndex === index ? styles.dragging : ''} ${dragOverImageIndex === index ? styles.dragOver : ''}`}
                    draggable={!isOfficial && localImages.length > 1}
                    onDragStart={(e) => {
                      if (isOfficial) return
                      setDraggedImageIndex(index)
                      e.dataTransfer.effectAllowed = 'move'
                    }}
                    onDragEnd={() => {
                      setDraggedImageIndex(null)
                      setDragOverImageIndex(null)
                    }}
                    onDragOver={(e) => {
                      e.preventDefault()
                      if (draggedImageIndex !== null && draggedImageIndex !== index) {
                        setDragOverImageIndex(index)
                      }
                    }}
                    onDragLeave={() => {
                      setDragOverImageIndex(null)
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      if (draggedImageIndex !== null && draggedImageIndex !== index) {
                        const newImages = [...localImages]
                        const [removed] = newImages.splice(draggedImageIndex, 1)
                        newImages.splice(index, 0, removed)
                        setLocalImages(newImages)
                        onEditChange('image', newImages.length === 1 ? newImages[0] : newImages)
                      }
                      setDraggedImageIndex(null)
                      setDragOverImageIndex(null)
                    }}
                  >
                    <span className={styles.dragHandle} title={localImages.length > 1 ? 'Drag to reorder' : ''}>⋮⋮</span>
                    {url.trim() && (
                      <button
                        type="button"
                        className={`${styles.inlineThumbnail} ${previewVariantIndex === index ? styles.thumbnailActive : ''} ${previewVariantIndex === null && index === 0 ? styles.thumbnailActive : ''}`}
                        onClick={() => {
                          if (onPreviewVariant) {
                            setPreviewVariantIndex(index)
                            onPreviewVariant(url)
                          }
                        }}
                        title="Click to preview this variant"
                      >
                        <img
                          src={resolvedImageUrls[index] || url}
                          alt={`Preview ${index + 1}`}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23333" width="100" height="100"/><text fill="%23999" x="50" y="55" text-anchor="middle" font-size="14">?</text></svg>'
                          }}
                        />
                      </button>
                    )}
                    <input
                      type="text"
                      value={url}
                      disabled={isOfficial}
                      onChange={(e) => {
                        if (isOfficial) return
                        handleImageUpdate(index, e.target.value)
                      }}
                      onBlur={() => {
                        if (isOfficial) return
                        const images = localImages.length === 1 ? localImages[0] : localImages
                        onEditChange('image', images)
                      }}
                      placeholder="URL to character image"
                    />
                    <button
                      type="button"
                      className={`${styles.btnIcon} ${styles.btnDanger}`}
                      onClick={() => {
                        if (isOfficial) return
                        if (localImages.length <= 1) {
                          // Clear the field instead of removing
                          setLocalImages([''])
                          onEditChange('image', '')
                        } else {
                          const newImages = localImages.filter((_, i) => i !== index)
                          setLocalImages(newImages)
                          onEditChange('image', newImages.length === 1 ? newImages[0] : newImages)
                        }
                      }}
                      disabled={isOfficial}
                      title={isOfficial ? 'Official character - cannot edit' : localImages.length <= 1 ? 'Clear URL' : 'Remove URL'}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <div className={styles.imageUrlActions}>
                <button
                  type="button"
                  className={`${styles.btnSecondary} ${styles.btnSm}`}
                  onClick={() => {
                    if (isOfficial) return
                    const newImages = [...localImages, '']
                    setLocalImages(newImages)
                    onEditChange('image', newImages)
                  }}
                  disabled={isOfficial}
                >
                  + Add Image URL
                </button>
                <button
                  type="button"
                  className={`${styles.btnSecondary} ${styles.btnSm}`}
                  onClick={handleRefreshImages}
                  disabled={isOfficial}
                  title={isOfficial ? 'Official character - cannot edit' : 'Refresh preview with current image URLs'}
                >
                  🔄 Refresh Images
                </button>
              </div>


            </div>

            <div className={styles.formGroup}>
              <label htmlFor="edit-ability">Ability Text</label>
              <textarea
                ref={registerTextareaRef}
                id="edit-ability"
                className={styles.autoExpand}
                value={localAbility}
                disabled={isOfficial}
                onChange={(e) => {
                  if (isOfficial) return
                  setLocalAbility(e.target.value)
                  debouncedUpdate('ability', e.target.value)
                }}
                onKeyDown={(e) => {
                  if (isOfficial) return
                  // Auto-close brackets: typing [ inserts [] with cursor in middle
                  if (e.key === '[') {
                    e.preventDefault()
                    const textarea = e.currentTarget
                    const start = textarea.selectionStart
                    const end = textarea.selectionEnd
                    const before = localAbility.slice(0, start)
                    const after = localAbility.slice(end)
                    const newValue = before + '[]' + after
                    setLocalAbility(newValue)
                    debouncedUpdate('ability', newValue)
                    // Position cursor between brackets after React re-renders
                    requestAnimationFrame(() => {
                      textarea.selectionStart = textarea.selectionEnd = start + 1
                    })
                  }
                }}
                onInput={handleTextareaInput}
                onBlur={() => {
                  if (isOfficial) return
                  onEditChange('ability', localAbility)
                }}
                placeholder="Character ability description"
                rows={3}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="edit-setup">Setup Character</label>
              <input
                id="edit-setup"
                type="checkbox"
                className={viewStyles.toggleSwitch}
                checked={character.setup || false}
                disabled={isOfficial}
                onChange={(e) => {
                  if (isOfficial) return
                  const newSetupValue = e.target.checked
                  onEditChange('setup', newSetupValue)

                  // If enabling setup and no brackets exist, add [] at end
                  if (newSetupValue && !/\[.*?\]/.test(localAbility)) {
                    const newAbility = localAbility.trim() + ' []'
                    setLocalAbility(newAbility)
                    onEditChange('ability', newAbility)
                  }
                }}
              />
              <p className={styles.fieldHint}>
                Setup text [in brackets] enables this automatically. Enabling this adds [] if not present.
              </p>
            </div>

            <div className={styles.formGroup}>
              <label>Reminders</label>
              <p className={styles.fieldHint}>Add reminder text that appears on reminder tokens. Use count to create multiple copies. Drag to reorder.</p>
              <div className={styles.remindersUrlsList}>
                {groupedReminders.map(({ text, count }, index) => (
                  <div
                    key={index}
                    className={`${styles.reminderUrlRow} ${draggedReminderIndex === index ? styles.dragging : ''} ${dragOverReminderIndex === index ? styles.dragOver : ''}`}
                    draggable={!isOfficial && groupedReminders.length > 1}
                    onDragStart={(e) => {
                      if (isOfficial) return
                      setDraggedReminderIndex(index)
                      e.dataTransfer.effectAllowed = 'move'
                    }}
                    onDragEnd={() => {
                      setDraggedReminderIndex(null)
                      setDragOverReminderIndex(null)
                    }}
                    onDragOver={(e) => {
                      e.preventDefault()
                      if (draggedReminderIndex !== null && draggedReminderIndex !== index) {
                        setDragOverReminderIndex(index)
                      }
                    }}
                    onDragLeave={() => {
                      setDragOverReminderIndex(null)
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      if (draggedReminderIndex !== null && draggedReminderIndex !== index) {
                        // Reorder grouped reminders and rebuild flat array
                        const newGrouped = [...groupedReminders]
                        const [removed] = newGrouped.splice(draggedReminderIndex, 1)
                        newGrouped.splice(index, 0, removed)
                        // Rebuild flat reminders array from reordered groups
                        const newReminders: string[] = []
                        for (const group of newGrouped) {
                          for (let i = 0; i < group.count; i++) {
                            newReminders.push(group.text)
                          }
                        }
                        setReminders(newReminders)
                        onEditChange('reminders', newReminders)
                      }
                      setDraggedReminderIndex(null)
                      setDragOverReminderIndex(null)
                    }}
                  >
                    <span className={styles.dragHandle} title={groupedReminders.length > 1 ? 'Drag to reorder' : ''}>⋮⋮</span>
                    <input
                      type="text"
                      value={text}
                      disabled={isOfficial}
                      onChange={(e) => {
                        if (isOfficial) return
                        handleReminderTextChange(text, e.target.value)
                      }}
                      placeholder="Reminder text"
                      className={styles.reminderTextInput}
                    />
                    <input
                      type="number"
                      value={count}
                      disabled={isOfficial}
                      onChange={(e) => {
                        if (isOfficial) return
                        const val = e.target.value
                        if (val === '') return // Allow empty while typing
                        handleReminderCountChange(text, parseInt(val) || 1)
                      }}
                      onBlur={(e) => {
                        if (isOfficial) return
                        // If empty on blur, reset to 1
                        if (e.target.value === '') {
                          handleReminderCountChange(text, 1)
                        }
                      }}
                      min={1}
                      max={20}
                      className={styles.reminderCountInput}
                      title={isOfficial ? 'Official character - cannot edit' : 'Number of this reminder token'}
                    />
                    <button
                      type="button"
                      className={`${styles.btnIcon} ${styles.btnDanger}`}
                      onClick={() => {
                        if (isOfficial) return
                        handleRemoveGroupedReminder(text)
                      }}
                      disabled={isOfficial}
                      title={isOfficial ? 'Official character - cannot edit' : 'Remove all copies of this reminder'}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className={`${styles.btnSecondary} ${styles.btnSm}`}
                onClick={() => {
                  if (isOfficial) return
                  const updated = [...reminders, '']
                  setReminders(updated)
                  onEditChange('reminders', updated)
                }}
                disabled={isOfficial}
              >
                + Add Reminder
              </button>
            </div>

            <div className={styles.formGroup}>
              <div className={styles.labelWithAction}>
                <label htmlFor="edit-firstnight">First Night Reminder</label>
                <span className={styles.nightOrderLabel}>
                  Night Order
                  <input
                    type="number"
                    className={styles.nightOrderInput}
                    value={localFirstNight === 0 ? '' : localFirstNight}
                    disabled={isOfficial}
                    min={0}
                    placeholder="0"
                    onChange={(e) => {
                      if (isOfficial) return
                      const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10)
                      setLocalFirstNight(val)
                    }}
                    onBlur={() => {
                      if (isOfficial) return
                      let normalizedValue = localFirstNight || 0

                      // If reminder text exists, don't allow 0 (minimum is 1)
                      if (localFirstNightReminder.trim() && normalizedValue === 0) {
                        normalizedValue = 1
                      }

                      setLocalFirstNight(normalizedValue)
                      onEditChange('firstNight', normalizedValue)
                    }}
                  />
                </span>
              </div>
              <textarea
                ref={registerTextareaRef}
                id="edit-firstnight"
                className={styles.autoExpand}
                value={localFirstNightReminder}
                disabled={isOfficial}
                onChange={(e) => {
                  if (isOfficial) return
                  const newValue = e.target.value
                  setLocalFirstNightReminder(newValue)
                  debouncedUpdate('firstNightReminder', newValue)

                  // Auto-default night order to 1 if reminder text exists and night order is 0
                  if (newValue.trim() && localFirstNight === 0) {
                    setLocalFirstNight(1)
                    onEditChange('firstNight', 1)
                  }
                }}
                onInput={handleTextareaInput}
                onBlur={() => {
                  if (isOfficial) return
                  onEditChange('firstNightReminder', localFirstNightReminder)
                }}
                placeholder="Reminder text for the first night"
                rows={2}
              />
              <p className={styles.fieldHint}>Use *TEXT* for bold, :reminder: for reminder circle.</p>
              {firstNightFormatIssues.length > 0 && (
                <div className={styles.formatWarning}>
                  <span className={styles.warningIcon}>⚠️</span>
                  <div className={styles.warningContent}>
                    <span className={styles.warningTitle}>Non-standard format detected:</span>
                    <ul className={styles.warningList}>
                      {[...new Set(firstNightFormatIssues.map(i => i.description))].map((desc, idx) => (
                        <li key={idx}>{desc}</li>
                      ))}
                    </ul>
                  </div>
                  <button
                    type="button"
                    onClick={handleFixFirstNightFormat}
                    className={styles.fixButton}
                    disabled={isOfficial}
                  >
                    Fix Format
                  </button>
                </div>
              )}
            </div>

            <div className={styles.formGroup}>
              <div className={styles.labelWithAction}>
                <label htmlFor="edit-othernight">Other Night Reminder</label>
                <span className={styles.nightOrderLabel}>
                  Night Order
                  <input
                    type="number"
                    className={styles.nightOrderInput}
                    value={localOtherNight === 0 ? '' : localOtherNight}
                    disabled={isOfficial}
                    min={0}
                    placeholder="0"
                    onChange={(e) => {
                      if (isOfficial) return
                      const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10)
                      setLocalOtherNight(val)
                    }}
                    onBlur={() => {
                      if (isOfficial) return
                      let normalizedValue = localOtherNight || 0

                      // If reminder text exists, don't allow 0 (minimum is 1)
                      if (localOtherNightReminder.trim() && normalizedValue === 0) {
                        normalizedValue = 1
                      }

                      setLocalOtherNight(normalizedValue)
                      onEditChange('otherNight', normalizedValue)
                    }}
                  />
                </span>
              </div>
              <textarea
                ref={registerTextareaRef}
                id="edit-othernight"
                className={styles.autoExpand}
                value={localOtherNightReminder}
                disabled={isOfficial}
                onChange={(e) => {
                  if (isOfficial) return
                  const newValue = e.target.value
                  setLocalOtherNightReminder(newValue)
                  debouncedUpdate('otherNightReminder', newValue)

                  // Auto-default night order to 1 if reminder text exists and night order is 0
                  if (newValue.trim() && localOtherNight === 0) {
                    setLocalOtherNight(1)
                    onEditChange('otherNight', 1)
                  }
                }}
                onInput={handleTextareaInput}
                onBlur={() => {
                  if (isOfficial) return
                  onEditChange('otherNightReminder', localOtherNightReminder)
                }}
                placeholder="Reminder text for other nights"
                rows={2}
              />
              <p className={styles.fieldHint}>Use *TEXT* for bold, :reminder: for reminder circle.</p>
              {otherNightFormatIssues.length > 0 && (
                <div className={styles.formatWarning}>
                  <span className={styles.warningIcon}>⚠️</span>
                  <div className={styles.warningContent}>
                    <span className={styles.warningTitle}>Non-standard format detected:</span>
                    <ul className={styles.warningList}>
                      {[...new Set(otherNightFormatIssues.map(i => i.description))].map((desc, idx) => (
                        <li key={idx}>{desc}</li>
                      ))}
                    </ul>
                  </div>
                  <button
                    type="button"
                    onClick={handleFixOtherNightFormat}
                    className={styles.fixButton}
                    disabled={isOfficial}
                  >
                    Fix Format
                  </button>
                </div>
              )}
            </div>

            <div className={styles.formGroup}>
              <label>Special</label>
              <p className={styles.fieldHint}>Add special app integration features for this character.</p>
              <div className={styles.specialItemsList}>
                {(() => {
                  // Ensure special is always treated as an array
                  const specialArray = Array.isArray((character as any).special) 
                    ? (character as any).special 
                    : (character as any).special 
                      ? [(character as any).special] 
                      : []
                  
                  const SPECIAL_TYPES = ['selection', 'ability', 'signal', 'vote', 'reveal', 'player'] as const
                  const SPECIAL_NAMES = ['grimoire', 'pointing', 'ghost-votes', 'distribute-roles', 'bag-disabled', 'bag-duplicate', 'multiplier', 'hidden', 'replace-character', 'player', 'card', 'open-eyes'] as const
                  const SPECIAL_TIMES = ['', 'pregame', 'day', 'night', 'firstNight', 'firstDay', 'otherNight', 'otherDay'] as const
                  const SPECIAL_GLOBALS = ['', 'townsfolk', 'outsider', 'minion', 'demon', 'traveller', 'dead'] as const
                  
                  return specialArray.map((item: any, index: number) => {
                    // Parse item to get all properties
                    const itemObj = typeof item === 'object' && item !== null ? item : { type: 'selection', name: '' }
                    const itemType = itemObj.type || 'selection'
                    const itemName = itemObj.name || ''
                    const itemValue = itemObj.value !== undefined ? String(itemObj.value) : ''
                    const itemTime = itemObj.time || ''
                    const itemGlobal = itemObj.global || ''
                    
                    const updateSpecialItem = (updates: Record<string, any>) => {
                      const special = [...specialArray]
                      const newItem: Record<string, any> = { ...itemObj, ...updates }
                      // Remove empty optional fields
                      if (!newItem.value && newItem.value !== 0) delete newItem.value
                      if (!newItem.time) delete newItem.time
                      if (!newItem.global) delete newItem.global
                      special[index] = newItem
                      onEditChange('special' as keyof Character, special)
                    }
                    
                    return (
                      <div key={index} className={styles.specialItemCard}>
                        <div className={styles.specialItemHeader}>
                          <span className={styles.specialItemNumber}>#{index + 1}</span>
                          <button
                            type="button"
                            className={`${styles.btnIcon} ${styles.btnDanger}`}
                            onClick={() => {
                              if (isOfficial) return
                              const special = [...specialArray]
                              special.splice(index, 1)
                              onEditChange('special' as keyof Character, special)
                            }}
                            disabled={isOfficial}
                            title={isOfficial ? 'Official character - cannot edit' : 'Remove special'}
                          >
                            ✕
                          </button>
                        </div>
                        <div className={styles.specialItemFields}>
                          <div className={styles.specialField}>
                            <label>Type <span className={styles.required}>*</span></label>
                            <select
                              value={itemType}
                              disabled={isOfficial}
                              onChange={(e) => {
                                if (isOfficial) return
                                updateSpecialItem({ type: e.target.value })
                              }}
                            >
                              {SPECIAL_TYPES.map(type => (
                                <option key={type} value={type}>{type}</option>
                              ))}
                            </select>
                          </div>
                          <div className={styles.specialField}>
                            <label>Name <span className={styles.required}>*</span></label>
                            <select
                              value={itemName}
                              disabled={isOfficial}
                              onChange={(e) => {
                                if (isOfficial) return
                                updateSpecialItem({ name: e.target.value })
                              }}
                            >
                              <option value="">-- Select --</option>
                              {SPECIAL_NAMES.map(name => (
                                <option key={name} value={name}>{name}</option>
                              ))}
                            </select>
                          </div>
                          <div className={styles.specialField}>
                            <label>Value</label>
                            <input
                              type="text"
                              value={itemValue}
                              disabled={isOfficial}
                              onChange={(e) => {
                                if (isOfficial) return
                                const val = e.target.value
                                // Try to parse as number if it looks like one
                                const numVal = parseFloat(val)
                                updateSpecialItem({ value: !isNaN(numVal) && val === String(numVal) ? numVal : val })
                              }}
                              placeholder="Text or number"
                            />
                          </div>
                          <div className={styles.specialField}>
                            <label>Time</label>
                            <select
                              value={itemTime}
                              disabled={isOfficial}
                              onChange={(e) => {
                                if (isOfficial) return
                                updateSpecialItem({ time: e.target.value })
                              }}
                            >
                              <option value="">-- None --</option>
                              {SPECIAL_TIMES.filter(t => t).map(time => (
                                <option key={time} value={time}>{time}</option>
                              ))}
                            </select>
                          </div>
                          <div className={styles.specialField}>
                            <label>Global</label>
                            <select
                              value={itemGlobal}
                              disabled={isOfficial}
                              onChange={(e) => {
                                if (isOfficial) return
                                updateSpecialItem({ global: e.target.value })
                              }}
                            >
                              <option value="">-- None --</option>
                              {SPECIAL_GLOBALS.filter(g => g).map(global => (
                                <option key={global} value={global}>{global}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
              <button
                type="button"
                className={`${styles.btnSecondary} ${styles.btnSm}`}
                onClick={() => {
                  if (isOfficial) return
                  const specialArray = Array.isArray((character as any).special)
                    ? (character as any).special
                    : (character as any).special
                      ? [(character as any).special]
                      : []
                  const special = [...specialArray, { type: 'selection', name: 'grimoire' }]
                  onEditChange('special' as keyof Character, special)
                }}
                disabled={isOfficial}
              >
                + Add Special
              </button>
            </div>
          </div>
        )}

        {activeTab === 'almanac' && (
          <div className={`${styles.tabContent} ${isOfficial ? styles.disabled : ''}`}>
            <div className={styles.formGroup}>
              <label htmlFor="edit-flavor">Flavor Text</label>
              <textarea
                ref={registerTextareaRef}
                id="edit-flavor"
                className={styles.autoExpand}
                value={localFlavor}
                disabled={isOfficial}
                onChange={(e) => {
                  if (isOfficial) return
                  setLocalFlavor(e.target.value)
                  debouncedUpdate('flavor', e.target.value)
                }}
                onInput={handleTextareaInput}
                onBlur={() => {
                  if (isOfficial) return
                  onEditChange('flavor', localFlavor)
                }}
                placeholder="Flavor quote or description"
                rows={2}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="edit-overview">Overview</label>
              <textarea
                ref={registerTextareaRef}
                id="edit-overview"
                className={styles.autoExpand}
                value={localOverview}
                disabled={isOfficial}
                onChange={(e) => {
                  if (isOfficial) return
                  setLocalOverview(e.target.value)
                  debouncedUpdate('overview', e.target.value)
                }}
                onInput={handleTextareaInput}
                onBlur={() => {
                  if (isOfficial) return
                  onEditChange('overview', localOverview)
                }}
                placeholder="Overview of the character's role and strategy"
                rows={4}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="edit-examples">Examples</label>
              <textarea
                ref={registerTextareaRef}
                id="edit-examples"
                className={styles.autoExpand}
                value={localExamples}
                disabled={isOfficial}
                onChange={(e) => {
                  if (isOfficial) return
                  setLocalExamples(e.target.value)
                  debouncedUpdate('examples', e.target.value)
                }}
                onInput={handleTextareaInput}
                onBlur={() => {
                  if (isOfficial) return
                  onEditChange('examples', localExamples)
                }}
                placeholder="Example scenarios and interactions"
                rows={4}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="edit-howtorun">How to Run</label>
              <textarea
                ref={registerTextareaRef}
                id="edit-howtorun"
                className={styles.autoExpand}
                value={localHowToRun}
                disabled={isOfficial}
                onChange={(e) => {
                  if (isOfficial) return
                  setLocalHowToRun(e.target.value)
                  debouncedUpdate('howToRun', e.target.value)
                }}
                onInput={handleTextareaInput}
                onBlur={() => {
                  if (isOfficial) return
                  onEditChange('howToRun', localHowToRun)
                }}
                placeholder="Instructions for Storytellers on how to run this character"
                rows={4}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="edit-tips">Tips</label>
              <textarea
                ref={registerTextareaRef}
                id="edit-tips"
                className={styles.autoExpand}
                value={localTips}
                disabled={isOfficial}
                onChange={(e) => {
                  if (isOfficial) return
                  setLocalTips(e.target.value)
                  debouncedUpdate('tips', e.target.value)
                }}
                onInput={handleTextareaInput}
                onBlur={() => {
                  if (isOfficial) return
                  onEditChange('tips', localTips)
                }}
                placeholder="Tips for playing this character effectively"
                rows={4}
              />
            </div>
          </div>
        )}

        {activeTab === 'decoratives' && (
          <div className={styles.tabContent}>
            <p className={styles.decorativesDescription}>
              Override global decorative settings for this character only.
            </p>
            
            {/* Leaf Settings */}
            <div className={styles.decorativesSection}>
              <h4>Leaf Decorations</h4>
              
              <div className={styles.formGroup}>
                <label htmlFor="use-custom-leaves">Use custom leaf settings for this character</label>
                <input
                  id="use-custom-leaves"
                  type="checkbox"
                  className={viewStyles.toggleSwitch}
                  checked={decoratives.useCustomLeaves || false}
                  onChange={(e) => updateDecoratives({ useCustomLeaves: e.target.checked })}
                />
              </div>
              
              {decoratives.useCustomLeaves && (
                <>
                  <div className={styles.formGroup}>
                    <label htmlFor="leaf-style">Leaf Style</label>
                    <AssetPreviewSelector
                      value={decoratives.leafStyle || 'classic'}
                      onChange={(value) => updateDecoratives({ leafStyle: value })}
                      assetType="leaf"
                      shape="square"
                      size="small"
                      showNone={true}
                      noneLabel="None (disable)"
                      generationOptions={generationOptions}
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label htmlFor="leaf-count">Maximum Leaves</label>
                    <input
                      id="leaf-count"
                      type="range"
                      min={0}
                      max={9}
                      value={decoratives.leafCount ?? 0}
                      onChange={(e) => updateDecoratives({ leafCount: parseInt(e.target.value) })}
                    />
                    <span className={styles.sliderValue}>{decoratives.leafCount ?? 0}</span>
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label htmlFor="leaf-probability">Leaf Probability</label>
                    <input
                      id="leaf-probability"
                      type="range"
                      min={0}
                      max={100}
                      value={decoratives.leafProbability ?? 30}
                      onChange={(e) => updateDecoratives({ leafProbability: parseInt(e.target.value) })}
                    />
                    <span className={styles.sliderValue}>{decoratives.leafProbability ?? 30}%</span>
                  </div>
                </>
              )}
            </div>
            
            {/* Setup Flower Settings */}
            {character.setup && (
              <div className={styles.decorativesSection}>
                <h4>Setup Flower</h4>
                
                <div className={styles.formGroup}>
                  <label htmlFor="hide-setup-flower">Hide setup flower for this character</label>
                  <input
                    id="hide-setup-flower"
                    type="checkbox"
                    className={viewStyles.toggleSwitch}
                    checked={decoratives.hideSetupFlower || false}
                    onChange={(e) => updateDecoratives({ hideSetupFlower: e.target.checked })}
                  />
                </div>
                
                {!decoratives.hideSetupFlower && (
                  <div className={styles.formGroup}>
                    <label htmlFor="setup-flower-style">Flower Style</label>
                    <AssetPreviewSelector
                      value={decoratives.setupFlowerStyle || 'setup_flower_1'}
                      onChange={(value) => updateDecoratives({ setupFlowerStyle: value })}
                      assetType="setup-flower"
                      shape="square"
                      size="small"
                      showNone={false}
                      generationOptions={generationOptions}
                    />
                  </div>
                )}
              </div>
            )}
            
            <div className={styles.decorativesNote}>
              <p><strong>Note:</strong> These settings will override global options when regenerating this character's token.</p>
            </div>
          </div>
        )}

        {activeTab === 'json' && (
          <div className={styles.tabContent}>
            <div className={styles.jsonTabContent}>
              {/* Sub-tabs for Character JSON vs Metadata */}
              <div className={styles.jsonSubTabs}>
                <button
                  type="button"
                  className={`${styles.jsonSubTab} ${jsonSubTab === 'character' ? styles.active : ''}`}
                  onClick={() => setJsonSubTab('character')}
                >
                  Character JSON
                </button>
                <button
                  type="button"
                  className={`${styles.jsonSubTab} ${jsonSubTab === 'metadata' ? styles.active : ''}`}
                  onClick={() => setJsonSubTab('metadata')}
                >
                  Metadata
                </button>
              </div>

              {jsonSubTab === 'character' && (
              <>
              <div className={styles.jsonHeader}>
                <p className={styles.jsonDescription}>Edit the raw JSON data for this character.</p>
                <div className={styles.jsonButtons}>
                  <button
                    type="button"
                    className={`${styles.btnSecondary} ${styles.btnSm}`}
                    onClick={handleFormatJson}
                    title="Format JSON"
                  >
                    🎨 Format
                  </button>
                  <button
                    type="button"
                    className={`${styles.btnSecondary} ${styles.btnSm}`}
                    onClick={() => {
                      navigator.clipboard.writeText(jsonText)
                        .then(() => {
                          // Could add a toast here if needed
                        })
                        .catch((err) => {
                          console.error('Failed to copy:', err)
                        })
                    }}
                    title="Copy JSON to clipboard"
                  >
                    📋 Copy
                  </button>
                  <button
                    type="button"
                    className={`${styles.btnSecondary} ${styles.btnSm}`}
                    onClick={() => {
                      const blob = new Blob([jsonText], { type: 'application/json' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `${character.id || character.name || 'character'}.json`
                      document.body.appendChild(a)
                      a.click()
                      document.body.removeChild(a)
                      URL.revokeObjectURL(url)
                    }}
                    title="Download JSON file"
                  >
                    ⬇️ Download
                  </button>
                </div>
              </div>
              <JsonEditorPanel
                value={jsonText}
                onChange={handleJsonChange}
                onValidJson={() => {}} // handleJsonChange handles validation internally
                minHeight="400px"
                showError={false} // We show error separately below
                className={styles.jsonEditorWrapper}
              />
              {jsonError && (
                <div className={styles.jsonError}>
                  ⚠️ {jsonError}
                </div>
              )}
              </>
              )}

              {jsonSubTab === 'metadata' && (
                <div className={styles.metadataView}>
                  <div className={styles.jsonHeader}>
                    <p className={styles.jsonDescription}>Internal metadata for this character (read-only).</p>
                    <div className={styles.jsonButtons}>
                      <button
                        type="button"
                        className={`${styles.btnSecondary} ${styles.btnSm}`}
                        onClick={() => {
                          const metadataExport = {
                            uuid: charUuid,
                            source: character?.source,
                            ...metadata
                          }
                          navigator.clipboard.writeText(JSON.stringify(metadataExport, null, 2))
                        }}
                        title="Copy metadata to clipboard"
                      >
                        📋 Copy
                      </button>
                    </div>
                  </div>
                  <div className={styles.metadataContent}>
                    <div className={styles.metadataField}>
                      <label>UUID</label>
                      <code>{charUuid || '(none)'}</code>
                    </div>
                    <div className={styles.metadataField}>
                      <label>Source</label>
                      <code>{character?.source || '(none)'}</code>
                    </div>
                    <div className={styles.metadataField}>
                      <label>ID Linked to Name</label>
                      <code>{metadata.idLinkedToName ? 'true' : 'false'}</code>
                    </div>
                    {metadata.decoratives && Object.keys(metadata.decoratives).length > 0 && (
                      <div className={styles.metadataField}>
                        <label>Decoratives</label>
                        <pre className={styles.metadataJson}>{JSON.stringify(metadata.decoratives, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
