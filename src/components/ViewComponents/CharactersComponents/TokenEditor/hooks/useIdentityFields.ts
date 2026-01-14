/**
 * useIdentityFields - Hook for managing character identity (Name, ID, Team)
 *
 * Handles ID linking, name changes, uniqueness validation, and team selection.
 *
 * @module components/CharactersComponents/TokenEditor/hooks/useIdentityFields
 */

import { useEffect, useRef, useState } from 'react';
import { useControlledField } from '@/hooks/ui/useControlledField';
import { TIMING } from '@/ts/constants.js';
import type { Character } from '@/ts/types/index.js';
import { ensureUniqueId, getOtherCharacterIds } from '@/ts/utils/index.js';
import { generateRandomName, nameToId } from '@/ts/utils/nameGenerator';

export interface UseIdentityFieldsOptions {
  character: Character;
  isOfficial: boolean;
  isIdLinked: boolean;
  onIdLinkChange: (linked: boolean) => void;
  onEditChange: (field: keyof Character, value: Character[keyof Character]) => void;
  onReplaceCharacter?: (character: Character) => void;
  /** All characters on the script (for uniqueness checking) */
  scriptCharacters: Character[];
  /** Toast function for notifications */
  addToast: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export interface UseIdentityFieldsResult {
  localName: string;
  localId: string;
  handleToggleIdLink: () => void;
  handleRandomName: () => void;
  handleNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleNameBlur: () => void;
  handleIdChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleTeamChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

export function useIdentityFields({
  character,
  isOfficial,
  isIdLinked,
  onIdLinkChange,
  onEditChange,
  onReplaceCharacter,
  scriptCharacters,
  addToast,
}: UseIdentityFieldsOptions): UseIdentityFieldsResult {
  // Refs for tracking last sent values (needed for special cases like ID linking)
  const lastSentNameRef = useRef<string>(character.name || '');
  const lastSentIdRef = useRef<string>(character.id || '');

  // Use controlled field hook for name with custom onChange
  // Note: We handle the ID linking logic in updateNameWithIdLink
  const name = useControlledField({
    value: character.name || '',
    onChange: (value) => {
      // This is called on debounced change - for simple name changes
      // ID linking is handled in handleNameBlur via updateNameWithIdLink
      if (!isIdLinked) {
        lastSentNameRef.current = value;
        onEditChange('name', value);
      }
    },
    debounceMs: TIMING.METADATA_DEBOUNCE,
    disabled: isOfficial,
  });

  // ID field uses simple state since it has special linked behavior
  const [localId, setLocalId] = useState(character.id || '');

  // Sync ID with prop changes - only if change came from external source
  useEffect(() => {
    const propId = character.id || '';
    if (propId !== lastSentIdRef.current) {
      setLocalId(propId);
      lastSentIdRef.current = propId;
    }
  }, [character.id]);

  const handleToggleIdLink = () => {
    if (isOfficial) return;

    // If turning link OFF, always allow
    if (isIdLinked) {
      onIdLinkChange(false);
      return;
    }

    // Trying to turn link ON - check if it's safe
    const nameBasedId = nameToId(character.name);

    // If current ID already matches name-derived ID, allow linking
    if (character.id === nameBasedId) {
      onIdLinkChange(true);
      return;
    }

    // Current ID doesn't match name - check if switching would cause collision
    const otherIds = getOtherCharacterIds(scriptCharacters, character.uuid);
    if (otherIds.some((id) => id.toLowerCase() === nameBasedId.toLowerCase())) {
      // Would cause collision - don't allow linking
      addToast(`Cannot link: ID '${nameBasedId}' is already used by another character`, 'warning');
      return;
    }

    // No collision - update ID to match name and enable link
    if (onReplaceCharacter) {
      onReplaceCharacter({ ...character, id: nameBasedId });
      setLocalId(nameBasedId);
      lastSentIdRef.current = nameBasedId;
      onIdLinkChange(true);
    }
  };

  const updateNameWithIdLink = (newName: string) => {
    if (isIdLinked && onReplaceCharacter) {
      // Get other character IDs (excluding current character)
      const otherIds = getOtherCharacterIds(scriptCharacters, character.uuid);
      const proposedId = nameToId(newName);

      // Ensure unique ID
      const { id: uniqueId, wasRenamed, originalId } = ensureUniqueId(proposedId, otherIds);

      // Update local ID state to reflect the unique ID
      setLocalId(uniqueId);
      lastSentNameRef.current = newName;
      lastSentIdRef.current = uniqueId;

      // Replace character with unique ID
      onReplaceCharacter({ ...character, name: newName, id: uniqueId });

      // Show toast if renamed
      if (wasRenamed) {
        addToast(`ID '${originalId}' already in use, renamed to '${uniqueId}'`, 'info');
        // Break ID link since we had to modify the ID
        onIdLinkChange(false);
      }
      return;
    }
    lastSentNameRef.current = newName;
    onEditChange('name', newName);
  };

  const handleRandomName = () => {
    if (isOfficial) return;
    const newName = generateRandomName();
    name.handleChange(newName);
    updateNameWithIdLink(newName);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    name.handleChange(e.target.value);
  };

  const handleNameBlur = () => {
    if (isOfficial) return;
    // On blur, handle ID linking if enabled
    updateNameWithIdLink(name.localValue);
  };

  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isIdLinked || isOfficial) return;

    const proposedId = e.target.value;

    // Get other character IDs (excluding current character)
    const otherIds = getOtherCharacterIds(scriptCharacters, character.uuid);

    // Ensure unique ID
    const { id: uniqueId, wasRenamed, originalId } = ensureUniqueId(proposedId, otherIds);

    setLocalId(uniqueId);
    lastSentIdRef.current = uniqueId;
    onEditChange('id', uniqueId);

    // Show toast if renamed
    if (wasRenamed) {
      addToast(`ID '${originalId}' already in use, renamed to '${uniqueId}'`, 'info');
    }
  };

  const handleTeamChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!isOfficial) onEditChange('team', e.target.value);
  };

  return {
    localName: name.localValue,
    localId,
    handleToggleIdLink,
    handleRandomName,
    handleNameChange,
    handleNameBlur,
    handleIdChange,
    handleTeamChange,
  };
}
