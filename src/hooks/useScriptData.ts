import { useCallback, useEffect, useRef } from 'react'
import { useTokenContext } from '../contexts/TokenContext'
import { useDataSync } from '../contexts/DataSyncContext'
import { loadExampleScript } from '../ts/data/dataLoader.js'
import { validateAndParseScript, extractScriptMeta } from '../ts/data/scriptParser.js'
import { validateJson, logger } from '../ts/utils/index.js'
import { characterLookup } from '../ts/data/characterLookup.js'
import { nameToId } from '../ts/utils/nameGenerator'
import type { SyncEvent } from '../ts/sync/index.js'

export function useScriptData() {
  const {
    setJsonInput,
    setCharacters,
    setOfficialData,
    setScriptMeta,
    setError,
    setIsLoading,
    setWarnings,
    officialData,
    clearAllMetadata,
    setMetadata,
    setTokens,
    jsonInput,
  } = useTokenContext()

  const { getCharacters, isInitialized, subscribeToEvents } = useDataSync()
  
  // Track if we've loaded official data to avoid double-loading
  const hasLoadedRef = useRef(false)

  // Update character lookup service when official data changes
  useEffect(() => {
    if (officialData.length > 0) {
      characterLookup.updateCharacters(officialData)
      logger.debug('useScriptData', 'Updated character lookup with', officialData.length, 'characters')
    }
  }, [officialData])

  const loadScript = useCallback(
    async (jsonString: string) => {
      try {
        setIsLoading(true)
        setError(null)
        setWarnings([])

        // Validate JSON syntax
        const validation = validateJson(jsonString)
        if (!validation.valid) {
          setError(validation.error || 'Invalid JSON')
          return
        }

        // Parse the script data with lenient validation
        const parsed = JSON.parse(jsonString)
        const { characters: scriptChars, warnings } = await validateAndParseScript(parsed, officialData)

        // Extract metadata if present
        const meta = extractScriptMeta(parsed)

        // Clear existing metadata when loading a new script
        // (getMetadata will compute correct defaults based on character id/name)
        clearAllMetadata()

        // Update state
        setJsonInput(jsonString)
        setCharacters(scriptChars)
        setScriptMeta(meta)
        setWarnings(warnings)
        setError(null)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load script'
        setError(errorMessage)
        logger.error('useScriptData', 'Script loading error:', err)
      } finally {
        setIsLoading(false)
      }
    },
    [setJsonInput, setCharacters, setScriptMeta, setError, setIsLoading, setWarnings, officialData, clearAllMetadata, setMetadata]
  )

  const loadOfficialData = useCallback(async () => {
    try {
      if (!isInitialized) {
        logger.debug('useScriptData', 'Sync service not initialized yet, skipping load')
        return []
      }
      
      logger.debug('useScriptData', 'Loading official data from sync service...')
      const official = await getCharacters()
      setOfficialData(official)
      logger.debug('useScriptData', 'Loaded', official.length, 'official characters')
      return official
    } catch (err) {
      logger.error('useScriptData', 'Failed to fetch official data:', err)
      return []
    }
  }, [isInitialized, getCharacters, setOfficialData])

  // Auto-load official data when sync service is initialized
  useEffect(() => {
    if (isInitialized && !hasLoadedRef.current) {
      hasLoadedRef.current = true
      logger.debug('useScriptData', 'Sync service initialized, loading official data...')
      loadOfficialData()
    }
  }, [isInitialized, loadOfficialData])

  // Subscribe to sync events and reload data on successful sync
  useEffect(() => {
    const handleSyncEvent = (event: SyncEvent) => {
      // Reload official data after a successful sync (new data downloaded)
      if (event.type === 'success' && event.status.state === 'success') {
        logger.debug('useScriptData', 'Sync completed, reloading official data...')
        loadOfficialData()
      }
    }

    const unsubscribe = subscribeToEvents(handleSyncEvent)
    return unsubscribe
  }, [subscribeToEvents, loadOfficialData])

  /**
   * Parse JSON string and update characters/warnings without setting jsonInput
   * Used for live editing - jsonInput is already set by the textarea
   */
  const parseJson = useCallback(
    async (jsonString: string) => {
      // Handle empty input
      if (!jsonString.trim()) {
        setCharacters([])
        setScriptMeta(null)
        setWarnings([])
        setError(null)
        return
      }

      // Validate JSON syntax
      const validation = validateJson(jsonString)
      if (!validation.valid) {
        setError(validation.error || 'Invalid JSON')
        return
      }

      try {
        // Parse the script data with lenient validation
        const parsed = JSON.parse(jsonString)
        const { characters: scriptChars, warnings } = await validateAndParseScript(parsed, officialData)

        // Extract metadata if present
        const meta = extractScriptMeta(parsed)

        // Update state (but not jsonInput - it's already set)
        setCharacters(scriptChars)
        setScriptMeta(meta)
        setWarnings(warnings)
        setError(null)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to parse script'
        setError(errorMessage)
      }
    },
    [setCharacters, setScriptMeta, setError, setWarnings, officialData]
  )

  /**
   * Clear all script data
   */
  const clearScript = useCallback(() => {
    setJsonInput('')
    setCharacters([])
    setTokens([])
    setScriptMeta(null)
    setWarnings([])
    setError(null)
    clearAllMetadata()
  }, [setJsonInput, setCharacters, setTokens, setScriptMeta, setWarnings, setError, clearAllMetadata])

  /**
   * Central gateway for all script state updates
   * Ensures auto-save triggers reliably for all bulk operations
   *
   * @param newJson - The new JSON content (empty string for clear)
   * @param source - Where the update came from (for logging/analytics)
   */
  const updateScript = useCallback(async (
    newJson: string,
    source: 'user-edit' | 'format' | 'sort' | 'condense' | 'add-meta' | 'remove-underscores' | 'upload' | 'load-example' | 'clear' | 'undo' | 'redo' | 'fix-formats'
  ) => {
    logger.debug('ScriptData', 'Updating script via gateway', {
      source,
      jsonLength: newJson.length,
      isEmpty: newJson === '',
    })

    try {
      if (source === 'clear') {
        // Special case: clear all state
        clearScript()
        logger.debug('ScriptData', 'Script cleared successfully')
      } else {
        // Normal case: update JSON and reparse
        await loadScript(newJson)
        logger.debug('ScriptData', 'Script updated and parsed')
      }

      // Auto-save will trigger automatically via detector
      // (detector watches jsonInput, characters, etc.)

    } catch (error) {
      logger.error('ScriptData', 'Failed to update script', { source, error })
      throw error // Re-throw so handlers can show user-friendly messages
    }
  }, [clearScript, loadScript])

  const loadExampleScriptByName = useCallback(
    async (name: string) => {
      try {
        setIsLoading(true)
        setError(null)

        const scriptJson = await loadExampleScript(name)
        await updateScript(JSON.stringify(scriptJson, null, 2), 'load-example')
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load example script'
        setError(errorMessage)
      } finally {
        setIsLoading(false)
      }
    },
    [updateScript, setIsLoading, setError]
  )

  /**
   * Add a _meta entry to the current script JSON
   * Creates a new _meta object with default properties (id, name, author, version)
   */
  const addMetaToScript = useCallback(
    async (metaData: { name?: string; author?: string; version?: string } = {}) => {
      if (!jsonInput.trim()) return

      try {
        const parsed = JSON.parse(jsonInput)
        if (!Array.isArray(parsed)) return

        // Check if _meta already exists
        const hasExistingMeta = parsed.some(
          (entry: unknown) => typeof entry === 'object' && entry !== null && 'id' in entry && (entry as { id: string }).id === '_meta'
        )
        if (hasExistingMeta) return

        // Create new _meta entry with provided values or defaults
        const newMeta = {
          id: '_meta' as const,
          name: metaData.name || 'My Custom Script',
          author: metaData.author || '',
          version: metaData.version || '1.0.0',
        }

        // Insert _meta at the beginning of the array
        const updatedScript = [newMeta, ...parsed]
        const updatedJson = JSON.stringify(updatedScript, null, 2)

        // Use gateway to trigger auto-save
        await updateScript(updatedJson, 'add-meta')
      } catch (err) {
        logger.error('useScriptData', 'Failed to add _meta to script:', err)
        setError('Failed to add metadata: Invalid JSON')
      }
    },
    [jsonInput, updateScript, setError]
  )

  /**
   * Check if the script contains character IDs with underscores that match official characters
   * Returns true only if an ID with underscores removed would match an official character ID
   * (e.g., "fortune_teller" -> "fortuneteller" matches official)
   */
  const hasUnderscoresInIds = useCallback((): boolean => {
    if (!jsonInput.trim()) return false
    if (officialData.length === 0) return false

    // Create a set of official character IDs for fast lookup
    const officialIds = new Set(officialData.map(c => c.id.toLowerCase()))

    try {
      const parsed = JSON.parse(jsonInput)
      if (!Array.isArray(parsed)) return false

      return parsed.some((entry: unknown) => {
        let id: string | null = null
        
        // Check string IDs (e.g., "fortune_teller")
        if (typeof entry === 'string' && entry !== '_meta' && entry.includes('_')) {
          id = entry
        }
        // Check object entries with id field
        else if (typeof entry === 'object' && entry !== null && 'id' in entry) {
          const entryId = (entry as { id: string }).id
          if (typeof entryId === 'string' && entryId !== '_meta' && entryId.includes('_')) {
            id = entryId
          }
        }
        
        // If we found an ID with underscore, check if removing underscores matches an official ID
        if (id) {
          const withoutUnderscores = id.replace(/_/g, '').toLowerCase()
          return officialIds.has(withoutUnderscores)
        }
        return false
      })
    } catch {
      return false
    }
  }, [jsonInput, officialData])

  /**
   * Remove underscores from all character IDs in the script
   * Converts IDs like "fortune_teller" to "fortuneteller" to match official character IDs
   */
  const removeUnderscoresFromIds = useCallback(async () => {
    if (!jsonInput.trim()) return

    try {
      const parsed = JSON.parse(jsonInput)
      if (!Array.isArray(parsed)) return

      const updatedScript = parsed.map((entry: unknown) => {
        // Handle string IDs (e.g., "fortune_teller" -> "fortuneteller")
        if (typeof entry === 'string' && entry !== '_meta') {
          return entry.replace(/_/g, '')
        }
        // Handle object entries with id field
        if (typeof entry === 'object' && entry !== null && 'id' in entry) {
          const obj = entry as { id: string; [key: string]: unknown }
          if (typeof obj.id === 'string' && obj.id !== '_meta') {
            return { ...obj, id: obj.id.replace(/_/g, '') }
          }
        }
        return entry
      })

      const updatedJson = JSON.stringify(updatedScript, null, 2)

      // Use gateway to trigger auto-save
      await updateScript(updatedJson, 'remove-underscores')
    } catch (err) {
      logger.error('useScriptData', 'Failed to remove underscores from IDs:', err)
      setError('Failed to update IDs: Invalid JSON')
    }
  }, [jsonInput, updateScript, setError])

  return {
    loadScript,
    loadExampleScriptByName,
    loadOfficialData,
    parseJson,
    clearScript,
    addMetaToScript,
    hasUnderscoresInIds,
    removeUnderscoresFromIds,
    updateScript, // ← NEW: Gateway for all script state updates
  }
}
