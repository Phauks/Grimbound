import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useTokenContext } from '../../contexts/TokenContext'
import { useToast } from '../../contexts/ToastContext'
import { CharacterNavigation } from '../TokenDetailView/CharacterNavigation'
import { TokenPreview } from '../TokenDetailView/TokenPreview'
import { TokenEditor } from '../TokenDetailView/TokenEditor'
import { MetaEditor } from '../TokenDetailView/MetaEditor'
import { updateCharacterInJson, updateMetaInJson, downloadCharacterTokensAsZip, downloadCharacterTokenOnly, downloadReminderTokensOnly, regenerateCharacterAndReminders } from '../../ts/ui/detailViewUtils'
import { generateRandomName, nameToId, generateUuid } from '../../ts/utils/nameGenerator'
import { getPreRenderedTokens } from '../../utils/customizePreRenderCache'
import styles from '../../styles/components/views/Views.module.css'
import previewStyles from '../../styles/components/tokenDetail/TokenPreview.module.css'
import type { Token, Character, Team, ScriptMeta } from '../../ts/types/index.js'

interface CustomizeViewProps {
  initialToken?: Token
  selectedCharacterId?: string
  onCharacterSelect?: (characterId: string) => void
  onGoToGallery?: () => void
  createNewCharacter?: boolean
}

export function CustomizeView({ initialToken, selectedCharacterId: externalSelectedId, onCharacterSelect, onGoToGallery, createNewCharacter }: CustomizeViewProps) {
  const { characters, tokens, jsonInput, setJsonInput, setCharacters, setTokens, generationOptions, setMetadata, deleteMetadata, getMetadata, scriptMeta, setScriptMeta, officialData } = useTokenContext()
  const { addToast } = useToast()
  
  // Check if initialToken is a meta token
  const isMetaToken = (token?: Token) => {
    return token && token.type !== 'character' && token.type !== 'reminder'
  }
  
  // Determine the initial character ID from the clicked token or external prop
  const getInitialCharacterId = () => {
    // If initial token is a meta token, don't select any character
    if (isMetaToken(initialToken)) return ''
    
    if (externalSelectedId) return externalSelectedId
    if (!initialToken) return characters[0]?.id || ''
    
    if (initialToken.parentCharacter) {
      const char = characters.find(c => c.name === initialToken.parentCharacter)
      if (char) return char.id
    }
    
    if (initialToken.type === 'character') {
      const char = characters.find(c => c.name === initialToken.name)
      if (char) return char.id
    }
    
    return characters[0]?.id || ''
  }
  
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>(getInitialCharacterId())
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
    const initialCharId = getInitialCharacterId()
    if (initialCharId && !isMetaToken(initialToken)) {
      const cached = getPreRenderedTokens(initialCharId, generationOptions)
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
    const initialCharId = getInitialCharacterId()
    if (initialCharId && !isMetaToken(initialToken)) {
      const cached = getPreRenderedTokens(initialCharId, generationOptions)
      if (cached) return cached.reminderTokens
    }
    return []
  }
  
  // Initialize preview with the clicked token from gallery, or pre-rendered from tab hover
  const [previewCharacterToken, setPreviewCharacterToken] = useState<Token | null>(getInitialPreviewToken)
  // Initialize reminder tokens from gallery tokens or pre-render cache
  const [previewReminderTokens, setPreviewReminderTokens] = useState<Token[]>(getInitialReminderTokens)
  
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const previousCharacterIdRef = useRef<string>(selectedCharacterId)
  const hasCreatedNewCharacterRef = useRef(false)
  // Pre-render cache for hover optimization
  const preRenderCacheRef = useRef<Map<string, { characterToken: Token; reminderTokens: Token[] }>>(new Map())
  const preRenderingRef = useRef<Set<string>>(new Set())
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Skip regeneration for a specific character ID when we just applied cached tokens
  // Initialize with the initial character ID if coming from gallery with a token OR from shared pre-render cache
  const skipRegenerateForIdRef = useRef<string | null>((() => {
    if (initialToken?.type === 'character') return getInitialCharacterId()
    // Also skip if we got tokens from shared pre-render cache
    const initialCharId = getInitialCharacterId()
    if (initialCharId && getPreRenderedTokens(initialCharId, generationOptions)) {
      return initialCharId
    }
    return null
  })())
  // Track the original ID when we started editing (for finding character in list when ID changes)
  const originalCharacterIdRef = useRef<string>(selectedCharacterId)
  // Track character UUID for preview clearing (only clear when switching to a different character)
  const previousCharacterUuidRef = useRef<string | undefined>(undefined)
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
      }
      
      // Initialize metadata with default idLinkedToName: true
      setMetadata(newUuid, { idLinkedToName: true })
      
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
      
      setSelectedCharacterId(newId)
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

  // Sync with external selected ID
  useEffect(() => {
    if (externalSelectedId && externalSelectedId !== selectedCharacterId) {
      setSelectedCharacterId(externalSelectedId)
    }
  }, [externalSelectedId])

  // Notify parent of character selection changes
  useEffect(() => {
    if (onCharacterSelect && selectedCharacterId) {
      onCharacterSelect(selectedCharacterId)
    }
  }, [selectedCharacterId, onCharacterSelect])

  useEffect(() => {
    // Skip if we just saved - the editedCharacter is already up to date
    if (justSavedRef.current) {
      justSavedRef.current = false
      return
    }
    if (selectedCharacterId && characters.length > 0) {
      const char = characters.find((c) => c.id === selectedCharacterId)
      if (char) {
        setEditedCharacter(JSON.parse(JSON.stringify(char)))
        setIsDirty(false)
      }
    }
  }, [selectedCharacterId, characters])

  const selectedCharacter = useMemo(
    () => editedCharacter || characters.find((c) => c.id === selectedCharacterId),
    [editedCharacter, selectedCharacterId, characters]
  )

  // Check if selected character is official
  const isSelectedCharacterOfficial = useMemo(() => {
    if (!selectedCharacter) return false
    return officialData.some(official => official.id === selectedCharacter.id)
  }, [selectedCharacter, officialData])

  // Match by UUID only (UUID is required on all characters)
  const characterTokens = useMemo(
    () => {
      const char = characters.find((c) => c.id === selectedCharacterId)
      if (!char?.uuid) return []
      return tokens.filter((t) => t.type === 'character' && t.parentUuid === char.uuid)
    },
    [tokens, selectedCharacterId, characters]
  )

  // Match by UUID only (UUID is required on all characters)
  const reminderTokens = useMemo(
    () => {
      const char = characters.find((c) => c.id === selectedCharacterId)
      if (!char?.uuid) return []
      return tokens.filter((t) => t.type === 'reminder' && t.parentUuid === char.uuid)
    },
    [tokens, selectedCharacterId, characters]
  )

  // Track previous character for reference updates (but don't clear preview tokens)
  // Preview tokens are now directly replaced by new generation, no need to clear
  const prevSelectedIdRef = useRef<string>(selectedCharacterId)
  useEffect(() => {
    const currentChar = characters.find(c => c.id === selectedCharacterId)
    const currentUuid = currentChar?.uuid
    
    // Update refs for tracking
    prevSelectedIdRef.current = selectedCharacterId
    if (currentUuid) {
      previousCharacterUuidRef.current = currentUuid
    }
  }, [selectedCharacterId, characters])

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
    if (skipRegenerateForIdRef.current === editedCharacter.id) {
      skipRegenerateForIdRef.current = null
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
        
        // Use originalCharacterIdRef to find the character (in case ID was changed)
        const origId = originalCharacterIdRef.current
        // Use ref to get current jsonInput without causing dependency cycle
        const updatedJson = updateCharacterInJson(jsonInputRef.current, origId, editedCharacter)
        setJsonInput(updatedJson)
        // Use ref to get current characters without causing dependency cycle
        const updatedChars = charactersRef.current.map(c => 
          c.id === origId ? editedCharacter : c
        )
        setCharacters(updatedChars)
        
        // If ID changed, update selectedCharacterId and originalCharacterIdRef
        if (editedCharacter.id !== origId) {
          setSelectedCharacterId(editedCharacter.id)
          originalCharacterIdRef.current = editedCharacter.id
          previousCharacterIdRef.current = editedCharacter.id
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
  const handleHoverCharacter = useCallback((characterId: string) => {
    // Clear any pending hover timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    
    // Skip if already selected, cached, or currently rendering
    if (characterId === selectedCharacterId) return
    if (preRenderCacheRef.current.has(characterId)) return
    if (preRenderingRef.current.has(characterId)) return
    
    // Small delay to avoid pre-rendering on quick mouse-overs
    hoverTimeoutRef.current = setTimeout(() => {
      const char = characters.find(c => c.id === characterId)
      if (!char) return
      
      // Double-check still not cached/rendering after delay
      if (preRenderCacheRef.current.has(characterId)) return
      if (preRenderingRef.current.has(characterId)) return
      
      preRenderingRef.current.add(characterId)
      
      regenerateCharacterAndReminders(char, generationOptions)
        .then(({ characterToken, reminderTokens }) => {
          preRenderCacheRef.current.set(characterId, { characterToken, reminderTokens })
        })
        .catch((err) => console.error('Pre-render failed:', err))
        .finally(() => {
          preRenderingRef.current.delete(characterId)
        })
    }, 100) // 100ms delay
  }, [characters, generationOptions, selectedCharacterId])

  const handleSelectCharacter = useCallback((newCharacterId: string) => {
    // Clear hover timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
    
    previousCharacterIdRef.current = newCharacterId
    originalCharacterIdRef.current = newCharacterId // Reset original ID when switching characters
    setSelectedCharacterId(newCharacterId)
    setSelectedMetaToken(null) // Clear meta token selection when selecting character
    setIsMetaSelected(false) // Clear meta selection when selecting character
    
    // Check pre-render cache for instant display
    const cached = preRenderCacheRef.current.get(newCharacterId)
    if (cached) {
      setPreviewCharacterToken(cached.characterToken)
      setPreviewReminderTokens(cached.reminderTokens)
      // Remove from cache after use
      preRenderCacheRef.current.delete(newCharacterId)
      // Skip the next regeneration for this specific character since we already have the tokens
      skipRegenerateForIdRef.current = newCharacterId
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
      preRenderCacheRef.current.delete(selectedCharacterId)
    }
  }

  const handleReplaceCharacter = (newCharacter: Character) => {
    setEditedCharacter(newCharacter)
    setIsDirty(true)
  }

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

    // If this was the selected character, update its edited state
    if (characterId === selectedCharacterId && editedCharacter) {
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
    }
    
    // Initialize metadata with default idLinkedToName: true
    setMetadata(newUuid, { idLinkedToName: true })
    
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
    
    setSelectedCharacterId(newId)
    setEditedCharacter(newCharacter)
    originalCharacterIdRef.current = newId
    
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

  const handleDeleteCharacter = (characterId?: string) => {
    const idToDelete = characterId || selectedCharacterId
    if (!idToDelete) {
      return
    }
    
    const charToDelete = characters.find(c => c.id === idToDelete)
    if (!charToDelete) return
    
    // Delete metadata for this character
    if (charToDelete.uuid) {
      deleteMetadata(charToDelete.uuid)
    }
    
    const updatedCharacters = characters.filter(c => c.id !== idToDelete)
    setCharacters(updatedCharacters)
    
    // Filter tokens by UUID
    const updatedTokens = tokens.filter(t => t.parentUuid !== charToDelete.uuid)
    setTokens(updatedTokens)
    
    try {
      const parsed = JSON.parse(jsonInput)
      if (Array.isArray(parsed)) {
        const updatedParsed = parsed.filter((item: any) => {
          if (typeof item === 'string') return item !== idToDelete
          if (typeof item === 'object') return item.id !== idToDelete
          return true
        })
        setJsonInput(JSON.stringify(updatedParsed, null, 2))
      }
    } catch (e) {
      console.error('Failed to update JSON:', e)
    }
    
    if (idToDelete === selectedCharacterId) {
      if (updatedCharacters.length > 0) {
        setSelectedCharacterId(updatedCharacters[0].id)
      } else {
        setSelectedCharacterId('')
        setEditedCharacter(null)
      }
    }
    
    addToast(`Deleted ${charToDelete.name}`, 'success')
  }

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
    }
    
    // Copy metadata from original character
    if (charToDuplicate.uuid) {
      const originalMetadata = getMetadata(charToDuplicate.uuid)
      setMetadata(newUuid, { ...originalMetadata })
    } else {
      setMetadata(newUuid, { idLinkedToName: true })
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
    
    setSelectedCharacterId(newId)
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
    setSelectedCharacterId('') // Deselect character when viewing meta token
    setIsMetaSelected(true)
  }

  const handleSelectMeta = useCallback(() => {
    setSelectedMetaToken(null) // No specific token
    setSelectedCharacterId('') // Deselect character
    setIsMetaSelected(true)
  }, [])

  const handleApplyToScript = async () => {
    if (!editedCharacter) return
    
    setIsLoading(true)
    try {
      // Use originalCharacterIdRef to find the character (in case ID was changed)
      const origId = originalCharacterIdRef.current
      const updatedJson = updateCharacterInJson(jsonInput, origId, editedCharacter)
      setJsonInput(updatedJson)
      
      const updatedCharacters = characters.map(c => 
        c.id === origId ? editedCharacter : c
      )
      setCharacters(updatedCharacters)
      
      const { characterToken, reminderTokens: newReminderTokens } = await regenerateCharacterAndReminders(
        editedCharacter,
        generationOptions
      )
      
      const originalChar = characters.find(c => c.id === origId)
      const originalName = originalChar?.name || editedCharacter.name
      
      const updatedTokens = tokens.filter(t => {
        if (t.type === 'character' && t.name === originalName) return false
        if (t.type === 'reminder' && t.parentCharacter === originalName) return false
        return true
      })
      
      updatedTokens.push(characterToken, ...newReminderTokens)
      setTokens(updatedTokens)
      
      // If ID changed, update selectedCharacterId and originalCharacterIdRef
      if (editedCharacter.id !== origId) {
        setSelectedCharacterId(editedCharacter.id)
        originalCharacterIdRef.current = editedCharacter.id
        previousCharacterIdRef.current = editedCharacter.id
      }
      
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
        selectedCharacter?.name || selectedCharacterId,
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
        selectedCharacter?.name || selectedCharacterId,
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
        selectedCharacter?.name || selectedCharacterId,
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
        selectedCharacterId={selectedCharacterId}
        isMetaSelected={isMetaSelected}
        officialCharacterIds={useMemo(() => new Set(officialData.map(c => c.id)), [officialData])}
        onSelectCharacter={handleSelectCharacter}
        onAddCharacter={() => {
          setSelectedCharacterId('')
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
                            if (char) setSelectedCharacterId(char.id)
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
