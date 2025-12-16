import { type RefCallback, useCallback, useEffect, useRef, useState } from 'react';
import styles from '../../../styles/components/characterEditor/MetaEditor.module.css';
import type { ScriptMeta } from '../../../ts/types/index.js';
import { JsonEditorPanel } from '../../Shared/Json/JsonEditorPanel';

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

  // Local state for inputs
  const [localName, setLocalName] = useState(meta.name || '');
  const [localVersion, setLocalVersion] = useState(meta.version || '');
  const [localAuthor, setLocalAuthor] = useState(meta.author || '');
  const [localLogo, setLocalLogo] = useState(meta.logo || '');
  const [localAlmanac, setLocalAlmanac] = useState(meta.almanac || '');
  const [localBackground, setLocalBackground] = useState(meta.background || '');
  const [_localSynopsis, setLocalSynopsis] = useState(meta.synopsis || '');
  const [_localOverview, setLocalOverview] = useState(meta.overview || '');
  const [_localChangelog, setLocalChangelog] = useState(meta.changelog || '');

  // Bootlegger state
  const [localBootlegger, setLocalBootlegger] = useState<string[]>(meta.bootlegger || []);
  const [draggedBootleggerIndex, setDraggedBootleggerIndex] = useState<number | null>(null);
  const [dragOverBootleggerIndex, setDragOverBootleggerIndex] = useState<number | null>(null);

  // JSON state - strip internal fields for display
  const getExportableMeta = (m: ScriptMeta) => {
    const { ...rest } = m;
    return rest;
  };

  const [jsonText, setJsonText] = useState(() => JSON.stringify(getExportableMeta(meta), null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const jsonDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isEditingJsonRef = useRef(false);

  // Auto-expand textarea refs
  const textareaRefs = useRef<Set<HTMLTextAreaElement>>(new Set());

  // Utility function to resize a single textarea to fit its content
  const resizeTextarea = useCallback((textarea: HTMLTextAreaElement | null) => {
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, []);

  // Callback ref to register textareas for auto-resize
  const registerTextareaRef: RefCallback<HTMLTextAreaElement> = useCallback(
    (element) => {
      if (element) {
        textareaRefs.current.add(element);
        requestAnimationFrame(() => resizeTextarea(element));
      }
    },
    [resizeTextarea]
  );

  // Handler for textarea input that also auto-resizes
  const handleTextareaInput = useCallback(
    (e: React.FormEvent<HTMLTextAreaElement>) => {
      resizeTextarea(e.currentTarget);
    },
    [resizeTextarea]
  );

  // Resize all textareas when bootlegger entries change
  useEffect(() => {
    requestAnimationFrame(() => {
      textareaRefs.current.forEach((textarea) => {
        resizeTextarea(textarea);
      });
    });
  }, [resizeTextarea]);

  // Close download menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target as Node)) {
        setShowDownloadMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync when meta changes externally
  useEffect(() => {
    const m = scriptMeta || DEFAULT_META;
    setLocalName(m.name || '');
    setLocalVersion(m.version || '');
    setLocalAuthor(m.author || '');
    setLocalLogo(m.logo || '');
    setLocalAlmanac(m.almanac || '');
    setLocalBackground(m.background || '');
    setLocalSynopsis(m.synopsis || '');
    setLocalOverview(m.overview || '');
    setLocalChangelog(m.changelog || '');
    setLocalBootlegger(m.bootlegger || []);
  }, [scriptMeta]);

  useEffect(() => {
    if (!isEditingJsonRef.current) {
      const m = scriptMeta || DEFAULT_META;
      setJsonText(JSON.stringify(getExportableMeta(m), null, 2));
      setJsonError(null);
    }
  }, [scriptMeta, getExportableMeta]);

  const debouncedUpdate = useCallback(
    (field: keyof ScriptMeta | string, value: any, delay = 500) => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        onMetaChange({ ...meta, [field]: value } as ScriptMeta);
      }, delay);
    },
    [meta, onMetaChange]
  );

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (jsonDebounceTimerRef.current) clearTimeout(jsonDebounceTimerRef.current);
    };
  }, []);

  const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
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
  };

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      setJsonText(JSON.stringify(parsed, null, 2));
      setJsonError(null);
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : 'Invalid JSON');
    }
  };

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
                value={localName}
                onChange={(e) => {
                  setLocalName(e.target.value);
                  debouncedUpdate('name', e.target.value);
                }}
                placeholder="Enter script name..."
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="meta-version">Version</label>
              <input
                id="meta-version"
                type="text"
                value={localVersion}
                onChange={(e) => {
                  setLocalVersion(e.target.value);
                  debouncedUpdate('version', e.target.value);
                }}
                placeholder="e.g. 1.0.0"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="meta-author">Author</label>
              <input
                id="meta-author"
                type="text"
                value={localAuthor}
                onChange={(e) => {
                  setLocalAuthor(e.target.value);
                  debouncedUpdate('author', e.target.value);
                }}
                placeholder="Enter author name..."
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="meta-logo">Logo URL</label>
              <input
                id="meta-logo"
                type="url"
                value={localLogo}
                onChange={(e) => {
                  setLocalLogo(e.target.value);
                  debouncedUpdate('logo', e.target.value);
                }}
                placeholder="https://..."
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="meta-almanac">Almanac URL</label>
              <input
                id="meta-almanac"
                type="url"
                value={localAlmanac}
                onChange={(e) => {
                  setLocalAlmanac(e.target.value);
                  debouncedUpdate('almanac', e.target.value);
                }}
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
              <label>Bootlegger</label>
              <div className={styles.bootleggerList}>
                {localBootlegger.map((entry, index) => (
                  <div
                    key={index}
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
                        setLocalBootlegger(newEntries);
                        onMetaChange({ ...meta, bootlegger: newEntries });
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
                        setLocalBootlegger(newEntries);
                        debouncedUpdate('bootlegger', newEntries);
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
                        setLocalBootlegger(newEntries);
                        onMetaChange({ ...meta, bootlegger: newEntries });
                      }}
                      title="Remove entry"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className={`${styles.btnSecondary} ${styles.btnSm}`}
                onClick={() => {
                  const newEntries = [...localBootlegger, ''];
                  setLocalBootlegger(newEntries);
                  onMetaChange({ ...meta, bootlegger: newEntries });
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
                value={localBackground}
                onChange={(e) => {
                  setLocalBackground(e.target.value);
                  debouncedUpdate('background', e.target.value);
                }}
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
