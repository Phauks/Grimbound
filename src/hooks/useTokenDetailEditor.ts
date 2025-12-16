import { useState, useCallback, useEffect } from 'react'
import { useTokenContext } from '../contexts/TokenContext'
import {
  regenerateSingleToken,
  updateCharacterInJson,
  downloadCharacterTokensAsZip,
  getCharacterChanges,
} from '../ts/ui/detailViewUtils.js'
import { debounce, logger } from '../ts/utils/index.js'
import type { Character, Token } from '../ts/types/index.js'

interface UseTokenDetailEditorProps {
  character: Character
  characterToken: Token
  reminderTokens: Token[]
}

export function useTokenDetailEditor({
  character,
  characterToken,
  reminderTokens,
}: UseTokenDetailEditorProps) {
  const { generationOptions, setJsonInput, jsonInput } = useTokenContext()
  const [editedCharacter, setEditedCharacter] = useState<Character>(
    JSON.parse(JSON.stringify(character))
  )
  const [previewToken, setPreviewToken] = useState<Token>(characterToken)
  const [isDirty, setIsDirty] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)

  // Debounced regeneration function
  const regeneratePreview = useCallback(
    debounce(async (charToRegen: Character) => {
      try {
        setIsRegenerating(true)
        const newCanvas = await regenerateSingleToken(charToRegen, character, generationOptions)
        setPreviewToken({
          ...characterToken,
          canvas: newCanvas,
        })
      } catch (error) {
        logger.error('useTokenDetailEditor', 'Failed to regenerate preview:', error)
      } finally {
        setIsRegenerating(false)
      }
    }, 300),
    [character, characterToken, generationOptions]
  )

  const handleEditChange = useCallback(
    (field: keyof Character, value: Character[keyof Character]) => {
      const updated = { ...editedCharacter, [field]: value }
      setEditedCharacter(updated)
      setIsDirty(true)
      regeneratePreview(updated)
    },
    [editedCharacter, regeneratePreview]
  )

  const handleReset = useCallback(() => {
    const reset = JSON.parse(JSON.stringify(character))
    setEditedCharacter(reset)
    setPreviewToken(characterToken)
    setIsDirty(false)
  }, [character, characterToken])

  const handleApplyToScript = useCallback(async () => {
    try {
      const updated = updateCharacterInJson(jsonInput, character.id, editedCharacter)
      setJsonInput(updated)
      setIsDirty(false)
      logger.debug('useTokenDetailEditor', 'Character changes applied to script')
    } catch (error) {
      logger.error('useTokenDetailEditor', 'Failed to apply changes:', error)
    }
  }, [editedCharacter, character.id, jsonInput, setJsonInput])

  const handleDownloadAll = useCallback(async () => {
    try {
      await downloadCharacterTokensAsZip(
        previewToken, 
        reminderTokens, 
        character.name,
        generationOptions.pngSettings
      )
    } catch (error) {
      logger.error('useTokenDetailEditor', 'Failed to download tokens:', error)
    }
  }, [previewToken, reminderTokens, character.name, generationOptions.pngSettings])

  return {
    editedCharacter,
    previewToken,
    isDirty,
    isRegenerating,
    handleEditChange,
    handleReset,
    handleApplyToScript,
    handleDownloadAll,
  }
}
