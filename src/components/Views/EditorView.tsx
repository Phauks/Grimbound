import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useTokenContext } from '../../contexts/TokenContext'
import { useProjectContext } from '../../contexts/ProjectContext'
import { useScriptData } from '../../hooks/useScriptData'
import { useTokenGenerator } from '../../hooks/useTokenGenerator'
import { useUndoStack } from '../../hooks/useUndoStack'
import { useProjects } from '../../hooks/useProjects'
import { JsonHighlight } from '../ScriptInput/JsonHighlight'
import { sortScriptJsonBySAO, isScriptJsonSortedBySAO } from '../../ts/utils/index.js'
import CONFIG from '../../ts/config.js'
import styles from '../../styles/components/views/Views.module.css'
import scriptStyles from '../../styles/components/scriptInput/ScriptInput.module.css'

interface EditorViewProps {
  onGenerate?: () => void
  onNavigateToCustomize?: () => void
  onNavigateToProjects?: () => void
  onCreateProject?: () => void
}

export function EditorView({ onGenerate, onNavigateToCustomize, onNavigateToProjects, onCreateProject }: EditorViewProps) {
  const { jsonInput, setJsonInput, characters, isLoading, error, setError, warnings, setWarnings, scriptMeta, officialData } = useTokenContext()
  const { currentProject } = useProjectContext()
  const { projects, activateProject } = useProjects()
  const { loadScript, loadExampleScriptByName, parseJson, clearScript, addMetaToScript, hasUnderscoresInIds, removeUnderscoresFromIds } = useScriptData()
  const { generateTokens } = useTokenGenerator()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const highlightRef = useRef<HTMLDivElement>(null)
  const [autoGenerate, setAutoGenerate] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const [selectedExample, setSelectedExample] = useState<string>('')
  const [showAllMessages, setShowAllMessages] = useState(false)
  const [forceRegenerate, setForceRegenerate] = useState(0)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const parseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const previousJsonRef = useRef<string>('')
  const isUndoRedoRef = useRef(false)
  const isExternalChangeRef = useRef(false)

  const VISIBLE_MESSAGES_COUNT = 3

  // Get example scripts from config, strip .json extension for display
  const exampleScripts = CONFIG.EXAMPLE_SCRIPTS.map((filename: string) =>
    filename.replace(/\.json$/, '')
  )

  // Check if script is sorted by SAO (memoized to avoid recalculating on every render)
  const isScriptSorted = useMemo(() => {
    if (!jsonInput.trim() || characters.length === 0) return true
    return isScriptJsonSortedBySAO(jsonInput, { officialData }) ?? true
  }, [jsonInput, characters.length, officialData])

  // Undo/redo stack for JSON input
  const undoStack = useUndoStack(jsonInput)

  // Sync undo stack with context when jsonInput changes externally
  useEffect(() => {
    if (!isUndoRedoRef.current && jsonInput !== undoStack.current) {
      undoStack.set(jsonInput)
    }
  }, [jsonInput, undoStack])

  // Reset "show all messages" when warnings/error change
  useEffect(() => {
    setShowAllMessages(false)
  }, [warnings, error])

  // Debounced parsing of JSON input when user edits manually
  useEffect(() => {
    if (isExternalChangeRef.current) {
      isExternalChangeRef.current = false
      return
    }

    if (parseTimerRef.current) {
      clearTimeout(parseTimerRef.current)
    }

    parseTimerRef.current = setTimeout(() => {
      parseJson(jsonInput)
    }, 300)

    return () => {
      if (parseTimerRef.current) {
        clearTimeout(parseTimerRef.current)
      }
    }
  }, [jsonInput, parseJson])

  // Auto-generate tokens after debounce
  useEffect(() => {
    if (!autoGenerate || isLoading || !characters.length) {
      return
    }

    // Skip if JSON hasn't changed and not force regenerating
    if (previousJsonRef.current === jsonInput && forceRegenerate === 0) {
      return
    }

    previousJsonRef.current = jsonInput

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(async () => {
      await generateTokens()
      if (onGenerate) onGenerate()
    }, 300)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [jsonInput, characters.length, autoGenerate, isLoading, generateTokens, onGenerate, forceRegenerate])

  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setJsonInput(newValue)
    undoStack.push(newValue)
    setError(null)
    setWarnings([])
  }, [setJsonInput, undoStack, setError, setWarnings])

  const handleFileUpload = useCallback(async (file: File) => {
    isExternalChangeRef.current = true
    const text = await file.text()
    await loadScript(text)
    previousJsonRef.current = ''
  }, [loadScript])

  const handleExampleChange = useCallback(async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const scriptName = e.target.value
    setSelectedExample(scriptName)
    if (scriptName) {
      isExternalChangeRef.current = true
      await loadExampleScriptByName(scriptName)
      previousJsonRef.current = ''
    }
  }, [loadExampleScriptByName])

  const handleClear = useCallback(() => {
    // Push current value to undo stack before clearing
    if (jsonInput.trim()) {
      undoStack.push(jsonInput)
    }
    clearScript()
    setSelectedExample('')
    previousJsonRef.current = ''
  }, [jsonInput, clearScript, undoStack])

  const handleFormat = useCallback(() => {
    try {
      const parsed = JSON.parse(jsonInput)
      const formatted = JSON.stringify(parsed, null, 2)
      setJsonInput(formatted)
      undoStack.push(formatted)
    } catch {
      setError('Cannot format: Invalid JSON')
    }
  }, [jsonInput, setJsonInput, undoStack, setError])

  const handleSort = useCallback(() => {
    try {
      const sorted = sortScriptJsonBySAO(jsonInput, { officialData })
      setJsonInput(sorted)
      undoStack.push(sorted)
      // Parse the sorted JSON to update characters array
      parseJson(sorted)
      // Trigger force regeneration after React updates state
      setForceRegenerate(prev => prev + 1)
    } catch {
      setError('Cannot sort: Invalid JSON')
    }
  }, [jsonInput, setJsonInput, undoStack, setError, officialData, parseJson])

  const handleUndo = useCallback(() => {
    if (undoStack.canUndo) {
      isUndoRedoRef.current = true
      const previous = undoStack.undo()
      if (previous !== undefined) {
        setJsonInput(previous)
        parseJson(previous)
        previousJsonRef.current = previous
      }
      setTimeout(() => { isUndoRedoRef.current = false }, 0)
    }
  }, [undoStack, setJsonInput, parseJson])

  const handleRedo = useCallback(() => {
    if (undoStack.canRedo) {
      isUndoRedoRef.current = true
      const next = undoStack.redo()
      if (next !== undefined) {
        setJsonInput(next)
        parseJson(next)
        previousJsonRef.current = next
      }
      setTimeout(() => { isUndoRedoRef.current = false }, 0)
    }
  }, [undoStack, setJsonInput, parseJson])

  const handleManualGenerate = useCallback(async () => {
    await generateTokens()
    if (onGenerate) onGenerate()
  }, [generateTokens, onGenerate])

  const handleScroll = useCallback((e: React.UIEvent<HTMLTextAreaElement>) => {
    if (highlightRef.current) {
      highlightRef.current.scrollTop = e.currentTarget.scrollTop
      highlightRef.current.scrollLeft = e.currentTarget.scrollLeft
    }
  }, [])

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type === 'application/json') {
      await handleFileUpload(file)
    }
  }, [handleFileUpload])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        handleRedo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleUndo, handleRedo])

  return (
    <div className={styles.editorView}>
      <div className={styles.editorSplitLayout}>
        {/* Left Panel - Create New Character & Load Scripts */}
        <div className={styles.editorLeftPanel}>
          <div className={styles.leftPanelSection}>
            <h3 className={styles.leftPanelTitle}>Project</h3>
            <p className={styles.leftPanelDesc}>
              Manage your token generator projects.
            </p>
            <button
              className={`btn-secondary ${styles.btnLeftPanelAction}`}
              onClick={onCreateProject}
            >
              Create New Project
            </button>
            <button
              className={`btn-secondary ${styles.btnLeftPanelAction}`}
              onClick={onNavigateToProjects}
              style={{ marginTop: '0.5rem' }}
            >
              Load Project
            </button>
            {(() => {
              // Find the most recently accessed project (excluding current if any)
              const lastProject = projects
                .filter(p => !currentProject || p.id !== currentProject.id)
                .sort((a, b) => b.lastAccessedAt - a.lastAccessedAt)[0]
              
              if (!lastProject) return null
              
              return (
                <button
                  className={`btn-secondary ${styles.btnLeftPanelAction}`}
                  onClick={() => activateProject(lastProject.id)}
                  style={{ marginTop: '0.5rem' }}
                >
                  Load Last Project: {lastProject.name}
                </button>
              )
            })()}
          </div>

          <div className={styles.leftPanelSection}>
            <h3 className={styles.leftPanelTitle}>Create Custom Character</h3>
            <p className={styles.leftPanelDesc}>
              Design your own custom character token from scratch.
            </p>
            <button
              className={`btn-primary ${styles.btnLeftPanelAction}`}
              onClick={onNavigateToCustomize}
            >
              ✨ Create New Character
            </button>
            <button
              className={`btn-secondary ${styles.btnLeftPanelAction}`}
              disabled
              style={{ marginTop: '0.5rem', opacity: 0.5, cursor: 'not-allowed' }}
            >
              📚 Add Official Character
            </button>
          </div>

          <div className={styles.leftPanelSection}>
            <h3 className={styles.leftPanelTitle}>Upload Script</h3>
            <p className={styles.leftPanelDesc}>
              Import a script JSON file from your computer.
            </p>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              style={{ display: 'none' }}
            />
            <button
              className={`btn-secondary ${styles.btnLeftPanelAction}`}
              onClick={() => fileInputRef.current?.click()}
            >
              📁 Upload JSON File
            </button>
          </div>

          <div className={styles.leftPanelSection}>
            <h3 className={styles.leftPanelTitle}>Load Example Script</h3>
            <p className={styles.leftPanelDesc}>
              Try an example script to explore the generator.
            </p>
            <div className={styles.leftPanelRow}>
              <select
                className={styles.leftPanelSelect}
                value={selectedExample}
                onChange={(e) => setSelectedExample(e.target.value)}
              >
                <option value="">Select an example...</option>
                {exampleScripts.map((name: string) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              <button
                className={`btn-secondary ${styles.btnLeftPanelSmall}`}
                onClick={() => selectedExample && loadExampleScriptByName(selectedExample)}
                disabled={!selectedExample}
                title="Load selected example"
              >
                Load
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel - JSON Editor */}
        <div className={styles.editorRightPanel}>
          <div className={styles.editorContainer}>
            {/* Unified Single-Row Toolbar */}
            <div className={styles.editorUnifiedToolbar}>
              <div className={styles.scriptMetaInline}>
                <strong>{scriptMeta?.name || 'No Script Loaded'}</strong>
                {scriptMeta?.author && <span className={styles.metaAuthor}> by {scriptMeta.author}</span>}
              </div>

              <div className={styles.toolbarActions}>
                <button
                  className={`btn-secondary ${styles.btnIconOnly}`}
                  onClick={handleFormat}
                  title="Format JSON"
                >
                  🎨
                </button>
                <button
                  className={`btn-secondary ${styles.btnIconOnly}`}
                  onClick={() => {
                    navigator.clipboard.writeText(jsonInput)
                      .then(() => {
                        // Successfully copied
                      })
                      .catch((err) => {
                        console.error('Failed to copy JSON:', err)
                        setError('Failed to copy to clipboard')
                      })
                  }}
                  title="Copy JSON to clipboard"
                >
                  📋
                </button>
                <button
                  className={`btn-secondary ${styles.btnIconOnly}`}
                  onClick={handleUndo}
                  disabled={!undoStack.canUndo}
                  title="Undo (Ctrl+Z)"
                >
                  ↩️
                </button>
                <button
                  className={`btn-secondary ${styles.btnIconOnly}`}
                  onClick={handleRedo}
                  disabled={!undoStack.canRedo}
                  title="Redo (Ctrl+Y)"
                >
                  ↪️
                </button>
                <button
                  className={`btn-secondary ${styles.btnIconOnly}`}
                  onClick={handleClear}
                  title="Clear editor"
                >
                  🗑️
                </button>
              </div>
            </div>

            {/* Editor Area */}
            <div
              className={`${styles.editorWrapper} ${isDragging ? styles.dragging : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className={scriptStyles.jsonHighlight} ref={highlightRef}>
                <JsonHighlight json={jsonInput} />
              </div>
              <textarea
                ref={textareaRef}
                className={scriptStyles.jsonEditor}
                value={jsonInput}
                onChange={handleTextareaChange}
                onScroll={handleScroll}
                placeholder="Paste your Blood on the Clocktower script JSON here, or drag and drop a .json file..."
                spellCheck={false}
              />
              {isDragging && (
                <div className={styles.dropOverlay}>
                  <span>Drop JSON file here</span>
                </div>
              )}
            </div>

            {/* Messages indicator (errors/warnings) - below editor */}
            {(error || warnings.length > 0 || (characters.length > 0 && !scriptMeta) || hasUnderscoresInIds() || (characters.length > 0 && !isScriptSorted)) && (
              <div className={styles.messagesBar}>
                {/* Missing _meta recommendation */}
                {characters.length > 0 && !scriptMeta && !error && (
                  <div className={`${styles.messageItem} ${styles.infoItem}`}>
                    <span>💡 This script doesn't have a <code>_meta</code> entry. Adding one enables script name tokens and better organization.</span>
                    <button
                      className={styles.addMetaBtn}
                      onClick={() => addMetaToScript()}
                      title="Add _meta entry to script"
                    >
                      Add _meta
                    </button>
                  </div>
                )}
                {/* Underscore in IDs recommendation */}
                {hasUnderscoresInIds() && !error && (
                  <div className={`${styles.messageItem} ${styles.infoItem}`}>
                    <span>💡 Some character IDs contain underscores. Official IDs don't use underscores (e.g., <code>fortune_teller</code> → <code>fortuneteller</code>).</span>
                    <button
                      className={styles.addMetaBtn}
                      onClick={removeUnderscoresFromIds}
                      title="Remove underscores from character IDs"
                    >
                      Remove underscores
                    </button>
                  </div>
                )}
                {/* Script not sorted recommendation */}
                {characters.length > 0 && !isScriptSorted && !error && (
                  <div className={`${styles.messageItem} ${styles.infoItem}`}>
                    <span>💡 Script not sorted in Standard Order.</span>
                    <button
                      className={styles.addMetaBtn}
                      onClick={handleSort}
                      title="Sort characters by Standard Amy Order"
                    >
                      Sort
                    </button>
                  </div>
                )}
                {/* Build combined messages list */}
                {(error || warnings.length > 0) && (() => {
                  const allMessages = [
                    ...(error ? [{ type: 'error', text: error }] : []),
                    ...warnings.map(w => ({ type: 'warning', text: w }))
                  ]
                  const visibleMessages = allMessages.slice(0, VISIBLE_MESSAGES_COUNT)
                  const hiddenMessages = allMessages.slice(VISIBLE_MESSAGES_COUNT)
                  const hasMore = hiddenMessages.length > 0

                  return (
                    <>
                      <div className={styles.messagesDropdownUp}>
                        {visibleMessages.map((msg, i) => (
                          <div key={i} className={`${styles.messageItem} ${msg.type === 'error' ? styles.errorItem : styles.warningItem}`}>
                            {msg.type === 'error' ? '⚠️' : 'ℹ️'} {msg.text}
                          </div>
                        ))}
                        {showAllMessages && hiddenMessages.map((msg, i) => (
                          <div key={i + VISIBLE_MESSAGES_COUNT} className={`${styles.messageItem} ${msg.type === 'error' ? styles.errorItem : styles.warningItem}`}>
                            {msg.type === 'error' ? '⚠️' : 'ℹ️'} {msg.text}
                          </div>
                        ))}
                      </div>
                      {hasMore && (
                        <button 
                          className={styles.showMoreBtn}
                          onClick={() => setShowAllMessages(!showAllMessages)}
                        >
                          {showAllMessages 
                            ? '▲ Show less' 
                            : `▼ Show ${hiddenMessages.length} more`
                          }
                        </button>
                      )}
                    </>
                  )
                })()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
