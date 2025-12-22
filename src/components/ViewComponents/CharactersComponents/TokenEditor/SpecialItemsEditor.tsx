/**
 * SpecialItemsEditor Component
 *
 * Manages the "special" array for app integration features.
 * Handles CRUD operations for special items with type, name, value, time, and global properties.
 *
 * @module components/CharactersComponents/TokenEditor/SpecialItemsEditor
 */

import { memo, useCallback } from 'react';
import styles from '@/styles/components/characterEditor/TokenEditor.module.css';
import type { Character } from '@/ts/types/index.js';
import {
  type CharacterWithSpecial,
  SPECIAL_GLOBALS,
  SPECIAL_NAMES,
  SPECIAL_TIMES,
  SPECIAL_TYPES,
  type SpecialItem,
} from './types';

interface SpecialItemsEditorProps {
  /** The character being edited */
  character: Character;
  /** Whether editing is disabled */
  disabled: boolean;
  /** Callback to update the character */
  onEditChange: (field: keyof Character, value: Character[keyof Character]) => void;
}

/**
 * Parses the special property to always return an array.
 */
function getSpecialArray(character: Character): SpecialItem[] {
  const charWithSpecial = character as CharacterWithSpecial;
  if (Array.isArray(charWithSpecial.special)) {
    return charWithSpecial.special;
  }
  if (charWithSpecial.special) {
    return [charWithSpecial.special];
  }
  return [];
}

/**
 * Parses a special item ensuring it has the correct structure.
 */
function parseSpecialItem(item: SpecialItem | SpecialItem[]): SpecialItem {
  if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
    return item;
  }
  return { type: 'selection', name: '' };
}

interface SpecialItemCardProps {
  item: SpecialItem;
  index: number;
  disabled: boolean;
  onUpdate: (updates: Partial<SpecialItem>) => void;
  onRemove: () => void;
}

const SpecialItemCard = memo(function SpecialItemCard({
  item,
  index,
  disabled,
  onUpdate,
  onRemove,
}: SpecialItemCardProps) {
  const itemType = String(item.type || 'selection');
  const itemName = String(item.name || '');
  const itemValue = item.value !== undefined ? String(item.value) : '';
  const itemTime = String(item.time || '');
  const itemGlobal = String(item.global || '');

  return (
    <div className={styles.specialItemCard}>
      <div className={styles.specialItemHeader}>
        <span className={styles.specialItemNumber}>#{index + 1}</span>
        <button
          type="button"
          className={`${styles.btnIcon} ${styles.btnDanger}`}
          onClick={onRemove}
          disabled={disabled}
          title={disabled ? 'Official character - cannot edit' : 'Remove special'}
        >
          ✕
        </button>
      </div>

      <div className={styles.specialItemFields}>
        <div className={styles.specialField}>
          <label htmlFor={`special-type-${index}`}>
            Type <span className={styles.required}>*</span>
          </label>
          <select
            id={`special-type-${index}`}
            value={itemType}
            disabled={disabled}
            onChange={(e) => onUpdate({ type: e.target.value })}
          >
            {SPECIAL_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.specialField}>
          <label htmlFor={`special-name-${index}`}>
            Name <span className={styles.required}>*</span>
          </label>
          <select
            id={`special-name-${index}`}
            value={itemName}
            disabled={disabled}
            onChange={(e) => onUpdate({ name: e.target.value })}
          >
            <option value="">-- Select --</option>
            {SPECIAL_NAMES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.specialField}>
          <label htmlFor={`special-value-${index}`}>Value</label>
          <input
            id={`special-value-${index}`}
            type="text"
            value={itemValue}
            disabled={disabled}
            onChange={(e) => {
              const val = e.target.value;
              // Try to parse as number if it looks like one
              const numVal = parseFloat(val);
              onUpdate({
                value: !Number.isNaN(numVal) && val === String(numVal) ? numVal : val,
              });
            }}
            placeholder="Text or number"
          />
        </div>

        <div className={styles.specialField}>
          <label htmlFor={`special-time-${index}`}>Time</label>
          <select
            id={`special-time-${index}`}
            value={itemTime}
            disabled={disabled}
            onChange={(e) => onUpdate({ time: e.target.value })}
          >
            <option value="">-- None --</option>
            {SPECIAL_TIMES.filter((t) => t).map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.specialField}>
          <label htmlFor={`special-global-${index}`}>Global</label>
          <select
            id={`special-global-${index}`}
            value={itemGlobal}
            disabled={disabled}
            onChange={(e) => onUpdate({ global: e.target.value })}
          >
            <option value="">-- None --</option>
            {SPECIAL_GLOBALS.filter((g) => g).map((global) => (
              <option key={global} value={global}>
                {global}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
});

/**
 * Editor for special items array.
 */
export const SpecialItemsEditor = memo(function SpecialItemsEditor({
  character,
  disabled,
  onEditChange,
}: SpecialItemsEditorProps) {
  const specialArray = getSpecialArray(character);

  const updateSpecialArray = useCallback(
    (newArray: SpecialItem[]) => {
      onEditChange('special' as keyof Character, newArray as unknown as Character[keyof Character]);
    },
    [onEditChange]
  );

  const handleUpdateItem = useCallback(
    (index: number, item: SpecialItem, updates: Partial<SpecialItem>) => {
      if (disabled) return;

      const newItem: SpecialItem = { ...item, ...updates };
      // Remove empty optional fields
      if (!newItem.value && newItem.value !== 0) delete newItem.value;
      if (!newItem.time) delete newItem.time;
      if (!newItem.global) delete newItem.global;

      const newArray = [...specialArray];
      newArray[index] = newItem;
      updateSpecialArray(newArray);
    },
    [disabled, specialArray, updateSpecialArray]
  );

  const handleRemoveItem = useCallback(
    (index: number) => {
      if (disabled) return;
      const newArray = [...specialArray];
      newArray.splice(index, 1);
      updateSpecialArray(newArray);
    },
    [disabled, specialArray, updateSpecialArray]
  );

  const handleAddItem = useCallback(() => {
    if (disabled) return;
    const newArray: SpecialItem[] = [...specialArray, { type: 'selection', name: 'grimoire' }];
    updateSpecialArray(newArray);
  }, [disabled, specialArray, updateSpecialArray]);

  return (
    <div className={styles.formGroup}>
      <span className={styles.label}>Special</span>
      <p className={styles.fieldHint}>Add special app integration features for this character.</p>

      <div className={styles.specialItemsList}>
        {specialArray.map((rawItem, index) => {
          const item = parseSpecialItem(rawItem);
          const itemType = String(item.type || 'selection');
          const itemName = String(item.name || '');

          // Generate stable key based on occurrence count
          const occurrenceIndex = specialArray.slice(0, index).filter((i) => {
            const prevItem = parseSpecialItem(i);
            return prevItem.type === itemType && prevItem.name === itemName;
          }).length;

          return (
            <SpecialItemCard
              key={`special-${itemType}-${itemName}-occurrence-${occurrenceIndex}`}
              item={item}
              index={index}
              disabled={disabled}
              onUpdate={(updates) => handleUpdateItem(index, item, updates)}
              onRemove={() => handleRemoveItem(index)}
            />
          );
        })}
      </div>

      <button
        type="button"
        className={`${styles.btnSecondary} ${styles.btnSm}`}
        onClick={handleAddItem}
        disabled={disabled}
      >
        + Add Special
      </button>
    </div>
  );
});

export default SpecialItemsEditor;
