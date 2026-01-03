/**
 * MetaEditor Component
 *
 * Editor for script metadata (_meta entry) including:
 * - Script name, version, author
 * - Logo and almanac URLs
 * - Bootlegger entries
 * - Background image URL
 * - Raw JSON editor
 *
 * @module components/CharactersComponents/MetaEditor
 */

import { type RefCallback, useCallback, useEffect, useRef, useState } from 'react';
import { JsonEditorPanel } from '@/components/Shared/Json/JsonEditorPanel';
import { useControlledField } from '@/hooks/ui/useControlledField';
import { useControlledFields } from '@/hooks/ui/useControlledFields';
import styles from '@/styles/components/characterEditor/MetaEditor.module.css';
import type { ScriptMeta } from '@/ts/types/index.js';

interface MetaEditorProps {
  scriptMeta: ScriptMeta | null;
  onMetaChange: (meta: ScriptMeta) => void;
  onRefreshPreview?: () => void;
  onDownloadAll?: () => void;
  onDownloadToken?: (tokenType: 'script_name' | 'almanac' | 'pandemonium') => void;
  isDownloading?: boolean;
}

const DEFAULT_META: ScriptMeta = {
  id: '_meta',
  name: '',
  author: '',
  almanac: '',
  logo: '',
};

export function MetaEditor({
  scriptMeta,
  onMetaChange,
  onRefreshPreview,
  onDownloadAll,
  onDownloadToken,
  isDownloading,
}: MetaEditorProps) {
  const meta = scriptMeta || DEFAULT_META;

  const [activeTab, setActiveTab] = useState<'info' | 'decoratives' | 'json'>('info');
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const downloadMenuRef = useRef<HTMLDivElement>(null);

  // ============================================
  // Controlled Fields for simple string inputs
  // ============================================

  const { fields: infoFields } = useControlledFields({
    values: {
      name: meta.name || '',
      version: meta.version || '',
      author: meta.author || '',
      logo: meta.logo || '',
      almanac: meta.almanac || '',
    },
    onChange: (field, value) => onMetaChange({ ...meta, [field]: value }),
    debounceMs: 500,
  });

  const background = useControlledField({
    value: meta.background || '',
    onChange: (value) => onMetaChange({ ...meta, background: value }),
    debounceMs: 500,
  });

  // ============================================
  // Bootlegger Array State (special handling)
  // ============================================

  const [localBootlegger, setLocalBootlegger] = useState<string[]>(meta.bootlegger || []);
  const [draggedBootleggerIndex, setDraggedBootleggerIndex] = useState<number | null>(null);
  const [dragOverBootleggerIndex, setDragOverBootleggerIndex] = useState<number | null>(null);

  // Track last sent bootlegger to avoid resetting on our own updates
  const lastSentBootleggerRef = useRef<string>(JSON.stringify(meta.bootlegger || []));
  const bootleggerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync bootlegger from props only when external change
  useEffect(() => {
    const bootleggerKey = JSON.stringify(meta.bootlegger || []);
    if (bootleggerKey !== lastSentBootleggerRef.current) {
      setLocalBootlegger(meta.bootlegger || []);
      lastSentBootleggerRef.current = bootleggerKey;
    }
  }, [meta.bootlegger]);

  // Cleanup bootlegger timer
  useEffect(
    () => () => {
      if (bootleggerTimerRef.current) clearTimeout(bootleggerTimerRef.current);
    },
    []
  );

  const updateBootlegger = useCallback(
    (newEntries: string[], immediate = false) => {
      setLocalBootlegger(newEntries);
      lastSentBootleggerRef.current = JSON.stringify(newEntries);

      if (immediate) {
        onMetaChange({ ...meta, bootlegger: newEntries });
      } else {
        if (bootleggerTimerRef.current) clearTimeout(bootleggerTimerRef.current);
        bootleggerTimerRef.current = setTimeout(() => {
          bootleggerTimerRef.current = null;
          onMetaChange({ ...meta, bootlegger: newEntries });
        }, 500);
      }
    },
    [meta, onMetaChange]
  );

  // ============================================
  // JSON Editor State
  // ============================================

  const getExportableMeta = useCallback((m: ScriptMeta) => {
    const { ...rest } = m;
    return rest;
  }, []);

  const [jsonText, setJsonText] = useState(() => JSON.stringify(getExportableMeta(meta), null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const jsonDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isEditingJsonRef = useRef(false);

  // Sync JSON text from props when not editing
  useEffect(() => {
    if (!isEditingJsonRef.current) {
      setJsonText(JSON.stringify(getExportableMeta(meta), null, 2));
      setJsonError(null);
    }
  }, [meta, getExportableMeta]);

  // Cleanup JSON timer
  useEffect(
    () => () => {
      if (jsonDebounceTimerRef.current) clearTimeout(jsonDebounceTimerRef.current);
    },
    []
  );

  const handleJsonChange = useCallback(
    (newText: string) => {
      setJsonText(newText);
      isEditingJsonRef.current = true;

      if (jsonDebounceTimerRef.current) clearTimeout(jsonDebounceTimerRef.current);

      jsonDebounceTimerRef.current = setTimeout(() => {
        try {
          const parsed = JSON.parse(newText);
          setJsonError(null);
          onMetaChange({ ...parsed, id: '_meta' });
          setTimeout(() => {
            isEditingJsonRef.current = false;
          }, 100);
        } catch (err) {
          setJsonError(err instanceof Error ? err.message : 'Invalid JSON');
        }
      }, 500);
    },
    [onMetaChange]
  );

  const handleFormatJson = useCallback(() => {
    try {
      const parsed = JSON.parse(jsonText);
      setJsonText(JSON.stringify(parsed, null, 2));
      setJsonError(null);
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : 'Invalid JSON');
    }
  }, [jsonText]);

  // ============================================
  // Auto-resize Textareas
  // ============================================

  const textareaRefs = useRef<Set<HTMLTextAreaElement>>(new Set());

  const resizeTextarea = useCallback((textarea: HTMLTextAreaElement | null) => {
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, []);

  const registerTextareaRef: RefCallback<HTMLTextAreaElement> = useCallback(
    (element) => {
      if (element) {
        textareaRefs.current.add(element);
        requestAnimationFrame(() => resizeTextarea(element));
      }
    },
    [resizeTextarea]
  );

  const handleTextareaInput = useCallback(
    (e: React.FormEvent<HTMLTextAreaElement>) => {
      resizeTextarea(e.currentTarget);
    },
    [resizeTextarea]
  );

  // Resize all textareas when bootlegger count changes
  const bootleggerCount = localBootlegger.length;
  useEffect(() => {
    // Trigger resize when bootlegger entries are added/removed
    if (bootleggerCount >= 0) {
      requestAnimationFrame(() => {
        textareaRefs.current.forEach(resizeTextarea);
      });
    }
  }, [bootleggerCount, resizeTextarea]);

  // ============================================
  // Download Menu
  // ============================================

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target as Node)) {
        setShowDownloadMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ============================================
  // Render
  // ============================================

  return (
    <div className={styles.editor}>
      <div className={styles.tabsContainer}>
        <div className={styles.tabsNav}>
          <button
            type="button"
            className={`${styles.tabButton} ${activeTab === 'info' ? styles.active : ''}`}
            onClick={() => setActiveTab('info')}
          >
            Script Information
          </button>
          <button
            type="button"
            className={`${styles.tabButton} ${activeTab === 'decoratives' ? styles.active : ''}`}
            onClick={() => setActiveTab('decoratives')}
          >
            Decoratives
          </button>
          <button
            type="button"
            className={`${styles.tabButton} ${activeTab === 'json' ? styles.active : ''}`}
            onClick={() => setActiveTab('json')}
          >
            JSON
          </button>
          {onDownloadAll && (
            <>
              <div className={styles.tabsSpacer} />
              <div className={styles.downloadGroup} ref={downloadMenuRef}>
                <button
                  type="button"
                  className={styles.tabsDownloadBtn}
                  onClick={onDownloadAll}
                  disabled={isDownloading}
                  title="Download all meta tokens as ZIP"
                >
                  📥 {isDownloading ? 'Downloading...' : 'Download'}
                </button>
                {onDownloadToken && (
                  <>
                    <button
                      type="button"
                      className={styles.downloadCaretBtn}
                      onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                      disabled={isDownloading}
                      title="More download options"
                    >
                      ▼
                    </button>
                    {showDownloadMenu && (
                      <div className={styles.downloadMenu}>
                        <button
                          type="button"
                          onClick={() => {
                            onDownloadToken('script_name');
                            setShowDownloadMenu(false);
                          }}
                        >
                          Script Name Token
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onDownloadToken('almanac');
                            setShowDownloadMenu(false);
                          }}
                        >
                          Almanac Token
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onDownloadToken('pandemonium');
                            setShowDownloadMenu(false);
                          }}
                        >
                          Pandemonium Token
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {activeTab === 'info' && (
          <div className={styles.tabContent}>
            <div className={styles.formGroup}>
              <label htmlFor="meta-id">ID</label>
              <input
                id="meta-id"
                type="text"
                value="_meta"
                disabled
                className={styles.linkedField}
                title="The meta ID is always '_meta'"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="meta-name">Script Name</label>
              <input
                id="meta-name"
                type="text"
                value={infoFields.name.localValue}
                onChange={(e) => infoFields.name.handleChange(e.target.value)}
                onBlur={infoFields.name.handleBlur}
                placeholder="Enter script name..."
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="meta-version">Version</label>
              <input
                id="meta-version"
                type="text"
                value={infoFields.version.localValue}
                onChange={(e) => infoFields.version.handleChange(e.target.value)}
                onBlur={infoFields.version.handleBlur}
                placeholder="e.g. 1.0.0"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="meta-author">Author</label>
              <input
                id="meta-author"
                type="text"
                value={infoFields.author.localValue}
                onChange={(e) => infoFields.author.handleChange(e.target.value)}
                onBlur={infoFields.author.handleBlur}
                placeholder="Enter author name..."
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="meta-logo">Logo URL</label>
              <input
                id="meta-logo"
                type="url"
                value={infoFields.logo.localValue}
                onChange={(e) => infoFields.logo.handleChange(e.target.value)}
                onBlur={infoFields.logo.handleBlur}
                placeholder="https://..."
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="meta-almanac">Almanac URL</label>
              <input
                id="meta-almanac"
                type="url"
                value={infoFields.almanac.localValue}
                onChange={(e) => infoFields.almanac.handleChange(e.target.value)}
                onBlur={infoFields.almanac.handleBlur}
                placeholder="https://..."
              />
            </div>

            {onRefreshPreview && (
              <div className={styles.formGroup}>
                <button type="button" className={styles.btnPrimary} onClick={onRefreshPreview}>
                  🔄 Regenerate Meta Tokens
                </button>
              </div>
            )}

            {/* Bootlegger Section */}
            <div className={styles.formGroup}>
              <span className={styles.label}>Bootlegger</span>
              <ul className={styles.bootleggerList} aria-label="Bootlegger entries">
                {localBootlegger.map((entry, index) => {
                  // Generate stable key: count occurrences of same entry before this index
                  const occurrenceIndex = localBootlegger
                    .slice(0, index)
                    .filter((e) => e === entry).length;
                  return (
                    <li
                      key={`bootlegger-${entry}-occurrence-${occurrenceIndex}`}
                      className={`${styles.bootleggerRow} ${draggedBootleggerIndex === index ? styles.dragging : ''} ${dragOverBootleggerIndex === index ? styles.dragOver : ''}`}
                      draggable={localBootlegger.length > 1}
                      onDragStart={(e) => {
                        setDraggedBootleggerIndex(index);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragEnd={() => {
                        setDraggedBootleggerIndex(null);
                        setDragOverBootleggerIndex(null);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (draggedBootleggerIndex !== null && draggedBootleggerIndex !== index) {
                          setDragOverBootleggerIndex(index);
                        }
                      }}
                      onDragLeave={() => setDragOverBootleggerIndex(null)}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggedBootleggerIndex !== null && draggedBootleggerIndex !== index) {
                          const newEntries = [...localBootlegger];
                          const [removed] = newEntries.splice(draggedBootleggerIndex, 1);
                          newEntries.splice(index, 0, removed);
                          updateBootlegger(newEntries, true);
                        }
                        setDraggedBootleggerIndex(null);
                        setDragOverBootleggerIndex(null);
                      }}
                    >
                      <span className={styles.dragHandle} title="Drag to reorder">
                        ⋮⋮
                      </span>
                      <textarea
                        ref={registerTextareaRef}
                        value={entry}
                        onChange={(e) => {
                          const newEntries = [...localBootlegger];
                          newEntries[index] = e.target.value;
                          updateBootlegger(newEntries);
                        }}
                        onInput={handleTextareaInput}
                        placeholder="Enter ability text..."
                        rows={1}
                        className={styles.bootleggerTextarea}
                      />
                      <button
                        type="button"
                        className={`${styles.btnIcon} ${styles.btnDanger}`}
                        onClick={() => {
                          const newEntries = localBootlegger.filter((_, i) => i !== index);
                          updateBootlegger(newEntries, true);
                        }}
                        title="Remove entry"
                      >
                        ✕
                      </button>
                    </li>
                  );
                })}
              </ul>
              <button
                type="button"
                className={`${styles.btnSecondary} ${styles.btnSm}`}
                onClick={() => {
                  updateBootlegger([...localBootlegger, ''], true);
                }}
              >
                + Add Bootlegger Entry
              </button>
            </div>
          </div>
        )}

        {activeTab === 'decoratives' && (
          <div className={styles.tabContent}>
            <div className={styles.formGroup}>
              <label htmlFor="meta-background">Background Image URL</label>
              <input
                id="meta-background"
                type="url"
                value={background.localValue}
                onChange={(e) => background.handleChange(e.target.value)}
                onBlur={background.handleBlur}
                placeholder="https://..."
              />
              <p className={styles.fieldHint}>Custom background image for the script</p>
            </div>

            <div className={styles.decorativesNote}>
              <p>
                Additional decorative settings for meta tokens are controlled by global appearance
                settings in the Options panel.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'json' && (
          <div className={styles.tabContent}>
            <div className={styles.jsonTabContent}>
              <div className={styles.jsonHeader}>
                <p className={styles.jsonDescription}>
                  Edit raw JSON for script metadata. The "id" field must be "_meta".
                </p>
                <div className={styles.jsonButtons}>
                  <button
                    type="button"
                    className={`${styles.btnSecondary} ${styles.btnSm}`}
                    onClick={handleFormatJson}
                    title="Format JSON"
                  >
                    🎨 Format
                  </button>
                  <button
                    type="button"
                    className={`${styles.btnSecondary} ${styles.btnSm}`}
                    onClick={() => {
                      navigator.clipboard.writeText(jsonText);
                    }}
                    title="Copy JSON to clipboard"
                  >
                    📋 Copy
                  </button>
                  <button
                    type="button"
                    className={`${styles.btnSecondary} ${styles.btnSm}`}
                    onClick={() => {
                      const blob = new Blob([jsonText], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = '_meta.json';
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }}
                    title="Download JSON file"
                  >
                    ⬇️ Download
                  </button>
                </div>
              </div>
              <JsonEditorPanel
                value={jsonText}
                onChange={handleJsonChange}
                onValidJson={() => {}}
                minHeight="300px"
                showError={false}
                className={styles.jsonEditorWrapper}
              />
              {jsonError && <div className={styles.jsonError}>⚠️ {jsonError}</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
