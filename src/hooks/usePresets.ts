import { useCallback } from 'react'
import { useTokenContext } from '../contexts/TokenContext'
import { getPreset } from '../ts/generation/presets.js'
import { sanitizeFilename, generateUuid, STORAGE_KEYS, getStorageItem, setStorageItem, removeStorageItem, logger } from '../ts/utils/index.js'
import type { GenerationOptions, PresetName } from '../ts/types/index.js'

export interface CustomPreset {
  id: string
  name: string
  description: string
  icon: string
  settings: GenerationOptions
}

/**
 * Helper to save presets to localStorage
 * Centralizes the localStorage.setItem call to avoid duplication
 */
function savePresetsToStorage(presets: CustomPreset[]): void {
  setStorageItem(STORAGE_KEYS.CUSTOM_PRESETS, JSON.stringify(presets))
}

export function usePresets() {
  const { updateGenerationOptions, generationOptions } = useTokenContext()

  const applyPreset = useCallback(
    (presetName: PresetName) => {
      try {
        const preset = getPreset(presetName)
        if (preset) {
          updateGenerationOptions(preset.settings)
          return presetName
        }
      } catch (err) {
        logger.error('usePresets', `Failed to apply preset ${presetName}:`, err)
      }
      return null
    },
    [updateGenerationOptions]
  )

  const getCustomPresets = useCallback((): CustomPreset[] => {
    try {
      // Try new key first, then fallback to old key for migration
      let data = getStorageItem(STORAGE_KEYS.CUSTOM_PRESETS)
      if (!data) {
        // Check old key and migrate if found
        const oldData = getStorageItem(STORAGE_KEYS.LEGACY_PRESETS)
        if (oldData) {
          setStorageItem(STORAGE_KEYS.CUSTOM_PRESETS, oldData)
          removeStorageItem(STORAGE_KEYS.LEGACY_PRESETS)
          data = oldData
        }
      }
      return data ? JSON.parse(data) : []
    } catch {
      return []
    }
  }, [])

  const setDefaultPreset = useCallback((presetId: string) => {
    try {
      setStorageItem(STORAGE_KEYS.DEFAULT_PRESET, presetId)
    } catch (err) {
      logger.error('usePresets', 'Failed to set default preset:', err)
    }
  }, [])

  const getDefaultPresetId = useCallback((): string => {
    return getStorageItem(STORAGE_KEYS.DEFAULT_PRESET) || 'classic'
  }, [])

  const saveCustomPreset = useCallback(
    (name: string, description: string, icon: string) => {
      try {
        const presets = getCustomPresets()
        const customPreset: CustomPreset = {
          id: `custom_${generateUuid()}`,
          name,
          description,
          icon,
          settings: generationOptions,
        }
        presets.push(customPreset)
        savePresetsToStorage(presets)
        return customPreset
      } catch (err) {
        logger.error('usePresets', 'Failed to save custom preset:', err)
        throw err
      }
    },
    [generationOptions, getCustomPresets]
  )

  const deleteCustomPreset = useCallback((presetId: string) => {
    try {
      const presets = getCustomPresets()
      const filtered = presets.filter((p: CustomPreset) => p.id !== presetId)
      savePresetsToStorage(filtered)
      
      // If deleted preset was default, reset to classic
      if (getDefaultPresetId() === presetId) {
        setDefaultPreset('classic')
      }
    } catch (err) {
      logger.error('usePresets', 'Failed to delete custom preset:', err)
      throw err
    }
  }, [getCustomPresets, getDefaultPresetId, setDefaultPreset])

  const applyCustomPreset = useCallback(
    (preset: CustomPreset) => {
      try {
        updateGenerationOptions(preset.settings)
        return preset.id
      } catch (err) {
        logger.error('usePresets', `Failed to apply custom preset ${preset.name}:`, err)
      }
      return null
    },
    [updateGenerationOptions]
  )

  const updateCustomPreset = useCallback(
    (presetId: string) => {
      try {
        const presets = getCustomPresets()
        const index = presets.findIndex((p: CustomPreset) => p.id === presetId)
        if (index !== -1) {
          presets[index].settings = generationOptions
          savePresetsToStorage(presets)
          return true
        }
        return false
      } catch (err) {
        logger.error('usePresets', 'Failed to update custom preset:', err)
        return false
      }
    },
    [generationOptions, getCustomPresets]
  )

  const duplicateCustomPreset = useCallback(
    (preset: CustomPreset) => {
      try {
        const presets = getCustomPresets()
        const newPreset: CustomPreset = {
          id: `custom_${generateUuid()}`,
          name: `${preset.name} (Copy)`,
          description: preset.description,
          icon: preset.icon,
          settings: { ...preset.settings },
        }
        presets.push(newPreset)
        savePresetsToStorage(presets)
        return newPreset
      } catch (err) {
        logger.error('usePresets', 'Failed to duplicate preset:', err)
        throw err
      }
    },
    [getCustomPresets]
  )

  const duplicateBuiltInPreset = useCallback(
    (presetName: PresetName) => {
      try {
        const builtInPreset = getPreset(presetName)
        const presets = getCustomPresets()
        const newPreset: CustomPreset = {
          id: `custom_${generateUuid()}`,
          name: `${builtInPreset.name} (Copy)`,
          description: builtInPreset.description,
          icon: builtInPreset.icon,
          settings: { ...builtInPreset.settings } as GenerationOptions,
        }
        presets.push(newPreset)
        savePresetsToStorage(presets)
        return newPreset
      } catch (err) {
        logger.error('usePresets', 'Failed to duplicate built-in preset:', err)
        throw err
      }
    },
    [getCustomPresets]
  )

  const editPreset = useCallback(
    (presetId: string, name: string, icon: string, description?: string) => {
      try {
        const presets = getCustomPresets()
        const index = presets.findIndex((p: CustomPreset) => p.id === presetId)
        if (index !== -1) {
          presets[index].name = name
          presets[index].icon = icon
          if (description !== undefined) {
            presets[index].description = description
          }
          savePresetsToStorage(presets)
          return true
        }
        return false
      } catch (err) {
        logger.error('usePresets', 'Failed to edit preset:', err)
        return false
      }
    },
    [getCustomPresets]
  )

  const loadDefaultPreset = useCallback(() => {
    try {
      const defaultPresetId = getDefaultPresetId()
      
      // Check if it's a built-in preset
      if (['classic', 'fullbloom', 'minimal'].includes(defaultPresetId)) {
        return applyPreset(defaultPresetId as PresetName)
      }
      
      // Check custom presets
      const presets = getCustomPresets()
      const preset = presets.find((p: CustomPreset) => p.id === defaultPresetId)
      if (preset) {
        return applyCustomPreset(preset)
      }
      
      // Fallback to classic
      return applyPreset('classic')
    } catch (err) {
      logger.error('usePresets', 'Failed to load default preset:', err)
      return null
    }
  }, [applyPreset, applyCustomPreset, getCustomPresets, getDefaultPresetId])

  const exportPreset = useCallback((preset: CustomPreset) => {
    try {
      const dataStr = JSON.stringify(preset, null, 2)
      const blob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${sanitizeFilename(preset.name)}_preset.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      logger.error('usePresets', 'Failed to export preset:', err)
      throw err
    }
  }, [])

  const importPreset = useCallback(
    (file: File): Promise<CustomPreset> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const content = e.target?.result as string
            const imported = JSON.parse(content) as CustomPreset
            
            // Validate the imported preset has required fields
            if (!imported.name || !imported.settings) {
              throw new Error('Invalid preset file: missing required fields')
            }
            
            // Create new preset with fresh ID
            const presets = getCustomPresets()
            const newPreset: CustomPreset = {
              id: `custom_${generateUuid()}`,
              name: imported.name,
              description: imported.description || '',
              icon: imported.icon || '📥',
              settings: imported.settings,
            }
            presets.push(newPreset)
            savePresetsToStorage(presets)
            resolve(newPreset)
          } catch (err) {
            reject(err)
          }
        }
        reader.onerror = () => reject(new Error('Failed to read file'))
        reader.readAsText(file)
      })
    },
    [getCustomPresets]
  )

  const reorderPresets = useCallback(
    (fromIndex: number, toIndex: number) => {
      try {
        const presets = getCustomPresets()
        if (fromIndex < 0 || fromIndex >= presets.length || toIndex < 0 || toIndex >= presets.length) {
          return false
        }
        const [removed] = presets.splice(fromIndex, 1)
        presets.splice(toIndex, 0, removed)
        savePresetsToStorage(presets)
        return true
      } catch (err) {
        logger.error('usePresets', 'Failed to reorder presets:', err)
        return false
      }
    },
    [getCustomPresets]
  )

  return {
    applyPreset,
    saveCustomPreset,
    deleteCustomPreset,
    getCustomPresets,
    applyCustomPreset,
    updateCustomPreset,
    duplicateCustomPreset,
    duplicateBuiltInPreset,
    editPreset,
    setDefaultPreset,
    getDefaultPresetId,
    loadDefaultPreset,
    exportPreset,
    importPreset,
    reorderPresets,
  }
}
