/**
 * JsonView Component
 *
 * Main view for JSON script input, validation, and transformation.
 * Allows users to paste, upload, or load example scripts for token generation.
 *
 * @module components/Views/JsonView
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { type DownloadItem, useDownloadsContext } from '@/contexts/DownloadsContext';
import { useProjectContext } from '@/contexts/ProjectContext';
import { useTokenContext } from '@/contexts/TokenContext';
import { useScriptData, useScriptTransformations, useTokenGenerator } from '@/hooks';
import layoutStyles from '@/styles/components/layout/ViewLayout.module.css';
import styles from '@/styles/components/views/Views.module.css';
import CONFIG from '@/ts/config.js';
import { logger } from '@/ts/utils/logger.js';
import { ViewLayout } from '@/components/Layout/ViewLayout';
import { CodeMirrorEditor, type EditorControls } from '@/components/Shared/Json/CodeMirrorEditor';
import { Button } from '@/components/Shared/UI/Button';
import { ScriptMessagesBar } from '@/components/ViewComponents/JsonComponents';

interface JsonViewProps {
  onGenerate?: () => void;
}

export function JsonView({ onGenerate }: JsonViewProps) {
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
  } = useTokenContext();
  const { currentProject } = useProjectContext();
  const { setDownloads, clearDownloads } = useDownloadsContext();
  const {
    loadExampleScriptByName,
    parseJson,
    addMetaToScript,
    hasSeparatorsInIds,
    removeSeparatorsFromIds,
    updateScript,
  } = useScriptData();
  const { generateTokens } = useTokenGenerator();

  // Local state
  const [isDragging, setIsDragging] = useState(false);
  const [selectedExample, setSelectedExample] = useState('');
  const [forceRegenerate, setForceRegenerate] = useState(0);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorControlsRef = useRef<EditorControls | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const parseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousJsonRef = useRef('');
  const previousProjectIdRef = useRef<string | null>(null);
  const isExternalChangeRef = useRef(false);

  // Script transformations hook
  const {
    isScriptSorted,
    needsFormatting,
    hasCondensableRefs,
    formatIssuesSummary,
    handleFormat,
    handleSort,
    handleCondenseScript,
    handleFixFormats,
  } = useScriptTransformations({
    onForceRegenerate: () => setForceRegenerate((prev) => prev + 1),
  });

  // Get example scripts from config, strip .json extension for display
  const exampleScripts = CONFIG.EXAMPLE_SCRIPTS.map((filename: string) =>
    filename.replace(/\.json$/, '')
  );

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
    logger.warn('JsonView', 'Auto-generate effect triggered', {
      isLoading,
      charactersLength: characters.length,
      jsonInputLength: jsonInput.length,
      prevJsonLength: previousJsonRef.current.length,
      jsonChanged: previousJsonRef.current !== jsonInput,
      forceRegenerate,
    });

    if (isLoading || !characters.length) {
      logger.debug('JsonView', 'Skipping - loading or no characters');
      return;
    }

    // Normalize project ID to avoid null vs undefined comparison issues
    const currentProjectId = currentProject?.id ?? null;

    // Force regenerate if project changed (handles project activation)
    const projectChanged = previousProjectIdRef.current !== currentProjectId;

    // Skip if JSON hasn't changed AND project hasn't changed AND not force regenerating
    if (!projectChanged && previousJsonRef.current === jsonInput && forceRegenerate === 0) {
      logger.debug('JsonView', 'Skipping - no changes detected');
      return;
    }

    logger.warn('JsonView', 'Scheduling token generation', {
      projectChanged,
      jsonChanged: previousJsonRef.current !== jsonInput,
      forceRegenerate,
    });

    previousJsonRef.current = jsonInput;
    previousProjectIdRef.current = currentProjectId;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      logger.warn('JsonView', 'Debounce timer fired - calling generateTokens');
      await generateTokens();
      onGenerate?.();
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [
    jsonInput,
    characters.length,
    isLoading,
    generateTokens,
    onGenerate,
    forceRegenerate,
    currentProject?.id,
  ]);

  // Handlers
  const handleTextareaChange = useCallback(
    (newValue: string) => {
      setJsonInput(newValue);
      setError(null);
      setWarnings([]);
    },
    [setJsonInput, setError, setWarnings]
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
        category: 'json',
        sourceView: 'json',
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
          {/* Editor Area */}
          <section
            className={`${styles.editorWrapper} ${isDragging ? styles.dragging : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            aria-label="JSON editor drop area"
          >
            <CodeMirrorEditor
              value={jsonInput}
              onChange={handleTextareaChange}
              placeholder="Paste your Blood on the Clocktower script JSON here, or drag and drop a .json file..."
              minHeight="100%"
              onEditorReady={(controls) => {
                editorControlsRef.current = controls;
              }}
            />
            {isDragging && (
              <div className={styles.dropOverlay}>
                <span>Drop JSON file here</span>
              </div>
            )}
          </section>

          {/* Messages Bar - errors, warnings, and recommendations */}
          <ScriptMessagesBar
            error={error}
            warnings={warnings}
            characterCount={characters.length}
            hasScriptMeta={!!scriptMeta}
            hasSeparatorsInIds={hasSeparatorsInIds()}
            isScriptSorted={isScriptSorted}
            needsFormatting={needsFormatting}
            hasCondensableRefs={hasCondensableRefs}
            formatIssuesSummary={formatIssuesSummary}
            onFormat={handleFormat}
            onSort={handleSort}
            onCondense={handleCondenseScript}
            onFixFormats={handleFixFormats}
            onAddMeta={() => addMetaToScript()}
            onRemoveSeparators={removeSeparatorsFromIds}
          />
        </div>
      </ViewLayout.Panel>
    </ViewLayout>
  );
}
