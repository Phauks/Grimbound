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
import { CodeMirrorEditor } from '@/components/Shared/Json/CodeMirrorEditor';
import { useJsonEditor } from '@/hooks';
import styles from '@/styles/components/characterEditor/TokenEditor.module.css';
import type { Character, DecorativeOverrides } from '@/ts/types/index.js';
import type { JsonSubTab } from './types';

interface JsonTabContentProps {
  character: Character;
  isOfficial: boolean;
  onReplaceCharacter?: (character: Character) => void;
  charUuid: string;
  metadata: {
    idLinkedToName: boolean;
    decoratives?: DecorativeOverrides;
  };
  /** Callback to convert official character to custom */
  onConvertToCustom?: () => void;
}

/**
 * Strips internal-only fields from character for display.
 */
function getDisplayCharacter(character: Character): Partial<Character> {
  const { uuid, source, ...displayable } = character as Character & {
    uuid?: string;
    source?: string;
  };
  return displayable;
}

export const JsonTabContent = memo(function JsonTabContent({
  character,
  isOfficial,
  onReplaceCharacter,
  charUuid,
  metadata,
  onConvertToCustom,
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
    <div className={`${styles.jsonTabContent} ${isOfficial ? styles.disabled : ''}`}>
      {/* Official Character Banner - fixed above scroll area */}
      {isOfficial && (
        <div
          className={styles.officialBanner}
          title="This is an official character. Editing is disabled to preserve the original data."
        >
          <div className={styles.officialLeft}>
            <span className={styles.officialBadge}>Official</span>
            <a
              href={`https://wiki.bloodontheclocktower.com/${encodeURIComponent(character.name)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.wikiLink}
              title="View on Wiki"
            >
              <span className={styles.srOnly}>View on Wiki</span>
              <svg
                className={styles.wikiIcon}
                viewBox="0 0 24 24"
                fill="currentColor"
                width="16"
                height="16"
                aria-hidden="true"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
              </svg>
            </a>
          </div>
          <div className={styles.officialActions}>
            <button
              type="button"
              className={styles.convertButton}
              onClick={onConvertToCustom}
              title="Create a custom copy that can be edited"
            >
              Convert to Custom
            </button>
          </div>
        </div>
      )}

      {/* Content body */}
      <div className={styles.jsonTabContentBody}>
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
            </div>

            <div className={styles.jsonEditorWrapper}>
              <CodeMirrorEditor
                value={characterJson.text}
                onChange={characterJson.onChange}
                disabled={isOfficial}
                placeholder="Enter character JSON..."
              />
            </div>

            {characterJson.error && <div className={styles.jsonError}>{characterJson.error}</div>}
          </>
        )}

        {/* Metadata Sub-tab */}
        {subTab === 'metadata' && (
          <div className={styles.metadataView}>
            <div className={styles.jsonHeader}>
              <p className={styles.jsonDescription}>
                Internal metadata for this character. UUID and linked settings are managed by the
                editor.
              </p>
              <div className={styles.jsonButtons}>
                <button
                  type="button"
                  className={styles.btnIcon}
                  onClick={handleCopyMetadata}
                  title="Copy metadata"
                >
                  📋
                </button>
              </div>
            </div>

            <div className={styles.metadataContent}>
              <div className={styles.metadataField}>
                <span className={styles.metadataLabel}>UUID</span>
                <code>{charUuid}</code>
              </div>
              <div className={styles.metadataField}>
                <span className={styles.metadataLabel}>ID Linked to Name</span>
                <code>{metadata.idLinkedToName ? 'true' : 'false'}</code>
              </div>
              {metadata.decoratives && Object.keys(metadata.decoratives).length > 0 && (
                <div className={styles.metadataField}>
                  <span className={styles.metadataLabel}>Decorative Overrides</span>
                  <pre className={styles.metadataJson}>
                    {JSON.stringify(metadata.decoratives, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default JsonTabContent;
