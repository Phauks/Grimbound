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

import { memo, type RefCallback, useCallback, useEffect, useRef } from 'react';
import { useControlledFields } from '@/hooks/ui/useControlledFields';
import styles from '@/styles/components/characterEditor/TokenEditor.module.css';
import type { Character } from '@/ts/types/index.js';

interface AlmanacTabContentProps {
  character: Character;
  isOfficial: boolean;
  onEditChange: (field: keyof Character, value: Character[keyof Character]) => void;
  /** Callback to convert official character to custom */
  onConvertToCustom?: () => void;
}

interface AlmanacFieldConfig {
  id: string;
  label: string;
  field: 'flavor' | 'overview' | 'examples' | 'howToRun' | 'tips';
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
  onConvertToCustom,
}: AlmanacTabContentProps) {
  // Use centralized controlled fields hook for all almanac fields
  const { fields } = useControlledFields({
    values: {
      flavor: character.flavor || '',
      overview: character.overview || '',
      examples: character.examples || '',
      howToRun: character.howToRun || '',
      tips: character.tips || '',
    },
    onChange: (field, value) => onEditChange(field as keyof Character, value),
    debounceMs: 500,
    disabled: isOfficial,
  });

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

  // Resize textareas when character changes (using uuid as trigger)
  const characterUuid = character.uuid;
  useEffect(() => {
    // Trigger resize when switching to a different character
    if (characterUuid) {
      requestAnimationFrame(() => {
        textareaRefs.current.forEach(resizeTextarea);
      });
    }
  }, [characterUuid, resizeTextarea]);

  return (
    <div className={`${styles.tabContent} ${isOfficial ? styles.disabled : ''}`}>
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

      {/* Scrollable form content */}
      <div className={styles.tabContentBody}>
        {ALMANAC_FIELDS.map((config) => (
          <AlmanacField
            key={config.id}
            config={config}
            value={fields[config.field].localValue}
            disabled={isOfficial}
            onChange={fields[config.field].handleChange}
            onBlur={fields[config.field].handleBlur}
            registerRef={registerTextareaRef}
            onInput={handleTextareaInput}
          />
        ))}
      </div>
    </div>
  );
});

export default AlmanacTabContent;
