/**
 * JsonTabContent Component
 *
 * The "JSON" tab of the TokenEditor containing:
 * - Sub-tabs: Character JSON, Metadata JSON
 * - JSON editor with syntax highlighting (CodeMirror)
 * - Format, Copy, Download buttons
 *
 * @module components/CharactersComponents/TokenEditor/JsonTabContent
 */

import { memo, useCallback, useMemo, useState } from 'react';
import type { Character, DecorativeOverrides } from '@/ts/types/index.js';
import { useJsonEditor } from '@/hooks';
import { CodeMirrorEditor } from '@/components/Shared/Json/CodeMirrorEditor';
import { type JsonSubTab } from './types';
import styles from '@/styles/components/characterEditor/TokenEditor.module.css';

interface JsonTabContentProps {
  character: Character;
  isOfficial: boolean;
  onReplaceCharacter?: (character: Character) => void;
  charUuid: string;
  metadata: {
    idLinkedToName: boolean;
    decoratives?: DecorativeOverrides;
  };
}

/**
 * Strips internal-only fields from character for display.
 */
function getDisplayCharacter(character: Character): Partial<Character> {
  const {
    uuid,
    source,
    ...displayable
  } = character as Character & { uuid?: string; source?: string };
  return displayable;
}

export const JsonTabContent = memo(function JsonTabContent({
  character,
  isOfficial,
  onReplaceCharacter,
  charUuid,
  metadata,
}: JsonTabContentProps) {
  const [subTab, setSubTab] = useState<JsonSubTab>('character');

  // Character JSON editor
  const characterJson = useJsonEditor({
    data: character,
    transformForDisplay: getDisplayCharacter,
    onApply: (parsed) => {
      if (isOfficial || !onReplaceCharacter) return;
      onReplaceCharacter({ ...parsed, uuid: charUuid } as Character);
    },
    preserveFields: ['uuid'],
    debounceMs: 500,
  });

  // Metadata content (read-only)
  const metadataContent = useMemo(() => {
    const metaObj = {
      uuid: charUuid,
      idLinkedToName: metadata.idLinkedToName,
      decoratives: metadata.decoratives || {},
    };
    return JSON.stringify(metaObj, null, 2);
  }, [charUuid, metadata.idLinkedToName, metadata.decoratives]);

  const handleCopyMetadata = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(metadataContent);
    } catch {
      // Clipboard API may fail in some contexts
    }
  }, [metadataContent]);

  return (
    <div className={styles.jsonTabContent}>
      {/* Sub-tabs */}
      <div className={styles.jsonSubTabs}>
        <button
          type="button"
          className={`${styles.jsonSubTab} ${subTab === 'character' ? styles.active : ''}`}
          onClick={() => setSubTab('character')}
        >
          Character
        </button>
        <button
          type="button"
          className={`${styles.jsonSubTab} ${subTab === 'metadata' ? styles.active : ''}`}
          onClick={() => setSubTab('metadata')}
        >
          Metadata
        </button>
      </div>

      {/* Character JSON Sub-tab */}
      {subTab === 'character' && (
        <>
          <div className={styles.jsonHeader}>
            <p className={styles.jsonDescription}>
              {isOfficial
                ? 'View the character data. Official characters cannot be edited via JSON.'
                : 'Edit the raw JSON data. Changes are applied after a short delay.'}
            </p>
            <div className={styles.jsonButtons}>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={characterJson.format}
                title="Format JSON"
              >
                Format
              </button>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => characterJson.copy()}
                title="Copy to clipboard"
              >
                Copy
              </button>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() =>
                  characterJson.download(`${character.id || 'character'}.json`)
                }
                title="Download as file"
              >
                Download
              </button>
            </div>
          </div>

          <div className={styles.jsonEditorWrapper}>
            <CodeMirrorEditor
              value={characterJson.text}
              onChange={characterJson.onChange}
              disabled={isOfficial}
              placeholder="Enter character JSON..."
            />
          </div>

          {characterJson.error && (
            <div className={styles.jsonError}>{characterJson.error}</div>
          )}
        </>
      )}

      {/* Metadata Sub-tab */}
      {subTab === 'metadata' && (
        <div className={styles.metadataView}>
          <div className={styles.jsonHeader}>
            <p className={styles.jsonDescription}>
              Internal metadata for this character. UUID and linked settings are managed by the editor.
            </p>
            <div className={styles.jsonButtons}>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={handleCopyMetadata}
                title="Copy metadata"
              >
                Copy
              </button>
            </div>
          </div>

          <div className={styles.metadataContent}>
            <div className={styles.metadataField}>
              <label>UUID</label>
              <code>{charUuid}</code>
            </div>
            <div className={styles.metadataField}>
              <label>ID Linked to Name</label>
              <code>{metadata.idLinkedToName ? 'true' : 'false'}</code>
            </div>
            {metadata.decoratives && Object.keys(metadata.decoratives).length > 0 && (
              <div className={styles.metadataField}>
                <label>Decorative Overrides</label>
                <pre className={styles.metadataJson}>
                  {JSON.stringify(metadata.decoratives, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

export default JsonTabContent;
