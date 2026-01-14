/**
 * useAbilityField - Hook for managing ability text and setup toggle
 *
 * Handles ability text editing, setup bracket parsing, and auto-resize.
 *
 * @module components/CharactersComponents/TokenEditor/hooks/useAbilityField
 */

import { useState } from 'react';
import { useAutoResizeTextarea } from '@/hooks/ui/useAutoResizeTextarea';
import { useControlledField } from '@/hooks/ui/useControlledField';
import { TIMING } from '@/ts/constants.js';
import type { Character } from '@/ts/types/index.js';
import { combineAbilityWithSetup, hasSetupBrackets, splitAbilityText } from '@/ts/utils/index.js';

export interface UseAbilityFieldOptions {
  character: Character;
  isOfficial: boolean;
  onEditChange: (field: keyof Character, value: Character[keyof Character]) => void;
}

export interface UseAbilityFieldResult {
  displayAbility: string;
  localSetupText: string;
  abilityTextareaRef: React.RefObject<HTMLTextAreaElement | null>;
  handleAbilityChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleAbilityBlur: () => void;
  handleSetupTextChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSetupTextBlur: () => void;
  handleSetupChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function useAbilityField({
  character,
  isOfficial,
  onEditChange,
}: UseAbilityFieldOptions): UseAbilityFieldResult {
  // Track the raw ability text and setup text separately
  const [localSetupText, setLocalSetupText] = useState('');

  // Use controlled field hook for ability text
  // Note: The hook handles debouncing and cursor protection
  const ability = useControlledField({
    value: character.ability || '',
    onChange: (value) => onEditChange('ability', value),
    debounceMs: TIMING.METADATA_DEBOUNCE,
    disabled: isOfficial,
  });

  // Split ability text when setup is enabled
  const abilitySplit = character.setup ? splitAbilityText(ability.localValue) : null;

  // Display value for ability textarea (without brackets when setup enabled)
  const displayAbility =
    character.setup && abilitySplit ? abilitySplit.abilityWithoutSetup : ability.localValue;

  // Auto-resize for ability textarea
  const abilityTextareaRef = useAutoResizeTextarea({
    value: displayAbility,
    enabled: !isOfficial,
    minRows: 3,
  });

  // Track previous abilitySplit for render-time comparison (React's recommended pattern)
  const [prevAbilitySplitJson, setPrevAbilitySplitJson] = useState(() =>
    JSON.stringify(abilitySplit)
  );

  // Sync setup text during render when abilitySplit changes (faster than useEffect)
  const abilitySplitJson = JSON.stringify(abilitySplit);
  if (abilitySplitJson !== prevAbilitySplitJson) {
    setPrevAbilitySplitJson(abilitySplitJson);
    if (abilitySplit) {
      setLocalSetupText(abilitySplit.setupContent);
    }
  }

  /**
   * Auto-detect setup brackets in ability text
   * Called on blur to avoid mid-typing interruptions
   */
  const autoDetectSetup = (abilityText: string) => {
    if (isOfficial) return;
    const hasSetup = hasSetupBrackets(abilityText);
    if (hasSetup && !character.setup) {
      onEditChange('setup', true);
      const split = splitAbilityText(abilityText);
      setLocalSetupText(split.setupContent);
    }
  };

  const handleAbilityChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (isOfficial) return;
    const newAbilityPart = e.target.value;

    if (character.setup && localSetupText) {
      const combined = combineAbilityWithSetup(newAbilityPart, localSetupText);
      ability.handleChange(combined);
    } else {
      ability.handleChange(newAbilityPart);
    }
  };

  const handleAbilityBlur = () => {
    if (isOfficial) return;
    if (character.setup && localSetupText) {
      const combined = combineAbilityWithSetup(displayAbility, localSetupText);
      ability.handleChange(combined);
    }
    ability.handleBlur();
    // Auto-detect setup brackets on blur (moved from useEffect to event handler)
    autoDetectSetup(ability.localValue);
  };

  const handleSetupTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isOfficial) return;
    const newSetupText = e.target.value;
    setLocalSetupText(newSetupText);

    const combined = combineAbilityWithSetup(
      abilitySplit?.abilityWithoutSetup || ability.localValue,
      newSetupText
    );
    ability.handleChange(combined);
  };

  const handleSetupTextBlur = () => {
    if (isOfficial) return;
    const combined = combineAbilityWithSetup(
      abilitySplit?.abilityWithoutSetup || ability.localValue,
      localSetupText
    );
    ability.handleChange(combined);
    ability.handleBlur();
  };

  const handleSetupChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isOfficial) return;
    const newSetupValue = e.target.checked;
    onEditChange('setup', newSetupValue);

    if (newSetupValue) {
      if (!hasSetupBrackets(ability.localValue)) {
        const newAbility = `${ability.localValue.trim()} []`;
        ability.handleChange(newAbility);
        onEditChange('ability', newAbility);
        setLocalSetupText('');
      }
    } else {
      const split = splitAbilityText(ability.localValue);
      const newAbility = split.abilityWithoutSetup.replace(/\s+/g, ' ').trim();
      ability.handleChange(newAbility);
      onEditChange('ability', newAbility);
      setLocalSetupText('');
    }
  };

  return {
    displayAbility,
    localSetupText,
    abilityTextareaRef,
    handleAbilityChange,
    handleAbilityBlur,
    handleSetupTextChange,
    handleSetupTextBlur,
    handleSetupChange,
  };
}
