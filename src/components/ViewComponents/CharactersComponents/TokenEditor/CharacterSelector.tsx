/**
 * CharacterSelector Component
 *
 * A searchable combobox for selecting characters from multiple sources:
 * 1. Script Characters - Characters currently in the script (prioritized)
 * 2. Official Characters - All synced official characters
 * 3. Custom ID - Allow typing a custom character ID
 *
 * @module components/CharactersComponents/TokenEditor/CharacterSelector
 */

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styles from '@/styles/components/characterEditor/TokenEditor.module.css';
import type { Character } from '@/ts/types/index.js';

// ============================================================================
// Types
// ============================================================================

export interface CharacterSelectorProps {
  /** Currently selected character ID */
  value: string;
  /** Callback when a character is selected */
  onChange: (characterId: string) => void;
  /** Characters currently on the script */
  scriptCharacters: Character[];
  /** All official characters from sync */
  officialCharacters: Character[];
  /** Character ID to exclude (the character being edited) */
  excludeId?: string;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Aria label for accessibility */
  ariaLabel?: string;
}

interface GroupedCharacter {
  id: string;
  name: string;
  team?: string;
  source: 'script' | 'official' | 'custom';
}

// ============================================================================
// Constants
// ============================================================================

const CUSTOM_ID_PREFIX = 'custom:';

// ============================================================================
// Helper Functions
// ============================================================================

function groupCharacters(
  scriptCharacters: Character[],
  officialCharacters: Character[],
  excludeId: string | undefined,
  searchTerm: string
): {
  script: GroupedCharacter[];
  official: GroupedCharacter[];
} {
  const normalizedSearch = searchTerm.toLowerCase().trim();
  const scriptIds = new Set(scriptCharacters.map((c) => c.id));

  // Filter script characters
  const script = scriptCharacters
    .filter((c) => {
      if (excludeId && c.id === excludeId) return false;
      if (!normalizedSearch) return true;
      return (
        c.name.toLowerCase().includes(normalizedSearch) ||
        c.id.toLowerCase().includes(normalizedSearch)
      );
    })
    .map((c) => ({
      id: c.id,
      name: c.name,
      team: c.team,
      source: 'script' as const,
    }));

  // Filter official characters (excluding those already in script)
  const official = officialCharacters
    .filter((c) => {
      if (excludeId && c.id === excludeId) return false;
      if (scriptIds.has(c.id)) return false; // Already shown in script group
      if (!normalizedSearch) return true;
      return (
        c.name.toLowerCase().includes(normalizedSearch) ||
        c.id.toLowerCase().includes(normalizedSearch)
      );
    })
    .map((c) => ({
      id: c.id,
      name: c.name,
      team: c.team,
      source: 'official' as const,
    }));

  return { script, official };
}

function getDisplayName(
  characterId: string,
  scriptCharacters: Character[],
  officialCharacters: Character[]
): string {
  if (!characterId) return '';

  // Check if it's a custom ID
  if (characterId.startsWith(CUSTOM_ID_PREFIX)) {
    return characterId.slice(CUSTOM_ID_PREFIX.length);
  }

  // Look in script characters first
  const scriptChar = scriptCharacters.find((c) => c.id === characterId);
  if (scriptChar) return scriptChar.name;

  // Then official characters
  const officialChar = officialCharacters.find((c) => c.id === characterId);
  if (officialChar) return officialChar.name;

  // Return the ID if not found
  return characterId;
}

// ============================================================================
// Character Option Component
// ============================================================================

interface CharacterOptionProps {
  character: GroupedCharacter;
  isSelected: boolean;
  isHighlighted: boolean;
  onSelect: () => void;
  onMouseEnter: () => void;
}

const CharacterOption = memo(function CharacterOption({
  character,
  isSelected,
  isHighlighted,
  onSelect,
  onMouseEnter,
}: CharacterOptionProps) {
  return (
    <button
      type="button"
      className={`${styles.characterOption} ${isSelected ? styles.characterOptionSelected : ''} ${isHighlighted ? styles.characterOptionHighlighted : ''}`}
      onClick={onSelect}
      onMouseEnter={onMouseEnter}
      role="option"
      aria-selected={isSelected}
    >
      <span className={styles.characterOptionName}>{character.name}</span>
      {character.team && (
        <span
          className={`${styles.characterOptionTeam} ${styles[`team${capitalize(character.team)}`]}`}
        >
          {character.team}
        </span>
      )}
    </button>
  );
});

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ============================================================================
// Main Component
// ============================================================================

export const CharacterSelector = memo(function CharacterSelector({
  value,
  onChange,
  scriptCharacters,
  officialCharacters,
  excludeId,
  disabled = false,
  placeholder = 'Select character...',
  ariaLabel = 'Select character',
}: CharacterSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Get display name for the current value
  const displayValue = useMemo(
    () => getDisplayName(value, scriptCharacters, officialCharacters),
    [value, scriptCharacters, officialCharacters]
  );

  // Group and filter characters based on search
  const { script, official } = useMemo(
    () => groupCharacters(scriptCharacters, officialCharacters, excludeId, searchTerm),
    [scriptCharacters, officialCharacters, excludeId, searchTerm]
  );

  // Flat list for keyboard navigation
  const flatList = useMemo(() => [...script, ...official], [script, official]);

  // Determine if we should show custom option
  const showCustomOption = useMemo(() => {
    if (!searchTerm.trim()) return false;
    const normalizedSearch = searchTerm.toLowerCase().trim();
    // Only show custom option if search term doesn't match any existing character
    const existsInScript = scriptCharacters.some(
      (c) => c.id.toLowerCase() === normalizedSearch || c.name.toLowerCase() === normalizedSearch
    );
    const existsInOfficial = officialCharacters.some(
      (c) => c.id.toLowerCase() === normalizedSearch || c.name.toLowerCase() === normalizedSearch
    );
    return !(existsInScript || existsInOfficial);
  }, [searchTerm, scriptCharacters, officialCharacters]);

  // Handle click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (disabled) return;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          if (isOpen) {
            const maxIndex = flatList.length + (showCustomOption ? 1 : 0) - 1;
            setHighlightedIndex((prev) => Math.min(prev + 1, maxIndex));
          } else {
            setIsOpen(true);
          }
          break;

        case 'ArrowUp':
          event.preventDefault();
          setHighlightedIndex((prev) => Math.max(prev - 1, 0));
          break;

        case 'Enter':
          event.preventDefault();
          if (isOpen) {
            if (highlightedIndex < flatList.length) {
              onChange(flatList[highlightedIndex].id);
            } else if (showCustomOption) {
              onChange(searchTerm.trim());
            }
            setIsOpen(false);
            setSearchTerm('');
          } else {
            setIsOpen(true);
          }
          break;

        case 'Escape':
          event.preventDefault();
          setIsOpen(false);
          setSearchTerm('');
          break;

        case 'Tab':
          setIsOpen(false);
          setSearchTerm('');
          break;

        default:
          // Allow other keys to pass through
          break;
      }
    },
    [disabled, isOpen, flatList, showCustomOption, highlightedIndex, onChange, searchTerm]
  );

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(event.target.value);
      setHighlightedIndex(0);
      if (!isOpen) setIsOpen(true);
    },
    [isOpen]
  );

  const handleInputFocus = useCallback(() => {
    if (!disabled) {
      setIsOpen(true);
    }
  }, [disabled]);

  const handleSelectCharacter = useCallback(
    (characterId: string) => {
      onChange(characterId);
      setIsOpen(false);
      setSearchTerm('');
      inputRef.current?.blur();
    },
    [onChange]
  );

  const handleSelectCustom = useCallback(() => {
    if (searchTerm.trim()) {
      onChange(searchTerm.trim());
      setIsOpen(false);
      setSearchTerm('');
      inputRef.current?.blur();
    }
  }, [onChange, searchTerm]);

  // Reset highlighted index when search term changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: Intentionally reset on searchTerm change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchTerm]);

  // Scroll highlighted item into view when it changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: Intentionally scroll on highlightedIndex change
  useEffect(() => {
    if (isOpen && listRef.current) {
      const highlighted = listRef.current.querySelector(`.${styles.characterOptionHighlighted}`);
      if (highlighted) {
        highlighted.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  return (
    <div
      ref={containerRef}
      className={`${styles.characterSelector} ${disabled ? styles.characterSelectorDisabled : ''}`}
    >
      <input
        ref={inputRef}
        type="text"
        className={styles.characterSelectorInput}
        value={isOpen ? searchTerm : displayValue}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onKeyDown={handleKeyDown}
        placeholder={value ? displayValue : placeholder}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        role="combobox"
        autoComplete="off"
      />

      {isOpen && (
        <div
          ref={listRef}
          className={styles.characterSelectorDropdown}
          role="listbox"
          aria-label="Character options"
        >
          {/* Script Characters Group */}
          {script.length > 0 && (
            <div className={styles.characterGroup}>
              <div className={styles.characterGroupLabel}>On Script</div>
              {script.map((char, index) => (
                <CharacterOption
                  key={`script-${char.id}`}
                  character={char}
                  isSelected={char.id === value}
                  isHighlighted={highlightedIndex === index}
                  onSelect={() => handleSelectCharacter(char.id)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                />
              ))}
            </div>
          )}

          {/* Official Characters Group */}
          {official.length > 0 && (
            <div className={styles.characterGroup}>
              <div className={styles.characterGroupLabel}>Official Characters</div>
              {official.map((char, index) => (
                <CharacterOption
                  key={`official-${char.id}`}
                  character={char}
                  isSelected={char.id === value}
                  isHighlighted={highlightedIndex === script.length + index}
                  onSelect={() => handleSelectCharacter(char.id)}
                  onMouseEnter={() => setHighlightedIndex(script.length + index)}
                />
              ))}
            </div>
          )}

          {/* Custom ID Option */}
          {showCustomOption && (
            <div className={styles.characterGroup}>
              <div className={styles.characterGroupLabel}>Custom ID</div>
              <button
                type="button"
                className={`${styles.characterOption} ${highlightedIndex === flatList.length ? styles.characterOptionHighlighted : ''}`}
                onClick={handleSelectCustom}
                onMouseEnter={() => setHighlightedIndex(flatList.length)}
                role="option"
              >
                <span className={styles.characterOptionName}>
                  Use "{searchTerm.trim()}" as custom ID
                </span>
              </button>
            </div>
          )}

          {/* Empty state */}
          {script.length === 0 && official.length === 0 && !showCustomOption && (
            <div className={styles.characterSelectorEmpty}>
              {searchTerm ? 'No characters found' : 'Type to search or enter custom ID'}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default CharacterSelector;
