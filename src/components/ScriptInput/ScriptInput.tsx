import { useState, useRef, useEffect, useCallback } from 'react'
import { useTokenContext } from '../../contexts/TokenContext'
import { useScriptData } from '../../hooks/useScriptData'
import { useTokenGenerator } from '../../hooks/useTokenGenerator'
import { useUndoStack } from '../../hooks/useUndoStack'
import { JsonHighlight } from './JsonHighlight'
import { getCleanJsonForExport } from '../../ts/utils/index.js'
import CONFIG from '../../ts/config.js'
import styles from '../../styles/components/scriptInput/ScriptInput.module.css'

const VISIBLE_WARNINGS_COUNT = 3

export function ScriptInput() {
  const { jsonInput, setJsonInput, characters, isLoading, error, setError, warnings, setWarnings, scriptMeta, generationProgress } = useTokenContext()
  const { loadScript, loadExampleScriptByName, parseJson, clearScript } = useScriptData()
  const { generateTokens } = useTokenGenerator()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const highlightRef = useRef<HTMLDivElement>(null)
  const [autoGenerate, setAutoGenerate] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const [selectedExample, setSelectedExample] = useState<string>('')
  const [showAllWarnings, setShowAllWarnings] = useState(false)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const parseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const previousJsonRef = useRef<string>('')
  const isUndoRedoRef = useRef(false)
  const isExternalChangeRef = useRef(false)

  // Get example scripts from config, strip .json extension for display
  const exampleScripts = CONFIG.EXAMPLE_SCRIPTS.map((filename: string) =>
    filename.replace(/\.json$/, '')
  )

  // Undo/redo stack for JSON input
  const undoStack = useUndoStack(jsonInput)

  // Sync undo stack with context when jsonInput changes externally (e.g., from loadScript)
  // But skip when the change came from undo/redo itself
  useEffect(() => {
    if (!isUndoRedoRef.current && jsonInput !== undoStack.current) {
      undoStack.set(jsonInput)
    }
    // Don't reset isUndoRedoRef here - let the undo/redo sync effect handle it
  }, [jsonInput, undoStack])

  // Debounced parsing of JSON input when user edits manually
  useEffect(() => {
    // Skip if this change came from loadScript (external)
    if (isExternalChangeRef.current) {
      isExternalChangeRef.current = false
      return
    }

    // Clear any existing parse timeout
    if (parseTimerRef.current) {
      clearTimeout(parseTimerRef.current)
    }

    // Debounce the parse operation
    parseTimerRef.current = setTimeout(() => {
      parseJson(jsonInput)
    }, 300)

    return () => {
      if (parseTimerRef.current) {
        clearTimeout(parseTimerRef.current)
      }
    }
  }, [jsonInput, parseJson])

  // Reset "show all warnings" when warnings change
  useEffect(() => {
    setShowAllWarnings(false)
  }, [warnings])

  // Auto-generate tokens after 300ms debounce when JSON input changes and auto-generate is enabled
  useEffect(() => {
    if (!autoGenerate || isLoading || !characters.length) {
      return
    }

    // Only trigger if JSON input has actually changed
    if (previousJsonRef.current === jsonInput) {
      return
    }

    // Update the previous JSON ref
    previousJsonRef.current = jsonInput

    // Clear any existing timeout
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Set new timeout for auto-generate
    debounceTimerRef.current = setTimeout(() => {
      generateTokens()
    }, 300)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [autoGenerate, jsonInput, isLoading, characters.length, generateTokens])

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget
    if (highlightRef.current) {
      highlightRef.current.scrollTop = textarea.scrollTop
      highlightRef.current.scrollLeft = textarea.scrollLeft
    }
  }

  // Process file content (shared by file input and drag-drop)
  const processFile = useCallback(async (file: File) => {
    try {
      isExternalChangeRef.current = true
      const text = await file.text()
      await loadScript(text)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load file'
      setError(message)
    }
  }, [loadScript, setError])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await processFile(file)
  }

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Only set dragging to false if we're leaving the drop zone entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      if (file.type === 'application/json' || file.name.endsWith('.json')) {
        await processFile(file)
      } else {
        setError('Please drop a JSON file')
      }
    }
  }, [processFile, setError])

  const handleExampleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedExample(e.target.value)
  }

  const handleLoadExample = useCallback(async () => {
    if (selectedExample) {
      isExternalChangeRef.current = true
      await loadExampleScriptByName(selectedExample)
    }
  }, [selectedExample, loadExampleScriptByName])

  const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    undoStack.push(newValue)
    setJsonInput(newValue)
  }

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(jsonInput)
      const formatted = JSON.stringify(parsed, null, 2)
      undoStack.push(formatted)
      setJsonInput(formatted)
    } catch {
      setError('Cannot format: Invalid JSON syntax')
    }
  }

  const handleClearJson = () => {
    // No confirmation needed - user can undo
    undoStack.push('')
    setJsonInput('')
    clearScript()
  }

  const handleUndo = useCallback(() => {
    if (undoStack.canUndo) {
      isUndoRedoRef.current = true
      undoStack.undo()
    }
  }, [undoStack])

  const handleRedo = useCallback(() => {
    if (undoStack.canRedo) {
      isUndoRedoRef.current = true
      undoStack.redo()
    }
  }, [undoStack])

  // Sync jsonInput when undoStack.current changes from undo/redo
  useEffect(() => {
    if (isUndoRedoRef.current && undoStack.current !== jsonInput) {
      setJsonInput(undoStack.current)
      isUndoRedoRef.current = false
    }
  }, [undoStack.current, jsonInput, setJsonInput])

  // Keyboard shortcuts for undo/redo
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      if (e.shiftKey) {
        e.preventDefault()
        handleRedo()
      } else {
        e.preventDefault()
        handleUndo()
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
      e.preventDefault()
      handleRedo()
    }
  }, [handleUndo, handleRedo])

  const handleDownloadJson = () => {
    // Use script meta name if available, otherwise default to 'script'
    let filename = 'script.json'
    if (scriptMeta?.name) {
      filename = scriptMeta.name.replace(/[^a-z0-9_\- ]/gi, '_') + '.json'
    }

    // Strip internal fields (uuid) from exported JSON
    const cleanJson = getCleanJsonForExport(jsonInput)
    const blob = new Blob([cleanJson], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleGenerateTokens = async () => {
    if (!jsonInput.trim()) {
      setError('Please paste or upload a JSON script first')
      return
    }
    try {
      await generateTokens()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Token generation failed'
      setError(message)
    }
  }

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2>Script Input</h2>
      </div>
      <div
        className={`${styles.content} ${isDragging ? styles.dragOver : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >

        {/* File Upload Methods */}
        <div className={styles.inputMethods}>
          <div className={styles.inputMethod}>
            <label
              htmlFor="fileUpload"
              className={styles.fileUploadLabel}
            >
              <span className={styles.uploadIcon}>📁</span>
              <span>{isDragging ? 'Drop JSON file here' : 'Upload or drag JSON file'}</span>
              <input
                id="fileUpload"
                type="file"
                accept=".json"
                className={styles.fileInput}
                onChange={handleFileUpload}
                ref={fileInputRef}
              />
            </label>
          </div>

          <div className={styles.inputMethod}>
            <label htmlFor="exampleScripts">Or load an example script:</label>
            <div className={styles.exampleSelectGroup}>
              <select
                id="exampleScripts"
                className={styles.selectInput}
                onChange={handleExampleSelect}
                value={selectedExample}
              >
                <option value="">-- Select Example --</option>
                {exampleScripts.map((script: string) => (
                  <option key={script} value={script}>
                    {script.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={handleLoadExample}
                disabled={!selectedExample}
                aria-label="Load selected example script"
              >
                Load
              </button>
            </div>
          </div>
        </div>

        {/* JSON Editor */}
        <div className={styles.editorContainer}>
          <div className={styles.editorHeader}>
            <span>JSON Editor</span>
            <div className={styles.editorActions}>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={handleUndo}
                disabled={!undoStack.canUndo}
                title="Undo (Ctrl+Z)"
                aria-label="Undo"
              >
                ↩️
              </button>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={handleRedo}
                disabled={!undoStack.canRedo}
                title="Redo (Ctrl+Y or Ctrl+Shift+Z)"
                aria-label="Redo"
              >
                ↪️
              </button>
              <button
                type="button"
                className={`${styles.secondaryBtn} ${autoGenerate ? styles.activeHighlight : ''}`}
                onClick={() => setAutoGenerate(!autoGenerate)}
                title={autoGenerate ? 'Disable auto-generate' : 'Enable auto-generate'}
                aria-label={autoGenerate ? 'Disable auto-generate' : 'Enable auto-generate'}
              >
                🔄
              </button>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={handleFormatJson}
                title="Format/Beautify JSON"
                aria-label="Format JSON"
              >
                🎨
              </button>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={handleClearJson}
                title="Clear editor"
                aria-label="Clear editor"
              >
                🗑️
              </button>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={handleDownloadJson}
                title="Download JSON file"
                aria-label="Download JSON file"
              >
                ⬇️
              </button>
            </div>
          </div>
          <div className={styles.editorWrapper}>
            <div className={styles.jsonHighlight} ref={highlightRef}>
              <JsonHighlight json={jsonInput} />
            </div>
            <textarea
              ref={textareaRef}
              id="jsonEditor"
              className={styles.jsonEditor}
              value={jsonInput}
              onChange={handleJsonChange}
              onScroll={handleScroll}
              onKeyDown={handleKeyDown}
              placeholder="Paste your JSON script here or upload a file..."
              spellCheck="false"
              aria-label="JSON editor"
            />
          </div>
          {error && <div className={`${styles.validationMessage} ${styles.error}`}>{error}</div>}
          {warnings && warnings.length > 0 && (
            <div className={`${styles.validationMessage} ${styles.warning}`}>
              <div className={styles.warningHeader}>
                ⚠️ {warnings.length} warning{warnings.length > 1 ? 's' : ''}:
              </div>
              <ul className={styles.warningList}>
                {warnings.slice(0, VISIBLE_WARNINGS_COUNT).map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
              {warnings.length > VISIBLE_WARNINGS_COUNT && (
                <>
                  {showAllWarnings && (
                    <ul className={styles.warningList}>
                      {warnings.slice(VISIBLE_WARNINGS_COUNT).map((warning, index) => (
                        <li key={index + VISIBLE_WARNINGS_COUNT}>{warning}</li>
                      ))}
                    </ul>
                  )}
                  <button
                    className={styles.showMoreWarningsBtn}
                    onClick={() => setShowAllWarnings(!showAllWarnings)}
                  >
                    {showAllWarnings 
                      ? '▲ Show less' 
                      : `▼ Show ${warnings.length - VISIBLE_WARNINGS_COUNT} more warning${warnings.length - VISIBLE_WARNINGS_COUNT > 1 ? 's' : ''}`
                    }
                  </button>
                </>
              )}
            </div>
          )}
          {characters.length > 0 && (
            <div className={`${styles.validationMessage} ${styles.success}`}>
              ✓ Loaded {characters.length} characters
            </div>
          )}
        </div>

        {/* Generate Button */}
        <div className={styles.actionButtons}>
          <button
            className={styles.primaryBtn}
            onClick={handleGenerateTokens}
            disabled={isLoading || !jsonInput.trim()}
          >
            <span className={styles.btnIcon}>⚙️</span>
            {isLoading ? 'Generating...' : 'Generate Tokens'}
          </button>
        </div>
      </div>
    </section>
  )
}
