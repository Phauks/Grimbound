/**
 * AlmanacTabContent Component
 *
 * The "Almanac" tab of the TokenEditor containing:
 * - Flavor text
 * - Overview
 * - Examples
 * - How to Run
 * - Tips
 *
 * @module components/CharactersComponents/TokenEditor/AlmanacTabContent
 */

import { memo, useCallback, useEffect, useRef, useState, type RefCallback } from 'react';
import type { Character } from '@/ts/types/index.js';
import styles from '@/styles/components/characterEditor/TokenEditor.module.css';

interface AlmanacTabContentProps {
  character: Character;
  isOfficial: boolean;
  onEditChange: (field: keyof Character, value: Character[keyof Character]) => void;
}

interface AlmanacFieldConfig {
  id: string;
  label: string;
  field: keyof Character;
  placeholder: string;
  rows: number;
}

const ALMANAC_FIELDS: AlmanacFieldConfig[] = [
  {
    id: 'edit-flavor',
    label: 'Flavor Text',
    field: 'flavor',
    placeholder: 'Flavor quote or description',
    rows: 2,
  },
  {
    id: 'edit-overview',
    label: 'Overview',
    field: 'overview',
    placeholder: "Overview of the character's role and strategy",
    rows: 4,
  },
  {
    id: 'edit-examples',
    label: 'Examples',
    field: 'examples',
    placeholder: 'Example scenarios and interactions',
    rows: 4,
  },
  {
    id: 'edit-howtorun',
    label: 'How to Run',
    field: 'howToRun',
    placeholder: 'Instructions for Storytellers on how to run this character',
    rows: 4,
  },
  {
    id: 'edit-tips',
    label: 'Tips',
    field: 'tips',
    placeholder: 'Tips for playing this character effectively',
    rows: 4,
  },
];

interface AlmanacFieldProps {
  config: AlmanacFieldConfig;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
  registerRef: RefCallback<HTMLTextAreaElement>;
  onInput: (e: React.FormEvent<HTMLTextAreaElement>) => void;
}

const AlmanacField = memo(function AlmanacField({
  config,
  value,
  disabled,
  onChange,
  onBlur,
  registerRef,
  onInput,
}: AlmanacFieldProps) {
  return (
    <div className={styles.formGroup}>
      <label htmlFor={config.id}>{config.label}</label>
      <textarea
        ref={registerRef}
        id={config.id}
        className={styles.autoExpand}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onInput={onInput}
        onBlur={onBlur}
        placeholder={config.placeholder}
        rows={config.rows}
      />
    </div>
  );
});

export const AlmanacTabContent = memo(function AlmanacTabContent({
  character,
  isOfficial,
  onEditChange,
}: AlmanacTabContentProps) {
  // Local state for each field
  const [localValues, setLocalValues] = useState<Record<string, string>>({
    flavor: character.flavor || '',
    overview: character.overview || '',
    examples: character.examples || '',
    howToRun: character.howToRun || '',
    tips: character.tips || '',
  });

  // Debounce timer ref
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-resize textareas
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

  // Sync local state when character changes
  useEffect(() => {
    setLocalValues({
      flavor: character.flavor || '',
      overview: character.overview || '',
      examples: character.examples || '',
      howToRun: character.howToRun || '',
      tips: character.tips || '',
    });
  }, [
    character.flavor,
    character.overview,
    character.examples,
    character.howToRun,
    character.tips,
    character.uuid,
  ]);

  // Resize textareas when character changes
  useEffect(() => {
    requestAnimationFrame(() => {
      textareaRefs.current.forEach(resizeTextarea);
    });
  }, [resizeTextarea]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Create change handler for a specific field
  const createChangeHandler = useCallback(
    (field: keyof Character) => (value: string) => {
      if (isOfficial) return;

      setLocalValues((prev) => ({ ...prev, [field]: value }));

      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Debounce the update
      debounceTimerRef.current = setTimeout(() => {
        onEditChange(field, value);
      }, 500);
    },
    [isOfficial, onEditChange]
  );

  // Create blur handler for a specific field
  const createBlurHandler = useCallback(
    (field: keyof Character) => () => {
      if (isOfficial) return;
      onEditChange(field, localValues[field] || '');
    },
    [isOfficial, localValues, onEditChange]
  );

  return (
    <div className={`${styles.tabContent} ${isOfficial ? styles.disabled : ''}`}>
      {ALMANAC_FIELDS.map((config) => (
        <AlmanacField
          key={config.id}
          config={config}
          value={localValues[config.field] || ''}
          disabled={isOfficial}
          onChange={createChangeHandler(config.field)}
          onBlur={createBlurHandler(config.field)}
          registerRef={registerTextareaRef}
          onInput={handleTextareaInput}
        />
      ))}
    </div>
  );
});

export default AlmanacTabContent;
