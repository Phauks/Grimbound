import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type DownloadItem, useDownloadsContext } from '../../contexts/DownloadsContext';
import { useProjectContext } from '../../contexts/ProjectContext';
import { useTokenContext } from '../../contexts/TokenContext';
import { useScriptData } from '../../hooks/useScriptData';
import { useTokenGenerator } from '../../hooks/useTokenGenerator';
import { useUndoStack } from '../../hooks/useUndoStack';
import layoutStyles from '../../styles/components/layout/ViewLayout.module.css';
import scriptStyles from '../../styles/components/scriptInput/ScriptInput.module.css';
import styles from '../../styles/components/views/Views.module.css';
import CONFIG from '../../ts/config.js';
import {
  analyzeReminderText,
  condenseScript,
  hasCondensableReferences,
  isScriptJsonSortedBySAO,
  logger,
  normalizeReminderText,
  sortScriptJsonBySAO,
} from '../../ts/utils/index.js';
import { ViewLayout } from '../Layout/ViewLayout';
import { InfoMessage } from '../Shared/Feedback/InfoMessage';
import { Button } from '../Shared/UI/Button';
import { JsonHighlight } from '../ViewComponents/JsonComponents/JsonHighlight';

interface JsonViewProps {
  onGenerate?: () => void;
  onNavigateToCharacters?: () => void;
  onNavigateToProjects?: () => void;
  onCreateProject?: () => void;
}

export function JsonView({
  onGenerate,
  onNavigateToCharacters,
  onNavigateToProjects,
  onCreateProject,
}: JsonViewProps) {
  const {
    jsonInput,
    setJsonInput,
    characters,
    isLoading,
    error,
    setError,
    warnings,
    setWarnings,
    scriptMeta,
    officialData,
  } = useTokenContext();
  const { currentProject } = useProjectContext();
  const { setDownloads, clearDownloads } = useDownloadsContext();
  const {
    loadScript,
    loadExampleScriptByName,
    parseJson,
    clearScript,
    addMetaToScript,
    hasUnderscoresInIds,
    removeUnderscoresFromIds,
    updateScript,
  } = useScriptData();
  const { generateTokens } = useTokenGenerator();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [autoGenerate, _setAutoGenerate] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedExample, setSelectedExample] = useState<string>('');
  const [showAllMessages, setShowAllMessages] = useState(false);
  const [forceRegenerate, setForceRegenerate] = useState(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const parseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousJsonRef = useRef<string>('');
  const previousProjectIdRef = useRef<string | null>(null);
  const isUndoRedoRef = useRef(false);
  const isExternalChangeRef = useRef(false);

  const VISIBLE_MESSAGES_COUNT = 3;

  // Get example scripts from config, strip .json extension for display
  const exampleScripts = CONFIG.EXAMPLE_SCRIPTS.map((filename: string) =>
    filename.replace(/\.json$/, '')
  );

  // Check if script is sorted by SAO (memoized to avoid recalculating on every render)
  const isScriptSorted = useMemo(() => {
    if (!jsonInput.trim() || characters.length === 0) return true;
    return isScriptJsonSortedBySAO(jsonInput, { officialData }) ?? true;
  }, [jsonInput, characters.length, officialData]);

  // Check if JSON could be formatted (minified or not properly indented)
  const needsFormatting = useMemo(() => {
    if (!jsonInput.trim() || characters.length === 0) return false;
    try {
      const parsed = JSON.parse(jsonInput);
      const formatted = JSON.stringify(parsed, null, 2);
      // Compare normalized versions - if they differ significantly, suggest formatting
      return formatted !== jsonInput && jsonInput.length > 50;
    } catch {
      return false; // Invalid JSON, can't format
    }
  }, [jsonInput, characters.length]);

  // Check if script has condensable character references (memoized to avoid recalculating on every render)
  const hasCondensableRefs = useMemo(() => {
    if (!jsonInput.trim() || characters.length === 0 || !officialData.length) return false;
    return hasCondensableReferences(jsonInput, officialData);
  }, [jsonInput, characters.length, officialData]);

  // Check for non-standard format issues in night reminder fields
  const formatIssuesSummary = useMemo(() => {
    if (!jsonInput.trim() || characters.length === 0) return null;

    const issuesFound: {
      characterName: string;
      field: 'firstNightReminder' | 'otherNightReminder';
      issues: ReturnType<typeof analyzeReminderText>;
    }[] = [];

    for (const char of characters) {
      if (char.firstNightReminder) {
        const issues = analyzeReminderText(char.firstNightReminder);
        if (issues.length > 0) {
          issuesFound.push({ characterName: char.name, field: 'firstNightReminder', issues });
        }
      }
      if (char.otherNightReminder) {
        const issues = analyzeReminderText(char.otherNightReminder);
        if (issues.length > 0) {
          issuesFound.push({ characterName: char.name, field: 'otherNightReminder', issues });
        }
      }
    }

    if (issuesFound.length === 0) return null;

    // Get unique issue types across all characters
    const uniqueIssueTypes = [
      ...new Set(issuesFound.flatMap((f) => f.issues.map((i) => i.description))),
    ];
    const totalCharactersAffected = new Set(issuesFound.map((f) => f.characterName)).size;

    return {
      issuesFound,
      uniqueIssueTypes,
      totalCharactersAffected,
      totalIssues: issuesFound.length,
    };
  }, [jsonInput, characters]);

  // Undo/redo stack for JSON input
  const undoStack = useUndoStack(jsonInput);

  // Sync undo stack with context when jsonInput changes externally
  useEffect(() => {
    if (!isUndoRedoRef.current && jsonInput !== undoStack.current) {
      undoStack.set(jsonInput);
    }
  }, [jsonInput, undoStack]);

  // Reset "show all messages" when warnings/error change
  useEffect(() => {
    setShowAllMessages(false);
  }, []);

  // Debounced parsing of JSON input when user edits manually
  useEffect(() => {
    if (isExternalChangeRef.current) {
      isExternalChangeRef.current = false;
      return;
    }

    if (parseTimerRef.current) {
      clearTimeout(parseTimerRef.current);
    }

    parseTimerRef.current = setTimeout(() => {
      parseJson(jsonInput);
    }, 300);

    return () => {
      if (parseTimerRef.current) {
        clearTimeout(parseTimerRef.current);
      }
    };
  }, [jsonInput, parseJson]);

  // Auto-generate tokens after debounce
  useEffect(() => {
    if (!autoGenerate || isLoading || !characters.length) {
      return;
    }

    // Force regenerate if project changed (handles project activation)
    const projectChanged = previousProjectIdRef.current !== currentProject?.id;

    // Skip if JSON hasn't changed AND project hasn't changed AND not force regenerating
    if (!projectChanged && previousJsonRef.current === jsonInput && forceRegenerate === 0) {
      return;
    }

    previousJsonRef.current = jsonInput;
    previousProjectIdRef.current = currentProject?.id ?? null;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      await generateTokens();
      if (onGenerate) onGenerate();
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [
    jsonInput,
    characters.length,
    autoGenerate,
    isLoading,
    generateTokens,
    onGenerate,
    forceRegenerate,
    currentProject?.id,
  ]);

  const handleTextareaChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setJsonInput(newValue);
      undoStack.push(newValue);
      setError(null);
      setWarnings([]);
    },
    [setJsonInput, undoStack, setError, setWarnings]
  );

  const handleFileUpload = useCallback(
    async (file: File) => {
      isExternalChangeRef.current = true;
      const text = await file.text();
      await updateScript(text, 'upload');
      previousJsonRef.current = '';
    },
    [updateScript]
  );

  const _handleExampleChange = useCallback(
    async (e: React.ChangeEvent<HTMLSelectElement>) => {
      const scriptName = e.target.value;
      setSelectedExample(scriptName);
      if (scriptName) {
        isExternalChangeRef.current = true;
        await loadExampleScriptByName(scriptName);
        previousJsonRef.current = '';
      }
    },
    [loadExampleScriptByName]
  );

  const handleClear = useCallback(async () => {
    // Push current value to undo stack before clearing
    if (jsonInput.trim()) {
      undoStack.push(jsonInput);
    }
    await updateScript('', 'clear');
    setSelectedExample('');
    previousJsonRef.current = '';
  }, [jsonInput, updateScript, undoStack]);

  const handleFormat = useCallback(async () => {
    try {
      const parsed = JSON.parse(jsonInput);
      const formatted = JSON.stringify(parsed, null, 2);
      undoStack.push(formatted);
      await updateScript(formatted, 'format');
    } catch {
      setError('Cannot format: Invalid JSON');
    }
  }, [jsonInput, updateScript, undoStack, setError]);

  const handleSort = useCallback(async () => {
    try {
      const sorted = sortScriptJsonBySAO(jsonInput, { officialData });
      undoStack.push(sorted);
      await updateScript(sorted, 'sort');
      // Trigger force regeneration after React updates state
      setForceRegenerate((prev) => prev + 1);
    } catch {
      setError('Cannot sort: Invalid JSON');
    }
  }, [jsonInput, updateScript, undoStack, setError, officialData]);

  const handleCondenseScript = useCallback(async () => {
    try {
      const condensed = condenseScript(jsonInput, officialData);
      undoStack.push(condensed);
      await updateScript(condensed, 'condense');
      // Trigger force regeneration after React updates state
      setForceRegenerate((prev) => prev + 1);
    } catch {
      setError('Cannot condense: Invalid JSON');
    }
  }, [jsonInput, updateScript, undoStack, setError, officialData]);

  // Fix all non-standard format issues in night reminder fields
  const handleFixFormats = useCallback(async () => {
    try {
      const parsed = JSON.parse(jsonInput);
      if (!Array.isArray(parsed)) {
        setError('Cannot fix formats: JSON must be an array');
        return;
      }

      let modified = false;
      const updated = parsed.map((entry: any) => {
        if (typeof entry !== 'object' || entry === null) return entry;
        if (entry.id === '_meta') return entry;

        const newEntry = { ...entry };

        if (entry.firstNightReminder && analyzeReminderText(entry.firstNightReminder).length > 0) {
          newEntry.firstNightReminder = normalizeReminderText(entry.firstNightReminder);
          modified = true;
        }

        if (entry.otherNightReminder && analyzeReminderText(entry.otherNightReminder).length > 0) {
          newEntry.otherNightReminder = normalizeReminderText(entry.otherNightReminder);
          modified = true;
        }

        return newEntry;
      });

      if (modified) {
        const fixedJson = JSON.stringify(updated, null, 2);
        undoStack.push(fixedJson);
        await updateScript(fixedJson, 'fix-formats');
        setForceRegenerate((prev) => prev + 1);
      }
    } catch {
      setError('Cannot fix formats: Invalid JSON');
    }
  }, [jsonInput, updateScript, undoStack, setError]);

  const handleUndo = useCallback(async () => {
    if (undoStack.canUndo) {
      isUndoRedoRef.current = true;
      const previous = undoStack.undo();
      if (previous !== undefined) {
        await updateScript(previous, 'undo');
        previousJsonRef.current = previous;
      }
      setTimeout(() => {
        isUndoRedoRef.current = false;
      }, 0);
    }
  }, [undoStack, updateScript]);

  const handleRedo = useCallback(async () => {
    if (undoStack.canRedo) {
      isUndoRedoRef.current = true;
      const next = undoStack.redo();
      if (next !== undefined) {
        await updateScript(next, 'redo');
        previousJsonRef.current = next;
      }
      setTimeout(() => {
        isUndoRedoRef.current = false;
      }, 0);
    }
  }, [undoStack, updateScript]);

  const _handleManualGenerate = useCallback(async () => {
    await generateTokens();
    if (onGenerate) onGenerate();
  }, [generateTokens, onGenerate]);

  // Auto-resize textarea to fit content - this prevents internal scrolling
  // so the parent container handles all scrolling (no JS scroll sync needed)
  const autoResizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    // Reset height to measure scrollHeight accurately
    textarea.style.height = 'auto';
    // Set height to scrollHeight so no internal scrolling occurs
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, []);

  // Auto-resize on content change
  useEffect(() => {
    autoResizeTextarea();
  }, [autoResizeTextarea]);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type === 'application/json') {
        await handleFileUpload(file);
      }
    },
    [handleFileUpload]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Download JSON handler
  const handleDownloadJson = useCallback(() => {
    if (!jsonInput.trim()) return;

    const filename = scriptMeta?.name
      ? `${scriptMeta.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`
      : currentProject?.name
        ? `${currentProject.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`
        : 'script.json';

    const blob = new Blob([jsonInput], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [jsonInput, scriptMeta, currentProject]);

  // Register downloads for this view
  useEffect(() => {
    const downloads: DownloadItem[] = [
      {
        id: 'json-script',
        icon: '📄',
        label: 'Script JSON',
        description: scriptMeta?.name || 'Current script data',
        action: handleDownloadJson,
        disabled: !jsonInput.trim(),
        disabledReason: 'No script data to download',
      },
    ];

    setDownloads(downloads);
    return () => clearDownloads();
  }, [jsonInput, scriptMeta, handleDownloadJson, setDownloads, clearDownloads]);

  return (
    <ViewLayout variant="2-panel">
      {/* Left Sidebar - Load Scripts */}
      <ViewLayout.Panel position="left" width="left" scrollable>
        <div className={layoutStyles.panelContent}>
          {/* Upload Script */}
          <details className={layoutStyles.sidebarCard} open>
            <summary className={layoutStyles.sectionHeader}>Upload Script</summary>
            <div className={layoutStyles.optionSection}>
              <p className={styles.leftPanelDesc}>Import a script JSON file from your computer.</p>
              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                style={{ display: 'none' }}
              />
              <Button variant="secondary" fullWidth onClick={() => fileInputRef.current?.click()}>
                📁 Upload JSON File
              </Button>
            </div>
          </details>

          {/* Load Example Script */}
          <details className={layoutStyles.sidebarCard} open>
            <summary className={layoutStyles.sectionHeader}>Example Scripts</summary>
            <div className={layoutStyles.optionSection}>
              <p className={styles.leftPanelDesc}>
                Try an example script to explore the generator.
              </p>
              <select
                className={styles.leftPanelSelect}
                value={selectedExample}
                onChange={(e) => setSelectedExample(e.target.value)}
              >
                <option value="">Select an example...</option>
                {exampleScripts.map((name: string) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <Button
                variant="secondary"
                fullWidth
                onClick={() => selectedExample && loadExampleScriptByName(selectedExample)}
                disabled={!selectedExample}
                style={{ marginTop: '0.5rem' }}
              >
                Load Example
              </Button>
            </div>
          </details>
        </div>
      </ViewLayout.Panel>

      {/* Right Panel - JSON Editor */}
      <ViewLayout.Panel position="right" width="flex" scrollable>
        <div className={styles.editorContainer}>
          {/* JSON Editor Toolbar with Grouped Buttons */}
          <div className={styles.jsonToolbar}>
            {/* Edit Group */}
            <div className={styles.toolbarGroup}>
              <button
                className={styles.toolbarButton}
                onClick={() => {
                  navigator.clipboard
                    .writeText(jsonInput)
                    .then(() => {
                      logger.debug('JsonView', 'JSON copied to clipboard');
                    })
                    .catch((err) => {
                      logger.error('JsonView', 'Failed to copy JSON', err);
                      setError('Failed to copy to clipboard');
                    });
                }}
                title="Copy JSON to clipboard"
              >
                Copy
              </button>
            </div>

            <div className={styles.toolbarSeparator} />

            {/* History Group */}
            <div className={styles.toolbarGroup}>
              <button
                className={styles.toolbarButton}
                onClick={handleUndo}
                disabled={!undoStack.canUndo}
                title="Undo (Ctrl+Z)"
              >
                Undo
              </button>
              <button
                className={styles.toolbarButton}
                onClick={handleRedo}
                disabled={!undoStack.canRedo}
                title="Redo (Ctrl+Y)"
              >
                Redo
              </button>
            </div>

            <div className={styles.toolbarSeparator} />

            {/* Danger Group */}
            <div className={styles.toolbarGroup}>
              <button
                className={`${styles.toolbarButton} ${styles.toolbarButtonDanger}`}
                onClick={handleClear}
                title="Clear editor"
              >
                Clear
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
            <div className={scriptStyles.jsonHighlight}>
              <JsonHighlight json={jsonInput} />
            </div>
            <textarea
              ref={textareaRef}
              className={scriptStyles.jsonEditor}
              value={jsonInput}
              onChange={handleTextareaChange}
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
          {(error ||
            warnings.length > 0 ||
            (characters.length > 0 && !scriptMeta) ||
            hasUnderscoresInIds() ||
            (characters.length > 0 && !isScriptSorted) ||
            hasCondensableRefs ||
            formatIssuesSummary ||
            needsFormatting) && (
            <div className={styles.messagesBar}>
              {/* JSON formatting recommendation */}
              {needsFormatting && !error && (
                <InfoMessage
                  message="JSON can be formatted for better readability."
                  buttonLabel="Format"
                  onClick={handleFormat}
                  buttonTitle="Format JSON with proper indentation"
                />
              )}
              {/* Missing _meta recommendation */}
              {characters.length > 0 && !scriptMeta && !error && (
                <InfoMessage
                  message={
                    <>
                      This script doesn't have a <code>_meta</code> entry. Adding one enables script
                      name tokens and better organization.
                    </>
                  }
                  buttonLabel="Add _meta"
                  onClick={() => addMetaToScript()}
                  buttonTitle="Add _meta entry to script"
                />
              )}
              {/* Underscore in IDs recommendation */}
              {hasUnderscoresInIds() && !error && (
                <InfoMessage
                  message={
                    <>
                      Some character IDs contain underscores. Official IDs don't use underscores
                      (e.g., <code>fortune_teller</code> → <code>fortuneteller</code>).
                    </>
                  }
                  buttonLabel="Remove underscores"
                  onClick={removeUnderscoresFromIds}
                  buttonTitle="Remove underscores from character IDs"
                />
              )}
              {/* Script not sorted recommendation */}
              {characters.length > 0 && !isScriptSorted && !error && (
                <InfoMessage
                  message="Script not sorted in Standard Order."
                  buttonLabel="Sort"
                  onClick={handleSort}
                  buttonTitle="Sort characters by Standard Amy Order"
                />
              )}
              {/* Condensable character references recommendation */}
              {hasCondensableRefs && !error && (
                <InfoMessage
                  message="Some official characters use object format. They can be simplified to string format for cleaner JSON."
                  buttonLabel="Condense Script"
                  onClick={handleCondenseScript}
                  buttonTitle='Convert object references like { "id": "clockmaker" } to string format "clockmaker"'
                />
              )}
              {/* Non-standard format issues in night reminders */}
              {formatIssuesSummary && !error && (
                <InfoMessage
                  message={
                    <>
                      Some night reminders use non-standard formats (e.g.,{' '}
                      <code>&lt;i class="reminder-token"&gt;</code> instead of{' '}
                      <code>:reminder:</code>, or <code>**text**</code> instead of{' '}
                      <code>*text*</code>).
                    </>
                  }
                  buttonLabel="Fix Formats"
                  onClick={handleFixFormats}
                  buttonTitle="Normalize HTML tags and legacy formats to :reminder: and *text*"
                />
              )}
              {/* Build combined messages list */}
              {(error || warnings.length > 0) &&
                (() => {
                  const allMessages = [
                    ...(error ? [{ type: 'error', text: error }] : []),
                    ...warnings.map((w) => ({ type: 'warning', text: w })),
                  ];
                  const visibleMessages = allMessages.slice(0, VISIBLE_MESSAGES_COUNT);
                  const hiddenMessages = allMessages.slice(VISIBLE_MESSAGES_COUNT);
                  const hasMore = hiddenMessages.length > 0;

                  return (
                    <>
                      <div className={styles.messagesDropdownUp}>
                        {visibleMessages.map((msg, i) => (
                          <div
                            key={i}
                            className={`${styles.messageItem} ${msg.type === 'error' ? styles.errorItem : styles.warningItem}`}
                          >
                            {msg.type === 'error' ? '⚠️' : 'ℹ️'} {msg.text}
                          </div>
                        ))}
                        {showAllMessages &&
                          hiddenMessages.map((msg, i) => (
                            <div
                              key={i + VISIBLE_MESSAGES_COUNT}
                              className={`${styles.messageItem} ${msg.type === 'error' ? styles.errorItem : styles.warningItem}`}
                            >
                              {msg.type === 'error' ? '⚠️' : 'ℹ️'} {msg.text}
                            </div>
                          ))}
                      </div>
                      {hasMore && (
                        <button
                          className={styles.showMoreBtn}
                          onClick={() => setShowAllMessages(!showAllMessages)}
                        >
                          {showAllMessages ? '▲ Show less' : `▼ Show ${hiddenMessages.length} more`}
                        </button>
                      )}
                    </>
                  );
                })()}
            </div>
          )}
        </div>
      </ViewLayout.Panel>
    </ViewLayout>
  );
}
