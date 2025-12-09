import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useTokenContext } from '../../contexts/TokenContext'
import { useToast } from '../../contexts/ToastContext'
import { CharacterNavigation } from '../TokenDetailView/CharacterNavigation'
import { TokenPreview } from '../TokenDetailView/TokenPreview'
import { TokenEditor } from '../TokenDetailView/TokenEditor'
import { MetaEditor } from '../TokenDetailView/MetaEditor'
import { updateCharacterInJson, updateMetaInJson, downloadCharacterTokensAsZip, downloadCharacterTokenOnly, downloadReminderTokensOnly, regenerateCharacterAndReminders } from '../../ts/ui/detailViewUtils'
import { generateRandomName, nameToId, generateUuid } from '../../ts/utils/nameGenerator'
import { getPreRenderedTokens, hashOptions } from '../../utils/customizePreRenderCache'
import styles from '../../styles/components/views/Views.module.css'
import previewStyles from '../../styles/components/tokenDetail/TokenPreview.module.css'
import type { Token, Character, Team, ScriptMeta } from '../../ts/types/index.js'

interface CustomizeViewProps {
  initialToken?: Token
  selectedCharacterUuid?: string
  onCharacterSelect?: (characterUuid: string) => void
  onGoToGallery?: () => void
  createNewCharacter?: boolean
}

export function CustomizeView({ initialToken, selectedCharacterUuid: externalSelectedUuid, onCharacterSelect, onGoToGallery, createNewCharacter }: CustomizeViewProps) {
  const { characters, tokens, jsonInput, setJsonInput, setCharacters, setTokens, generationOptions, setMetadata, deleteMetadata, getMetadata, scriptMeta, setScriptMeta, officialData } = useTokenContext()
  const { addToast } = useToast()
  
  // Check if initialToken is a meta token
  const isMetaToken = (token?: Token) => {
    return token && token.type !== 'character' && token.type !== 'reminder'
  }
  
  // Determine the initial character UUID from the clicked token or external prop
  const getInitialCharacterUuid = () => {
    // If initial token is a meta token, don't select any character
    if (isMetaToken(initialToken)) return ''
    
    if (externalSelectedUuid) return externalSelectedUuid
    if (!initialToken) return characters[0]?.uuid || ''
    
    if (initialToken.parentCharacter) {
      const char = characters.find(c => c.name === initialToken.parentCharacter)
      if (char) return char.uuid || ''
    }
    
    if (initialToken.type === 'character') {
      const char = characters.find(c => c.name === initialToken.name)
      if (char) return char.uuid || ''
    }
    
    return characters[0]?.uuid || ''
  }
  
  const [selectedCharacterUuid, setSelectedCharacterUuid] = useState<string>(getInitialCharacterUuid())
  const [editedCharacter, setEditedCharacter] = useState<Character | null>(null)
  const [selectedMetaToken, setSelectedMetaToken] = useState<Token | null>(
    initialToken && isMetaToken(initialToken) ? initialToken : null
  )
  const [isMetaSelected, setIsMetaSelected] = useState(!!selectedMetaToken)
  const [isDirty, setIsDirty] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  // Check shared pre-render cache for tokens pre-rendered on tab hover
  const getInitialPreviewToken = (): Token | null => {
    // First check if we have an initial token from gallery click
    if (initialToken?.type === 'character') return initialToken
    
    // Then check shared pre-render cache (from hovering over Customize tab)
    const initialCharUuid = getInitialCharacterUuid()
    if (initialCharUuid && !isMetaToken(initialToken)) {
      const cached = getPreRenderedTokens(initialCharUuid, generationOptions)
      if (cached) return cached.characterToken
    }
    return null
  }
  
  const getInitialReminderTokens = (): Token[] => {
    // First check if we have an initial token from gallery click
    if (initialToken && !isMetaToken(initialToken)) {
      if (initialToken.type === 'reminder' && initialToken.parentUuid) {
        return tokens.filter(t => t.type === 'reminder' && t.parentUuid === initialToken.parentUuid)
      }
      if (initialToken.type === 'character' && initialToken.parentUuid) {
        return tokens.filter(t => t.type === 'reminder' && t.parentUuid === initialToken.parentUuid)
      }
    }
    
    // Then check shared pre-render cache
    const initialCharUuid = getInitialCharacterUuid()
    if (initialCharUuid && !isMetaToken(initialToken)) {
      const cached = getPreRenderedTokens(initialCharUuid, generationOptions)
      if (cached) return cached.reminderTokens
    }
    return []
  }
  
  // Initialize preview with the clicked token from gallery, or pre-rendered from tab hover
  const [previewCharacterToken, setPreviewCharacterToken] = useState<Token | null>(getInitialPreviewToken)
  // Initialize reminder tokens from gallery tokens or pre-render cache
  const [previewReminderTokens, setPreviewReminderTokens] = useState<Token[]>(getInitialReminderTokens)
  
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const previousCharacterUuidRef = useRef<string>(selectedCharacterUuid)
  const hasCreatedNewCharacterRef = useRef(false)
  // Pre-render cache for hover optimization - keyed by UUID+optionsHash for proper invalidation
  const preRenderCacheRef = useRef<Map<string, { characterToken: Token; reminderTokens: Token[] }>>(new Map())
  const preRenderingRef = useRef<Set<string>>(new Set())
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Current options hash for cache key generation
  const currentOptionsHashRef = useRef<string>(hashOptions(generationOptions))
  // Skip regeneration for a specific character UUID when we just applied cached tokens
  // Initialize with the initial character UUID if coming from gallery with a token OR from shared pre-render cache
  const skipRegenerateForUuidRef = useRef<string | null>((() => {
    if (initialToken?.type === 'character') return getInitialCharacterUuid()
    // Also skip if we got tokens from shared pre-render cache
    const initialCharUuid = getInitialCharacterUuid()
    if (initialCharUuid && getPreRenderedTokens(initialCharUuid, generationOptions)) {
      return initialCharUuid
    }
    return null
  })())
  // Track the original UUID when we started editing (for finding character in list when ID changes)
  const originalCharacterUuidRef = useRef<string>(selectedCharacterUuid)
  // Track character UUID for preview clearing (only clear when switching to a different character)
  const prevCharacterUuidRef = useRef<string | undefined>(undefined)
  // Track if we just saved to prevent sync effect from overwriting editedCharacter
  const justSavedRef = useRef(false)
  // Ref for jsonInput to avoid dependency cycles in save effect
  const jsonInputRef = useRef(jsonInput)
  jsonInputRef.current = jsonInput
  // Ref for characters to avoid dependency cycles in save effect
  const charactersRef = useRef(characters)
  charactersRef.current = characters

  // Create new character on mount if requested
  useEffect(() => {
    if (createNewCharacter && !hasCreatedNewCharacterRef.current) {
      hasCreatedNewCharacterRef.current = true
      // Create a new character immediately with all properties
      const randomName = generateRandomName()
      const newId = nameToId(randomName)
      const newUuid = generateUuid()
      const newCharacter: Character = {
        id: newId,
        name: randomName,
        team: 'townsfolk',
        ability: '',
        flavor: '',
        image: '',
        setup: false,
        reminders: [],
        remindersGlobal: [],
        edition: '',
        firstNight: 0,
        otherNight: 0,
        firstNightReminder: '',
        otherNightReminder: '',
        uuid: newUuid,
        source: 'custom',
      }
      
      // Initialize metadata - check if ID matches name-derived ID
      const expectedId = nameToId(newCharacter.name)
      const isLinked = newCharacter.id === expectedId
      setMetadata(newUuid, { idLinkedToName: isLinked })
      
      const updatedCharacters = [...characters, newCharacter]
      setCharacters(updatedCharacters)
      
      try {
        if (jsonInput.trim()) {
          const parsed = JSON.parse(jsonInput)
          if (Array.isArray(parsed)) {
            parsed.push(newCharacter)
            setJsonInput(JSON.stringify(parsed, null, 2))
          }
        } else {
          // Create new script with just this character
          setJsonInput(JSON.stringify([newCharacter], null, 2))
        }
      } catch (e) {
        // Create new script if parsing fails
        setJsonInput(JSON.stringify([newCharacter], null, 2))
      }
      
      setSelectedCharacterUuid(newUuid)
      setEditedCharacter(newCharacter)
      
      // Generate token for the new character
      regenerateCharacterAndReminders(newCharacter, generationOptions)
        .then(({ characterToken, reminderTokens: newReminderTokens }) => {
          const updatedTokens = [...tokens, characterToken, ...newReminderTokens]
          setTokens(updatedTokens)
        })
        .catch((error) => {
          console.error('Failed to generate token for new character:', error)
        })
      
      addToast('New character created', 'success')
    }
  }, [createNewCharacter, characters, jsonInput, setCharacters, setJsonInput, addToast, generationOptions, tokens, setTokens])

  // Sync with external selected UUID
  useEffect(() => {
    if (externalSelectedUuid && externalSelectedUuid !== selectedCharacterUuid) {
      setSelectedCharacterUuid(externalSelectedUuid)
    }
  }, [externalSelectedUuid])

  // Notify parent of character selection changes
  useEffect(() => {
    if (onCharacterSelect && selectedCharacterUuid) {
      onCharacterSelect(selectedCharacterUuid)
    }
  }, [selectedCharacterUuid, onCharacterSelect])

  useEffect(() => {
    // Skip if we just saved - the editedCharacter is already up to date
    if (justSavedRef.current) {
      justSavedRef.current = false
      return
    }
    if (selectedCharacterUuid && characters.length > 0) {
      const char = characters.find((c) => c.uuid === selectedCharacterUuid)
      if (char) {
        setEditedCharacter(JSON.parse(JSON.stringify(char)))
        setIsDirty(false)
      }
    }
  }, [selectedCharacterUuid, characters])

  const selectedCharacter = useMemo(
    () => editedCharacter || characters.find((c) => c.uuid === selectedCharacterUuid),
    [editedCharacter, selectedCharacterUuid, characters]
  )

  // Check if selected character is official based on source field
  const isSelectedCharacterOfficial = useMemo(() => {
    if (!selectedCharacter) return false
    return selectedCharacter.source === 'official'
  }, [selectedCharacter])

  // Match by UUID only (UUID is required on all characters)
  const characterTokens = useMemo(
    () => {
      const char = characters.find((c) => c.uuid === selectedCharacterUuid)
      if (!char?.uuid) return []
      return tokens.filter((t) => t.type === 'character' && t.parentUuid === char.uuid)
    },
    [tokens, selectedCharacterUuid, characters]
  )

  // Match by UUID only (UUID is required on all characters)
  const reminderTokens = useMemo(
    () => {
      const char = characters.find((c) => c.uuid === selectedCharacterUuid)
      if (!char?.uuid) return []
      return tokens.filter((t) => t.type === 'reminder' && t.parentUuid === char.uuid)
    },
    [tokens, selectedCharacterUuid, characters]
  )

  // Track previous character and update options hash when generationOptions change
  // Clear pre-render cache when options change since cached tokens would be stale
  useEffect(() => {
    const newHash = hashOptions(generationOptions)
    if (currentOptionsHashRef.current !== newHash) {
      currentOptionsHashRef.current = newHash
      // Clear cache since options changed - cached tokens are now invalid
      preRenderCacheRef.current.clear()
    }
  }, [generationOptions])

  // Track previous character for reference updates (but don't clear preview tokens)
  // Preview tokens are now directly replaced by new generation, no need to clear
  useEffect(() => {
    const currentChar = characters.find(c => c.uuid === selectedCharacterUuid)
    const currentUuid = currentChar?.uuid
    
    // Update refs for tracking
    previousCharacterUuidRef.current = selectedCharacterUuid
    if (currentUuid) {
      prevCharacterUuidRef.current = currentUuid
    }
  }, [selectedCharacterUuid, characters])

  const regeneratePreview = useCallback(async () => {
    if (!editedCharacter) return
    
    try {
      const { characterToken, reminderTokens: newReminderTokens } = await regenerateCharacterAndReminders(
        editedCharacter,
        generationOptions
      )
      setPreviewCharacterToken(characterToken)
      setPreviewReminderTokens(newReminderTokens)
    } catch (error) {
      console.error('Failed to regenerate preview:', error)
    }
  }, [editedCharacter, generationOptions])

  // Preview a specific variant image (for temporary preview without affecting character list)
  const handlePreviewVariant = useCallback(async (imageUrl: string | undefined) => {
    if (!editedCharacter) return
    
    try {
      const { characterToken, reminderTokens: newReminderTokens } = await regenerateCharacterAndReminders(
        editedCharacter,
        generationOptions,
        imageUrl // Pass the specific image URL for variant preview
      )
      setPreviewCharacterToken(characterToken)
      setPreviewReminderTokens(newReminderTokens)
    } catch (error) {
      console.error('Failed to preview variant:', error)
    }
  }, [editedCharacter, generationOptions])

  // Regenerate token on every edit - instant, no debounce
  useEffect(() => {
    if (!editedCharacter) return
    
    // Skip if we just applied cached tokens from hover pre-render for this character
    if (skipRegenerateForUuidRef.current === editedCharacter.uuid) {
      skipRegenerateForUuidRef.current = null
      return
    }
    
    // Generate directly to avoid stale closure issues
    regenerateCharacterAndReminders(editedCharacter, generationOptions)
      .then(({ characterToken, reminderTokens: newReminderTokens }) => {
        setPreviewCharacterToken(characterToken)
        setPreviewReminderTokens(newReminderTokens)
      })
      .catch((error) => {
        console.error('Failed to regenerate preview:', error)
      })
  }, [editedCharacter, generationOptions])

  // Immediate save to JSON when editedCharacter changes
  useEffect(() => {
    if (!isDirty || !editedCharacter) return
    
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }
    
    saveTimerRef.current = setTimeout(() => {
      try {
        // Mark that we're saving to prevent the sync effect from resetting editedCharacter
        justSavedRef.current = true
        
        // Use originalCharacterUuidRef to find the character (in case ID was changed)
        const origUuid = originalCharacterUuidRef.current
        const origChar = charactersRef.current.find(c => c.uuid === origUuid)
        const origId = origChar?.id || editedCharacter.id
        
        // Use ref to get current jsonInput without causing dependency cycle
        const updatedJson = updateCharacterInJson(jsonInputRef.current, origId, editedCharacter)
        setJsonInput(updatedJson)
        // Use ref to get current characters without causing dependency cycle - match by UUID
        const updatedChars = charactersRef.current.map(c => 
          c.uuid === origUuid ? editedCharacter : c
        )
        setCharacters(updatedChars)
        
        // Update metadata - check if ID still matches name-derived ID
        if (editedCharacter.uuid) {
          const expectedId = nameToId(editedCharacter.name)
          const isLinked = editedCharacter.id === expectedId
          setMetadata(editedCharacter.uuid, { idLinkedToName: isLinked })
        }
        
        setIsDirty(false)
      } catch (error) {
        console.error('Save failed:', error)
        justSavedRef.current = false
      }
    }, 100)
    
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
    }
  }, [isDirty, editedCharacter, setJsonInput, setCharacters])

  // Hover handler - pre-render character token on hover
  // Uses UUID + optionsHash as cache key for proper invalidation across projects
  const handleHoverCharacter = useCallback((characterUuid: string) => {
    // Clear any pending hover timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    
    const cacheKey = `${characterUuid}:${currentOptionsHashRef.current}`
    
    // Skip if already selected, cached, or currently rendering
    if (characterUuid === selectedCharacterUuid) return
    if (preRenderCacheRef.current.has(cacheKey)) return
    if (preRenderingRef.current.has(cacheKey)) return
    
    // Small delay to avoid pre-rendering on quick mouse-overs
    hoverTimeoutRef.current = setTimeout(() => {
      const char = characters.find(c => c.uuid === characterUuid)
      if (!char) return
      
      // Double-check still not cached/rendering after delay
      if (preRenderCacheRef.current.has(cacheKey)) return
      if (preRenderingRef.current.has(cacheKey)) return
      
      preRenderingRef.current.add(cacheKey)
      
      regenerateCharacterAndReminders(char, generationOptions)
        .then(({ characterToken, reminderTokens }) => {
          preRenderCacheRef.current.set(cacheKey, { characterToken, reminderTokens })
        })
        .catch((err) => console.error('Pre-render failed:', err))
        .finally(() => {
          preRenderingRef.current.delete(cacheKey)
        })
    }, 100) // 100ms delay
  }, [characters, generationOptions, selectedCharacterUuid])

  const handleSelectCharacter = useCallback((newCharacterUuid: string) => {
    // Clear hover timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
    
    const cacheKey = `${newCharacterUuid}:${currentOptionsHashRef.current}`
    
    previousCharacterUuidRef.current = newCharacterUuid
    originalCharacterUuidRef.current = newCharacterUuid // Reset original UUID when switching characters
    setSelectedCharacterUuid(newCharacterUuid)
    setSelectedMetaToken(null) // Clear meta token selection when selecting character
    setIsMetaSelected(false) // Clear meta selection when selecting character
    
    // Check pre-render cache for instant display
    const cached = preRenderCacheRef.current.get(cacheKey)
    if (cached) {
      setPreviewCharacterToken(cached.characterToken)
      setPreviewReminderTokens(cached.reminderTokens)
      // Remove from cache after use
      preRenderCacheRef.current.delete(cacheKey)
      // Skip the next regeneration for this specific character since we already have the tokens
      skipRegenerateForUuidRef.current = newCharacterUuid
    }
  }, [])

  const handleEditChange = (field: keyof Character, value: any) => {
    if (editedCharacter) {
      setEditedCharacter(prev => {
        if (!prev) return prev
        return {
          ...prev,
          [field]: value,
        }
      })
      setIsDirty(true)
      // Invalidate pre-render cache for this character since it changed
      const cacheKey = `${selectedCharacterUuid}:${currentOptionsHashRef.current}`
      preRenderCacheRef.current.delete(cacheKey)
    }
  }

  const handleReplaceCharacter = (newCharacter: Character) => {
    setEditedCharacter(newCharacter)
    setIsDirty(true)
  }

  // handleChangeTeam receives character ID from CharacterNavigation (via char.id)
  // We need to look up the character by ID to get its UUID
  const handleChangeTeam = (characterId: string, newTeam: Team) => {
    const char = characters.find(c => c.id === characterId)
    if (!char) return

    const updatedChar = { ...char, team: newTeam }
    const updatedCharacters = characters.map(c => c.id === characterId ? updatedChar : c)
    setCharacters(updatedCharacters)

    // Update JSON
    try {
      const updatedJson = updateCharacterInJson(jsonInput, characterId, updatedChar)
      setJsonInput(updatedJson)
    } catch (e) {
      console.error('Failed to update JSON:', e)
    }

    // Regenerate tokens for this character
    regenerateCharacterAndReminders(updatedChar, generationOptions)
      .then(({ characterToken, reminderTokens: newReminderTokens }) => {
        const updatedTokens = tokens.filter(t => {
          if (t.type === 'character' && t.name === char.name) return false
          if (t.type === 'reminder' && t.parentCharacter === char.name) return false
          return true
        })
        updatedTokens.push(characterToken, ...newReminderTokens)
        setTokens(updatedTokens)
      })
      .catch((error) => {
        console.error('Failed to regenerate tokens:', error)
      })

    // If this was the selected character (by UUID), update its edited state
    if (char.uuid === selectedCharacterUuid && editedCharacter) {
      setEditedCharacter({ ...editedCharacter, team: newTeam })
    }

    addToast(`Moved ${char.name} to ${newTeam}`, 'success')
  }

  const handleAddCharacter = () => {
    const randomName = generateRandomName()
    const newId = nameToId(randomName)
    const newUuid = generateUuid()
    const newCharacter: Character = {
      id: newId,
      name: randomName,
      team: 'townsfolk',
      ability: '',
      flavor: '',
      image: '',
      setup: false,
      reminders: [],
      remindersGlobal: [],
      edition: '',
      firstNight: 0,
      otherNight: 0,
      firstNightReminder: '',
      otherNightReminder: '',
      uuid: newUuid,
      source: 'custom',
    }
    
    // Initialize metadata - check if ID matches name-derived ID
    const expectedId = nameToId(newCharacter.name)
    const isLinked = newCharacter.id === expectedId
    setMetadata(newUuid, { idLinkedToName: isLinked })
    
    const updatedCharacters = [...characters, newCharacter]
    setCharacters(updatedCharacters)
    
    try {
      if (jsonInput.trim()) {
        const parsed = JSON.parse(jsonInput)
        if (Array.isArray(parsed)) {
          parsed.push(newCharacter)
          setJsonInput(JSON.stringify(parsed, null, 2))
        }
      } else {
        // Create new script with just this character
        setJsonInput(JSON.stringify([newCharacter], null, 2))
      }
    } catch (e) {
      // Create new script if parsing fails
      setJsonInput(JSON.stringify([newCharacter], null, 2))
    }
    
    setSelectedCharacterUuid(newUuid)
    setEditedCharacter(newCharacter)
    originalCharacterUuidRef.current = newUuid
    
    // Generate token for the new character
    regenerateCharacterAndReminders(newCharacter, generationOptions)
      .then(({ characterToken, reminderTokens: newReminderTokens }) => {
        const updatedTokens = [...tokens, characterToken, ...newReminderTokens]
        setTokens(updatedTokens)
      })
      .catch((error) => {
        console.error('Failed to generate token for new character:', error)
      })
    
    addToast('New character created', 'success')
  }

  // handleDeleteCharacter receives character ID from CharacterNavigation
  // We look up by ID to find the character, but track selection by UUID
  const handleDeleteCharacter = (characterId?: string) => {
    // If no characterId provided, delete the currently selected character
    const charToDelete = characterId 
      ? characters.find(c => c.id === characterId)
      : characters.find(c => c.uuid === selectedCharacterUuid)
    
    if (!charToDelete) return
    
    // Delete metadata for this character
    if (charToDelete.uuid) {
      deleteMetadata(charToDelete.uuid)
    }
    
    const updatedCharacters = characters.filter(c => c.uuid !== charToDelete.uuid)
    setCharacters(updatedCharacters)
    
    // Filter tokens by UUID
    const updatedTokens = tokens.filter(t => t.parentUuid !== charToDelete.uuid)
    setTokens(updatedTokens)
    
    try {
      const parsed = JSON.parse(jsonInput)
      if (Array.isArray(parsed)) {
        const updatedParsed = parsed.filter((item: any) => {
          if (typeof item === 'string') return item !== charToDelete.id
          if (typeof item === 'object') return item.id !== charToDelete.id
          return true
        })
        setJsonInput(JSON.stringify(updatedParsed, null, 2))
      }
    } catch (e) {
      console.error('Failed to update JSON:', e)
    }
    
    // If we deleted the selected character, select another one
    if (charToDelete.uuid === selectedCharacterUuid) {
      if (updatedCharacters.length > 0) {
        setSelectedCharacterUuid(updatedCharacters[0].uuid || '')
      } else {
        setSelectedCharacterUuid('')
        setEditedCharacter(null)
      }
    }
    
    addToast(`Deleted ${charToDelete.name}`, 'success')
  }

  // handleDuplicateCharacter receives character ID from CharacterNavigation
  const handleDuplicateCharacter = (characterId: string) => {
    const charToDuplicate = characters.find(c => c.id === characterId)
    if (!charToDuplicate) return

    const newId = `${charToDuplicate.id}_copy_${Date.now()}`
    const newUuid = generateUuid()
    const newCharacter: Character = {
      ...JSON.parse(JSON.stringify(charToDuplicate)),
      id: newId,
      name: `${charToDuplicate.name} (Copy)`,
      uuid: newUuid,  // New UUID for duplicate
      source: 'custom',  // Duplicates are always custom
    }
    
    // Copy metadata from original character, but verify idLinkedToName
    if (charToDuplicate.uuid) {
      const originalMetadata = getMetadata(charToDuplicate.uuid)
      // Check if the duplicate's ID matches its name-derived ID
      const expectedId = nameToId(newCharacter.name)
      const isLinked = newCharacter.id === expectedId
      setMetadata(newUuid, { ...originalMetadata, idLinkedToName: isLinked })
    } else {
      // Check if ID matches name-derived ID
      const expectedId = nameToId(newCharacter.name)
      const isLinked = newCharacter.id === expectedId
      setMetadata(newUuid, { idLinkedToName: isLinked })
    }
    
    const charIndex = characters.findIndex(c => c.id === characterId)
    const updatedCharacters = [...characters]
    updatedCharacters.splice(charIndex + 1, 0, newCharacter)
    setCharacters(updatedCharacters)
    
    try {
      const parsed = JSON.parse(jsonInput)
      if (Array.isArray(parsed)) {
        const jsonIndex = parsed.findIndex((item: any) => {
          if (typeof item === 'string') return item === characterId
          if (typeof item === 'object') return item.id === characterId
          return false
        })
        if (jsonIndex !== -1) {
          parsed.splice(jsonIndex + 1, 0, newCharacter)
          setJsonInput(JSON.stringify(parsed, null, 2))
        }
      }
    } catch (e) {
      console.error('Failed to update JSON:', e)
    }
    
    setSelectedCharacterUuid(newUuid)
    addToast(`Duplicated ${charToDuplicate.name}`, 'success')
    
    regenerateCharacterAndReminders(newCharacter, generationOptions)
      .then(({ characterToken, reminderTokens: newReminderTokens }) => {
        const updatedTokens = [...tokens, characterToken, ...newReminderTokens]
        setTokens(updatedTokens)
      })
      .catch((error) => {
        console.error('Failed to generate tokens for duplicated character:', error)
      })
  }

  const handleSelectMetaToken = (token: Token) => {
    setSelectedMetaToken(token)
    setSelectedCharacterUuid('') // Deselect character when viewing meta token
    setIsMetaSelected(true)
  }

  const handleSelectMeta = useCallback(() => {
    setSelectedMetaToken(null) // No specific token
    setSelectedCharacterUuid('') // Deselect character
    setIsMetaSelected(true)
  }, [])

  const handleApplyToScript = async () => {
    if (!editedCharacter) return
    
    setIsLoading(true)
    try {
      // Use originalCharacterUuidRef to find the character (in case ID was changed)
      const origUuid = originalCharacterUuidRef.current
      const origChar = characters.find(c => c.uuid === origUuid)
      const origId = origChar?.id || editedCharacter.id
      
      const updatedJson = updateCharacterInJson(jsonInput, origId, editedCharacter)
      setJsonInput(updatedJson)
      
      const updatedCharacters = characters.map(c => 
        c.uuid === origUuid ? editedCharacter : c
      )
      setCharacters(updatedCharacters)
      
      const { characterToken, reminderTokens: newReminderTokens } = await regenerateCharacterAndReminders(
        editedCharacter,
        generationOptions
      )
      
      const originalName = origChar?.name || editedCharacter.name
      
      const updatedTokens = tokens.filter(t => {
        if (t.type === 'character' && t.name === originalName) return false
        if (t.type === 'reminder' && t.parentCharacter === originalName) return false
        return true
      })
      
      updatedTokens.push(characterToken, ...newReminderTokens)
      setTokens(updatedTokens)
      
      setIsDirty(false)
      addToast(`Regenerated ${editedCharacter.name} tokens`, 'success')
    } catch (error) {
      console.error('Failed to apply changes:', error)
      addToast('Failed to apply changes to script', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownloadAll = async () => {
    if (!characterTokens.length) return
    
    setIsLoading(true)
    try {
      const charData = editedCharacter || selectedCharacter
      await downloadCharacterTokensAsZip(
        characterTokens[0],
        reminderTokens,
        selectedCharacter?.name || charData?.name || 'character',
        generationOptions.pngSettings,
        charData
      )
      addToast(`Downloaded ${selectedCharacter?.name} tokens`, 'success')
    } catch (error) {
      console.error('Failed to download tokens:', error)
      addToast('Failed to download tokens', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownloadCharacter = async () => {
    if (!characterTokens.length) return
    
    setIsLoading(true)
    try {
      await downloadCharacterTokenOnly(
        characterTokens[0],
        selectedCharacter?.name || 'character',
        generationOptions.pngSettings
      )
      addToast(`Downloaded ${selectedCharacter?.name} character token`, 'success')
    } catch (error) {
      console.error('Failed to download character token:', error)
      addToast('Failed to download character token', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownloadReminders = async () => {
    if (!reminderTokens.length) {
      addToast('No reminder tokens to download', 'warning')
      return
    }
    
    setIsLoading(true)
    try {
      await downloadReminderTokensOnly(
        reminderTokens,
        selectedCharacter?.name || 'character',
        generationOptions.pngSettings
      )
      addToast(`Downloaded ${selectedCharacter?.name} reminder tokens`, 'success')
    } catch (error) {
      console.error('Failed to download reminder tokens:', error)
      addToast('Failed to download reminder tokens', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownloadJson = () => {
    if (!editedCharacter && !selectedCharacter) return
    
    const charData = editedCharacter || selectedCharacter
    if (!charData) return
    
    const jsonText = JSON.stringify(charData, null, 2)
    const blob = new Blob([jsonText], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${charData.id || charData.name || 'character'}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    addToast(`Downloaded ${charData.name}.json`, 'success')
  }

  const displayCharacterToken = previewCharacterToken || characterTokens[0]
  const displayReminderTokens = previewReminderTokens.length > 0 ? previewReminderTokens : reminderTokens

  return (
    <div className={styles.customizeView}>
      <CharacterNavigation
        characters={characters}
        tokens={tokens}
        selectedCharacterUuid={selectedCharacterUuid}
        isMetaSelected={isMetaSelected}
        onSelectCharacter={handleSelectCharacter}
        onAddCharacter={() => {
          setSelectedCharacterUuid('')
          setEditedCharacter(null)
          setIsMetaSelected(false)
          setSelectedMetaToken(null)
        }}
        onDeleteCharacter={handleDeleteCharacter}
        onDuplicateCharacter={handleDuplicateCharacter}
        onSelectMetaToken={handleSelectMetaToken}
        onSelectMeta={handleSelectMeta}
        onChangeTeam={handleChangeTeam}
        onHoverCharacter={handleHoverCharacter}
      />

      <div className={styles.customizeMain}>
        {isMetaSelected ? (
          // Meta editor view
          <div className={styles.customizeContent}>
            <div className={styles.customizeLeft}>
              <div className={styles.customizeLeftContent}>
                {selectedMetaToken ? (
                  <div className={styles.metaTokenPreview}>
                    <img 
                      src={selectedMetaToken.canvas.toDataURL('image/png')} 
                      alt={selectedMetaToken.name}
                      className={styles.metaTokenImage}
                    />
                  </div>
                ) : (
                  <div className={styles.tokenPreviewPlaceholder}>
                    <span className={styles.metaPlaceholderIcon}>📜</span>
                    <p>Script Metadata</p>
                    <p className={styles.placeholderHint}>Edit your script's meta information on the right.</p>
                  </div>
                )}
              </div>
            </div>
            <div className={styles.customizeRight}>
              <MetaEditor 
                scriptMeta={scriptMeta}
                onMetaChange={(updatedMeta) => {
                  setScriptMeta(updatedMeta)
                  // Also update the master JSON
                  try {
                    if (jsonInput.trim()) {
                      const updatedJson = updateMetaInJson(jsonInput, updatedMeta)
                      setJsonInput(updatedJson)
                    }
                  } catch (e) {
                    console.error('Failed to update meta in JSON:', e)
                  }
                }}
              />
            </div>
          </div>
        ) : (
          // Character view
          <>
            {selectedCharacter ? (
              <div className={styles.customizeContent}>
                <div className={styles.customizeLeft}>
                  <div className={styles.customizeLeftContent}>
                    {displayCharacterToken ? (
                      <TokenPreview
                        characterToken={displayCharacterToken}
                        reminderTokens={displayReminderTokens}
                        onReminderClick={(reminder) => {
                          const parentCharName = reminder.parentCharacter
                          if (parentCharName) {
                            const char = characters.find(c => c.name === parentCharName)
                            if (char?.uuid) setSelectedCharacterUuid(char.uuid)
                          }
                        }}
                      />
                    ) : (
                      <div className={previewStyles.previewArea}>
                        <div className={previewStyles.preview}>
                          <div className={styles.tokenPreviewPlaceholder}>
                            <p>Token preview will appear here after generating.</p>
                            <p className={styles.placeholderHint}>Fill in character details on the right, then generate tokens.</p>
                          </div>
                        </div>
                        <div className={previewStyles.reminders}>
                          <h4>Reminder Tokens</h4>
                          <div className={previewStyles.galleryContainer}>
                            <button
                              type="button"
                              className={previewStyles.galleryArrow}
                              disabled
                              aria-label="Show previous reminder"
                            >
                              ‹
                            </button>
                            <div className={previewStyles.gallery}>
                              <div className={previewStyles.empty}>
                                <span className={previewStyles.emptyText}>No reminder tokens</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              className={previewStyles.galleryArrow}
                              disabled
                              aria-label="Show next reminder"
                            >
                              ›
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className={styles.customizeRight}>
                  <TokenEditor
                    character={selectedCharacter}
                    onEditChange={handleEditChange}
                    onReplaceCharacter={handleReplaceCharacter}
                    onRefreshPreview={regeneratePreview}
                    onPreviewVariant={handlePreviewVariant}
                    onDownloadAll={handleDownloadAll}
                    isOfficial={isSelectedCharacterOfficial}
                  />
                </div>
              </div>
            ) : (
              <div className={styles.customizeEmptyState}>
                <div className={styles.emptyStateContent}>
                  <h3>No Character Selected</h3>
                  <p>Create a new character or load a script to get started.</p>
                  <button
                    className="btn-primary"
                    onClick={handleAddCharacter}
                  >
                    ✨ Create Character
                  </button>
                  <button
                    className="btn-secondary"
                    disabled
                    style={{ marginLeft: '1.5rem', opacity: 0.5, cursor: 'not-allowed' }}
                  >
                    📚 Add Official Character
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
