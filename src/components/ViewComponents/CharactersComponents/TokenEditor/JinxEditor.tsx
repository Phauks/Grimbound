/**
 * JinxEditor Component
 *
 * Row-based editor for managing character jinxes.
 * Displays the active character's name and allows selecting a target character
 * and editing the jinx reason text.
 *
 * Official characters have read-only jinxes (from sync data).
 * Custom characters can add, edit, and remove jinxes.
 *
 * @module components/CharactersComponents/TokenEditor/JinxEditor
 */

import { useMemo } from 'react';
import { useCharacterImageResolver } from '@/hooks/characters/useCharacterImageResolver';
import { useJinxOperations } from '@/hooks/characters/useJinxOperations';
import styles from '@/styles/components/characterEditor/TokenEditor.module.css';
import type { Character, Jinx } from '@/ts/types/index.js';
import { CharacterSelector } from './CharacterSelector';

// ============================================================================
// Types
// ============================================================================

/** Data needed to preview a jinx token */
export interface JinxPreviewData {
  /** The jinx being previewed */
  jinx: Jinx;
  /** The character that has the jinx */
  character: Character;
  /** The target character of the jinx */
  targetCharacter: Character;
}

export interface JinxEditorProps {
  /** The character being edited */
  character: Character;
  /** Whether editing is disabled (e.g., official characters) */
  disabled: boolean;
  /** Callback to update the character's jinxes */
  onEditChange: <K extends keyof Character>(field: K, value: Character[K]) => void;
  /** Characters currently on the script */
  scriptCharacters: Character[];
  /** All official characters from sync */
  officialCharacters: Character[];
  /** Callback to preview a jinx token (optional) */
  onPreviewJinx?: (data: JinxPreviewData | null) => void;
  /** Index of the currently previewed jinx (for highlighting) */
  previewedJinxIndex?: number | null;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getCharacterName(
  characterId: string,
  scriptCharacters: Character[],
  officialCharacters: Character[]
): string {
  if (!characterId) return 'Unknown';

  // Look in script characters first
  const scriptChar = scriptCharacters.find((c) => c.id === characterId);
  if (scriptChar) return scriptChar.name;

  // Then official characters
  const officialChar = officialCharacters.find((c) => c.id === characterId);
  if (officialChar) return officialChar.name;

  // Return the ID if not found
  return characterId;
}

function findCharacter(
  characterId: string,
  scriptCharacters: Character[],
  officialCharacters: Character[]
): Character | null {
  if (!characterId) return null;

  // Look in script characters first
  const scriptChar = scriptCharacters.find((c) => c.id === characterId);
  if (scriptChar) return scriptChar;

  // Then official characters
  const officialChar = officialCharacters.find((c) => c.id === characterId);
  if (officialChar) return officialChar;

  return null;
}

// ============================================================================
// JinxRow Component
// ============================================================================

interface JinxRowProps {
  jinx: Jinx;
  index: number;
  currentCharacter: Character;
  disabled: boolean;
  scriptCharacters: Character[];
  officialCharacters: Character[];
  excludeId: string;
  onUpdate: (updates: Partial<Jinx>) => void;
  onRemove: () => void;
  onPreviewClick?: () => void;
  isPreviewActive: boolean;
  /** Resolved image URL for target character */
  targetCharacterImageUrl?: string;
}

function JinxRow({
  jinx,
  index,
  currentCharacter,
  disabled,
  scriptCharacters,
  officialCharacters,
  excludeId,
  onUpdate,
  onRemove,
  onPreviewClick,
  isPreviewActive,
  targetCharacterImageUrl,
}: JinxRowProps) {
  const targetName = getCharacterName(jinx.id, scriptCharacters, officialCharacters);

  const handleCharacterChange = (characterId: string) => {
    onUpdate({ id: characterId });
  };

  const handleReasonChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate({ reason: event.target.value });
  };

  // Check if we have valid target to show preview button
  const hasValidTarget = jinx.id && jinx.id.trim() !== '';

  return (
    <div className={`${styles.jinxRow} ${disabled ? styles.jinxReadOnly : ''}`}>
      {/* Top row: Thumbnail, character names and actions */}
      <div className={styles.jinxHeader}>
        {/* Jinx thumbnail preview button - shows target character's icon */}
        {hasValidTarget && onPreviewClick && (
          <button
            type="button"
            className={`${styles.jinxThumbnail} ${isPreviewActive ? styles.jinxThumbnailActive : ''}`}
            onClick={onPreviewClick}
            title={`Click to preview jinx with ${targetName}`}
            aria-label={`Preview jinx ${index + 1} token`}
          >
            {targetCharacterImageUrl ? (
              <img
                src={targetCharacterImageUrl}
                alt={targetName}
                className={styles.jinxThumbnailImage}
              />
            ) : (
              <span className={styles.jinxThumbnailPlaceholder}>?</span>
            )}
          </button>
        )}

        {/* Current character (read-only display) */}
        <div className={styles.jinxCharacterDisplay}>
          <span>{currentCharacter.name}</span>
        </div>

        {/* Separator */}
        <span className={styles.jinxSeparator}>&</span>

        {/* Target character selector */}
        {disabled ? (
          <div className={styles.jinxCharacterDisplay}>
            <span>{targetName}</span>
          </div>
        ) : (
          <CharacterSelector
            value={jinx.id}
            onChange={handleCharacterChange}
            scriptCharacters={scriptCharacters}
            officialCharacters={officialCharacters}
            excludeId={excludeId}
            disabled={disabled}
            placeholder="Select target..."
            ariaLabel={`Jinx ${index + 1} target character`}
          />
        )}

        {/* Remove button */}
        {!disabled && (
          <button
            type="button"
            className={`${styles.btnIcon} ${styles.btnDanger}`}
            onClick={onRemove}
            title="Remove jinx"
            aria-label={`Remove jinx ${index + 1}`}
          >
            ✕
          </button>
        )}
      </div>

      {/* Bottom row: Jinx reason text */}
      <textarea
        className={styles.jinxReasonInput}
        value={jinx.reason}
        onChange={handleReasonChange}
        disabled={disabled}
        placeholder="Enter jinx rule text..."
        aria-label={`Jinx ${index + 1} reason`}
        rows={2}
      />
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function JinxEditor({
  character,
  disabled,
  onEditChange,
  scriptCharacters,
  officialCharacters,
  onPreviewJinx,
  previewedJinxIndex,
}: JinxEditorProps) {
  // Handle jinxes change
  const handleJinxesChange = (jinxes: Jinx[]) => {
    onEditChange('jinxes', jinxes);
  };

  // Use the jinx operations hook
  const { jinxes, add, update, remove } = useJinxOperations({
    character,
    onJinxesChange: handleJinxesChange,
    disabled,
  });

  // Build list of characters that need image resolution for thumbnails
  // useMemo required: used as useEffect dependency in useCharacterImageResolver
  const charactersForImageResolution = useMemo(() => {
    const chars: Character[] = [character];
    const seenIds = new Set<string>([character.id]);

    // Add all jinx target characters
    for (const jinx of jinxes) {
      if (jinx.id && !seenIds.has(jinx.id)) {
        const target = findCharacter(jinx.id, scriptCharacters, officialCharacters);
        if (target) {
          chars.push(target);
          seenIds.add(jinx.id);
        }
      }
    }

    return chars;
  }, [character, jinxes, scriptCharacters, officialCharacters]);

  // Resolve images for all jinx-related characters
  const { resolvedUrls: resolvedImageUrls } = useCharacterImageResolver({
    characters: charactersForImageResolution,
  });

  // Create stable update/remove handlers for each row
  const handleUpdate = (index: number, updates: Partial<Jinx>) => {
    update(index, updates);
  };

  const handleRemove = (index: number) => {
    remove(index);
  };

  // Find target character by ID
  const findTargetCharacter = (targetId: string): Character | null => {
    // Look in script characters first
    const scriptChar = scriptCharacters.find((c) => c.id === targetId);
    if (scriptChar) return scriptChar;

    // Then official characters
    const officialChar = officialCharacters.find((c) => c.id === targetId);
    if (officialChar) return officialChar;

    return null;
  };

  // Handle preview click for a jinx
  const handlePreviewClick = (index: number, jinx: Jinx) => {
    if (!onPreviewJinx) return;

    // If already previewing this jinx, clear the preview
    if (previewedJinxIndex === index) {
      onPreviewJinx(null);
      return;
    }

    const targetCharacter = findTargetCharacter(jinx.id);
    if (!targetCharacter) return;

    onPreviewJinx({
      jinx,
      character,
      targetCharacter,
    });
  };

  return (
    <div className={styles.formGroup}>
      <span className={styles.label}>Jinxes</span>
      <p className={styles.fieldHint}>
        {disabled
          ? 'Official character jinxes are read-only.'
          : 'Add special rules for character interactions.'}
      </p>

      {/* Jinx list */}
      {jinxes.length > 0 && (
        <div className={styles.jinxList}>
          {jinxes.map((jinx, index) => {
            // Find target character to get its UUID for image lookup
            const targetChar = findCharacter(jinx.id, scriptCharacters, officialCharacters);
            return (
              <JinxRow
                key={`jinx-${index}-${jinx.id}`}
                jinx={jinx}
                index={index}
                currentCharacter={character}
                disabled={disabled}
                scriptCharacters={scriptCharacters}
                officialCharacters={officialCharacters}
                excludeId={character.id}
                onUpdate={(updates) => handleUpdate(index, updates)}
                onRemove={() => handleRemove(index)}
                onPreviewClick={onPreviewJinx ? () => handlePreviewClick(index, jinx) : undefined}
                isPreviewActive={previewedJinxIndex === index}
                targetCharacterImageUrl={
                  targetChar?.uuid ? resolvedImageUrls.get(targetChar.uuid) : undefined
                }
              />
            );
          })}
        </div>
      )}

      {/* Empty state for no jinxes */}
      {jinxes.length === 0 && disabled && (
        <p className={styles.fieldHint} style={{ fontStyle: 'normal' }}>
          This character has no jinxes.
        </p>
      )}

      {/* Add button (only for custom characters) */}
      {!disabled && (
        <button type="button" className={`${styles.btnSecondary} ${styles.btnSm}`} onClick={add}>
          + Add Jinx
        </button>
      )}
    </div>
  );
}

export default JinxEditor;
