import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useTokenContext } from '../../contexts/TokenContext'
import { useToast } from '../../contexts/ToastContext'
import { CharacterNavigation } from './CharacterNavigation'
import { TokenPreview } from './TokenPreview'
import { TokenEditor } from './TokenEditor'
import { ActionButtons } from './ActionButtons'
import { updateCharacterInJson, downloadCharacterTokensAsZip, downloadCharacterTokenOnly, downloadReminderTokensOnly, regenerateCharacterAndReminders } from '../../ts/ui/detailViewUtils'
import { generateRandomName, nameToId, generateUuid } from '../../ts/utils/nameGenerator'
import type { Token, Character } from '../../ts/types/index.js'
import styles from '../../styles/components/tokenDetail/TokenDetailModal.module.css'

interface TokenDetailModalProps {
  isOpen: boolean
  onClose: () => void
  initialToken?: Token
}

export function TokenDetailModal({ isOpen, onClose, initialToken }: TokenDetailModalProps) {
  const { characters, tokens, jsonInput, setJsonInput, setCharacters, setTokens, generationOptions, setMetadata, deleteMetadata, getMetadata, officialData } = useTokenContext()
  const { addToast } = useToast()
  
  // Determine the initial character ID from the clicked token
  // For character tokens, match by name; for reminder tokens, use parentCharacter (which is the character name)
  const getInitialCharacterId = () => {
    if (!initialToken) return characters[0]?.id || ''
    
    // If it's a reminder token, parentCharacter contains the character NAME (not ID)
    if (initialToken.parentCharacter) {
      const char = characters.find(c => c.name === initialToken.parentCharacter)
      if (char) return char.id
    }
    
    // If it's a character token, find the character by name
    if (initialToken.type === 'character') {
      const char = characters.find(c => c.name === initialToken.name)
      if (char) return char.id
    }
    
    return characters[0]?.id || ''
  }
  
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>(getInitialCharacterId())
  const [editedCharacter, setEditedCharacter] = useState<Character | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [previewCharacterToken, setPreviewCharacterToken] = useState<Token | null>(null)
  const [previewReminderTokens, setPreviewReminderTokens] = useState<Token[]>([])
  
  // Debounce timer for regeneration
  const regenerateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Debounce timer for immediate save
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Track previous character ID
  const previousCharacterIdRef = useRef<string>(selectedCharacterId)
  // Track original ID for finding character when ID changes
  const originalCharacterIdRef = useRef<string>(selectedCharacterId)
  // Ref for jsonInput to avoid dependency cycles
  const jsonInputRef = useRef(jsonInput)
  jsonInputRef.current = jsonInput
  // Ref for characters to avoid dependency cycles
  const charactersRef = useRef(characters)
  charactersRef.current = characters

  // Update selected character when modal opens with a new token
  useEffect(() => {
    if (isOpen && initialToken) {
      // parentCharacter contains the character NAME, not ID
      if (initialToken.parentCharacter) {
        const char = characters.find(c => c.name === initialToken.parentCharacter)
        if (char) setSelectedCharacterId(char.id)
      } else if (initialToken.type === 'character') {
        const char = characters.find(c => c.name === initialToken.name)
        if (char) setSelectedCharacterId(char.id)
      }
    }
  }, [isOpen, initialToken, characters])

  useEffect(() => {
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

  // Find the character token - match by UUID only (UUID is required on all characters)
  const characterTokens = useMemo(
    () => {
      const char = characters.find((c) => c.id === selectedCharacterId)
      if (!char?.uuid) return []
      return tokens.filter((t) => t.type === 'character' && t.parentUuid === char.uuid)
    },
    [tokens, selectedCharacterId, characters]
  )

  // Find reminder tokens - match by UUID only (UUID is required on all characters)
  const reminderTokens = useMemo(
    () => {
      const char = characters.find((c) => c.id === selectedCharacterId)
      if (!char?.uuid) return []
      return tokens.filter((t) => t.type === 'reminder' && t.parentUuid === char.uuid)
    },
    [tokens, selectedCharacterId, characters]
  )

  // Reset preview tokens when character changes
  useEffect(() => {
    setPreviewCharacterToken(null)
    setPreviewReminderTokens([])
  }, [selectedCharacterId])

  // Regeneration function
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

  // Regenerate on every edit
  useEffect(() => {
    if (!editedCharacter) return
    
    // Clear any existing timer
    if (regenerateTimerRef.current) {
      clearTimeout(regenerateTimerRef.current)
    }
    
    // Set a new debounced timer (300ms delay)
    regenerateTimerRef.current = setTimeout(() => {
      regeneratePreview()
    }, 300)
    
    return () => {
      if (regenerateTimerRef.current) {
        clearTimeout(regenerateTimerRef.current)
      }
    }
  }, [editedCharacter, regeneratePreview])

  // Immediate save: update JSON when edits happen
  useEffect(() => {
    if (!isDirty || !editedCharacter) return
    
    // Debounce save slightly to batch rapid changes
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }
    
    saveTimerRef.current = setTimeout(() => {
      // Update the JSON input with the edited character
      try {
        const origId = originalCharacterIdRef.current
        const updatedJson = updateCharacterInJson(jsonInputRef.current, origId, editedCharacter)
        setJsonInput(updatedJson)
        
        // Update the characters array in context using ref
        const updatedCharacters = charactersRef.current.map((c: Character) => 
          c.id === origId ? editedCharacter : c
        )
        setCharacters(updatedCharacters)
        
        // If ID changed, update refs
        if (editedCharacter.id !== origId) {
          setSelectedCharacterId(editedCharacter.id)
          originalCharacterIdRef.current = editedCharacter.id
          previousCharacterIdRef.current = editedCharacter.id
        }
        
        // Mark as clean since we saved
        setIsDirty(false)
      } catch (error) {
        console.error('Save failed:', error)
      }
    }, 100)
    
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
    }
  }, [isDirty, editedCharacter, setJsonInput, setCharacters])

  // Handle character selection
  // Must be defined before early return to follow rules of hooks
  const handleSelectCharacter = useCallback((newCharacterId: string) => {
    previousCharacterIdRef.current = newCharacterId
    originalCharacterIdRef.current = newCharacterId
    setSelectedCharacterId(newCharacterId)
  }, [])

  if (!isOpen) return null

  const handleEditChange = (field: keyof Character, value: any) => {
    setEditedCharacter(prev => {
      // Use previous state if available, otherwise fall back to finding the character
      const currentChar = prev || characters.find((c) => c.id === selectedCharacterId)
      if (currentChar) {
        return {
          ...currentChar,
          [field]: value,
        }
      }
      return prev
    })
    setIsDirty(true)
  }

  const handleReplaceCharacter = (newCharacter: Character) => {
    setEditedCharacter(newCharacter)
    setIsDirty(true)
  }

  // Strip internal fields (uuid) from character for clean JSON export
  const getExportableCharacter = (char: Character): Omit<Character, 'uuid'> => {
    const { uuid, ...exportable } = char
    return exportable
  }

  const handleDownloadJson = () => {
    if (!editedCharacter && !selectedCharacter) return
    
    const charData = editedCharacter || selectedCharacter
    if (!charData) return
    
    // Export clean JSON without internal fields
    const exportable = getExportableCharacter(charData)
    const jsonText = JSON.stringify(exportable, null, 2)
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

  const handleAddCharacter = () => {
    // Create a new blank character with a unique ID
    const randomName = generateRandomName()
    const newId = nameToId(randomName)
    const newUuid = generateUuid()
    const newCharacter: Character = {
      id: newId,
      name: randomName,
      team: 'townsfolk',
      ability: '',
      image: '',
      reminders: [],
      uuid: newUuid,
    }
    
    // Initialize metadata with default idLinkedToName: true
    setMetadata(newUuid, { idLinkedToName: true })
    
    // Add to characters array
    const updatedCharacters = [...characters, newCharacter]
    setCharacters(updatedCharacters)
    
    // Update JSON
    try {
      const parsed = JSON.parse(jsonInput)
      if (Array.isArray(parsed)) {
        parsed.push(newCharacter)
        setJsonInput(JSON.stringify(parsed, null, 2))
      }
    } catch (e) {
      console.error('Failed to update JSON:', e)
    }
    
    // Select the new character
    setSelectedCharacterId(newId)
    addToast('New character added', 'success')
  }

  const handleDeleteCharacter = (characterId?: string) => {
    const idToDelete = characterId || selectedCharacterId
    if (!idToDelete || characters.length <= 1) {
      addToast('Cannot delete the last character', 'error')
      return
    }
    
    const charToDelete = characters.find(c => c.id === idToDelete)
    if (!charToDelete) return
    
    // Delete metadata for this character
    if (charToDelete.uuid) {
      deleteMetadata(charToDelete.uuid)
    }
    
    // Remove from characters array
    const updatedCharacters = characters.filter(c => c.id !== idToDelete)
    setCharacters(updatedCharacters)
    
    // Remove associated tokens
    const updatedTokens = tokens.filter(t => {
      if (t.type === 'character' && t.name === charToDelete.name) return false
      if (t.type === 'reminder' && t.parentCharacter === charToDelete.name) return false
      return true
    })
    setTokens(updatedTokens)
    
    // Update JSON
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
    
    // Select first remaining character if deleting the selected one
    if (idToDelete === selectedCharacterId && updatedCharacters.length > 0) {
      setSelectedCharacterId(updatedCharacters[0].id)
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
    
    // Add to characters array
    const charIndex = characters.findIndex(c => c.id === characterId)
    const updatedCharacters = [...characters]
    updatedCharacters.splice(charIndex + 1, 0, newCharacter)
    setCharacters(updatedCharacters)
    
    // Update JSON
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
    
    // Select the new character immediately
    setSelectedCharacterId(newId)
    addToast(`Duplicated ${charToDuplicate.name}`, 'success')
    
    // Generate tokens for the new character asynchronously (don't block UI)
    regenerateCharacterAndReminders(newCharacter, generationOptions)
      .then(({ characterToken, reminderTokens: newReminderTokens }) => {
        // Add the new tokens to the tokens array
        setTokens([...tokens, characterToken, ...newReminderTokens])
      })
      .catch((error) => {
        console.error('Failed to generate tokens for duplicated character:', error)
      })
  }

  const handleSelectMetaToken = (token: Token) => {
    // For meta tokens, we can show a simple preview or download option
    // Since meta tokens aren't editable like characters, just provide visual feedback
    addToast(`Selected: ${token.name}`, 'info')
  }

  const handleApplyToScript = async () => {
    if (!editedCharacter) return
    
    setIsLoading(true)
    try {
      // Update the JSON input with the edited character
      const updatedJson = updateCharacterInJson(jsonInput, selectedCharacterId, editedCharacter)
      setJsonInput(updatedJson)
      
      // Update the characters array in context
      const updatedCharacters = characters.map(c => 
        c.id === selectedCharacterId ? editedCharacter : c
      )
      setCharacters(updatedCharacters)
      
      // Regenerate only this character's tokens (character + reminders)
      const { characterToken, reminderTokens } = await regenerateCharacterAndReminders(
        editedCharacter,
        generationOptions
      )
      
      // Get the original character name to filter out old tokens
      const originalChar = characters.find(c => c.id === selectedCharacterId)
      const originalName = originalChar?.name || editedCharacter.name
      
      // Update tokens array: remove old tokens for this character, add new ones
      const updatedTokens = tokens.filter(t => {
        // Keep tokens that are not related to this character
        if (t.type === 'character' && t.name === originalName) return false
        if (t.type === 'reminder' && t.parentCharacter === originalName) return false
        return true
      })
      
      // Add the new tokens
      updatedTokens.push(characterToken, ...reminderTokens)
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
        selectedCharacter?.name || selectedCharacterId,
        generationOptions.pngSettings,
        charData  // Include character JSON in ZIP
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

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleEscapeKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  // Use preview tokens if available (from live update), otherwise use stored tokens
  const displayCharacterToken = previewCharacterToken || characterTokens[0]
  const displayReminderTokens = previewReminderTokens.length > 0 ? previewReminderTokens : reminderTokens

  return (
    <div
      className={styles.modal}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tokenDetailTitle"
      onKeyDown={handleEscapeKey}
    >
      <div className={styles.backdrop} onClick={handleBackdropClick} />
      <div className={styles.wrapper}>
        <CharacterNavigation
          characters={characters}
          tokens={tokens}
          selectedCharacterId={selectedCharacterId}
          officialCharacterIds={useMemo(() => new Set(officialData.map(c => c.id)), [officialData])}
          onSelectCharacter={handleSelectCharacter}
          onAddCharacter={handleAddCharacter}
          onDeleteCharacter={handleDeleteCharacter}
          onDuplicateCharacter={handleDuplicateCharacter}
          onSelectMetaToken={handleSelectMetaToken}
        />

        <div className={styles.main}>
          <header className={styles.header}>
            <h2 id="tokenDetailTitle">{selectedCharacter?.name || 'Token Details'}</h2>
            <ActionButtons
              isLoading={isLoading}
              hasReminderTokens={displayReminderTokens.length > 0}
              onDownloadAll={handleDownloadAll}
              onDownloadCharacter={handleDownloadCharacter}
              onDownloadReminders={handleDownloadReminders}
              onDownloadJson={handleDownloadJson}
            />
            <button
              type="button"
              className={styles.closeBtn}
              onClick={onClose}
              aria-label="Close detail view"
            >
              ×
            </button>
          </header>

          {selectedCharacter && displayCharacterToken && (
            <div className={styles.content}>
              {/* Left column: Token preview + reminders */}
              <div className={styles.left}>
                <TokenPreview
                  characterToken={displayCharacterToken}
                  reminderTokens={displayReminderTokens}
                  onReminderClick={(reminder) => {
                    // parentCharacter contains the character NAME, find the character by name
                    const parentCharName = reminder.parentCharacter
                    if (parentCharName) {
                      const char = characters.find(c => c.name === parentCharName)
                      if (char) setSelectedCharacterId(char.id)
                    }
                  }}
                />
              </div>

              {/* Right column: Editor */}
              <div className={styles.right}>
                <TokenEditor 
                  character={selectedCharacter} 
                  onEditChange={handleEditChange}
                  onReplaceCharacter={handleReplaceCharacter}
                  onRefreshPreview={regeneratePreview}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}