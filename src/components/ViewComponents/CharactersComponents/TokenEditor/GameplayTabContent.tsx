/**
 * GameplayTabContent Component
 *
 * The "Gameplay" tab of the TokenEditor containing:
 * - Character ID and Name fields
 * - Team selector
 * - Image URLs with drag-and-drop reordering
 * - Ability text with setup toggle
 * - Reminders with grouping and drag-and-drop
 * - Night order reminders with format validation
 * - Special items for app integration
 *
 * @module components/CharactersComponents/TokenEditor/GameplayTabContent
 */

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useDraggableList, useGroupedReminders } from '@/hooks/index.js';
import { useResolvedImageUrls } from '@/hooks/sync/useResolvedImageUrls';
import { useAutoResizeTextarea } from '@/hooks/ui/useAutoResizeTextarea';
import styles from '@/styles/components/characterEditor/TokenEditor.module.css';
import viewStyles from '@/styles/components/views/Views.module.css';
import type { Character } from '@/ts/types/index.js';
import { generateRandomName, nameToId } from '@/ts/utils/nameGenerator';
import { NightOrderField } from './NightOrderField';
import { SortableImageUrlRow } from './SortableImageUrlRow';
import { SortableReminderRow } from './SortableReminderRow';
import { SpecialItemsEditor } from './SpecialItemsEditor';
import { TEAM_SELECT_CLASS_MAP } from './types';

// ============================================
// Types
// ============================================

interface GameplayTabContentProps {
  character: Character;
  isOfficial: boolean;
  onEditChange: (field: keyof Character, value: Character[keyof Character]) => void;
  onReplaceCharacter?: (character: Character) => void;
  onRefreshPreview?: () => void;
  onPreviewVariant?: (imageUrl: string | undefined) => void;
  charUuid: string;
  isIdLinked: boolean;
  onIdLinkChange: (linked: boolean) => void;
}

// ============================================
// Constants
// ============================================

const DEBOUNCE_MS = 500;
const IMAGE_DEBOUNCE_MS = 800;

// ============================================
// Main Component
// ============================================

export const GameplayTabContent = memo(function GameplayTabContent({
  character,
  isOfficial,
  onEditChange,
  onReplaceCharacter,
  onRefreshPreview,
  onPreviewVariant,
  charUuid: _charUuid,
  isIdLinked,
  onIdLinkChange,
}: GameplayTabContentProps) {
  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ============================================
  // Local State
  // ============================================

  const [localName, setLocalName] = useState(character.name || '');
  const [localId, setLocalId] = useState(character.id || '');
  const [localAbility, setLocalAbility] = useState(character.ability || '');
  const [localImages, setLocalImages] = useState<string[]>(
    Array.isArray(character.image) ? character.image : [character.image || '']
  );
  const [localFirstNightReminder, setLocalFirstNightReminder] = useState(
    character.firstNightReminder || ''
  );
  const [localOtherNightReminder, setLocalOtherNightReminder] = useState(
    character.otherNightReminder || ''
  );
  const [localFirstNight, setLocalFirstNight] = useState(character.firstNight ?? 0);
  const [localOtherNight, setLocalOtherNight] = useState(character.otherNight ?? 0);
  const [previewVariantIndex, setPreviewVariantIndex] = useState<number | null>(null);

  // Auto-resize for ability textarea
  const abilityTextareaRef = useAutoResizeTextarea({
    value: localAbility,
    enabled: !isOfficial,
    minRows: 3,
  });

  // Resolved image URLs
  const { resolvedUrls: resolvedImageUrls } = useResolvedImageUrls({
    imageUrls: localImages,
    enabled: true,
  });

  // ============================================
  // Sync Local State from Character Prop
  // ============================================

  useEffect(() => {
    setLocalName(character.name || '');
    setLocalId(character.id || '');
    setLocalAbility(character.ability || '');
    setLocalImages(Array.isArray(character.image) ? character.image : [character.image || '']);
    setLocalFirstNightReminder(character.firstNightReminder || '');
    setLocalOtherNightReminder(character.otherNightReminder || '');
    setLocalFirstNight(character.firstNight ?? 0);
    setLocalOtherNight(character.otherNight ?? 0);
    setPreviewVariantIndex(null);
  }, [
    character.name,
    character.id,
    character.ability,
    character.image,
    character.firstNightReminder,
    character.otherNightReminder,
    character.firstNight,
    character.otherNight,
  ]);

  // Auto-detect setup text
  useEffect(() => {
    if (isOfficial) return;
    const hasSetupText = /\[.*?\]/.test(localAbility);
    if (hasSetupText && !character.setup) {
      onEditChange('setup', true);
    }
  }, [localAbility, character.setup, isOfficial, onEditChange]);

  // ============================================
  // Debounced Update Helper
  // ============================================

  const debouncedUpdate = useCallback(
    (field: keyof Character, value: Character[keyof Character], delay = DEBOUNCE_MS) => {
      const timer = setTimeout(() => {
        onEditChange(field, value);
      }, delay);
      return () => clearTimeout(timer);
    },
    [onEditChange]
  );

  // ============================================
  // Reminders Management
  // ============================================

  const reminders = useGroupedReminders({
    reminders: character.reminders || [],
    onChange: (newReminders) => onEditChange('reminders', newReminders),
    disabled: isOfficial,
  });

  // ============================================
  // Drag-and-Drop Handlers
  // ============================================

  const imageDnd = useDraggableList({
    items: localImages,
    getItemId: (_, index) => `image-${index}`,
    onReorder: (newImages) => {
      setLocalImages(newImages);
      onEditChange('image', newImages.length === 1 ? newImages[0] : newImages);
    },
    disabled: isOfficial || localImages.length <= 1,
  });

  const reminderDnd = useDraggableList({
    items: reminders.grouped,
    getItemId: (item, index) => `reminder-${item.text}-${index}`,
    onReorder: reminders.reorder,
    disabled: isOfficial || reminders.grouped.length <= 1,
  });

  // ============================================
  // Event Handlers
  // ============================================

  const handleToggleIdLink = useCallback(() => {
    if (isOfficial) return;
    onIdLinkChange(!isIdLinked);
  }, [isOfficial, isIdLinked, onIdLinkChange]);

  const handleRandomName = useCallback(() => {
    if (isOfficial) return;
    const newName = generateRandomName();
    setLocalName(newName);
    if (isIdLinked && onReplaceCharacter) {
      onReplaceCharacter({ ...character, name: newName, id: nameToId(newName) });
    } else {
      onEditChange('name', newName);
    }
  }, [isOfficial, isIdLinked, onReplaceCharacter, character, onEditChange]);

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (isOfficial) return;
      const newName = e.target.value;
      setLocalName(newName);
      debouncedUpdate('name', newName);
    },
    [isOfficial, debouncedUpdate]
  );

  const handleNameBlur = useCallback(() => {
    if (isOfficial) return;
    if (isIdLinked && onReplaceCharacter) {
      onReplaceCharacter({ ...character, name: localName, id: nameToId(localName) });
    } else {
      onEditChange('name', localName);
    }
  }, [isOfficial, isIdLinked, onReplaceCharacter, character, localName, onEditChange]);

  const handleImageUpdate = useCallback(
    (index: number, value: string) => {
      if (isOfficial) return;
      setLocalImages((prev) => {
        const newImages = [...prev];
        newImages[index] = value;
        return newImages;
      });
      // Debounce image updates
      debouncedUpdate(
        'image',
        localImages.length === 1 ? value : localImages.map((img, i) => (i === index ? value : img)),
        IMAGE_DEBOUNCE_MS
      );
    },
    [isOfficial, localImages, debouncedUpdate]
  );

  const handleImageBlur = useCallback(() => {
    if (isOfficial) return;
    onEditChange('image', localImages.length === 1 ? localImages[0] : localImages);
  }, [isOfficial, localImages, onEditChange]);

  const handleImagePreview = useCallback(
    (index: number, url: string) => {
      if (onPreviewVariant) {
        setPreviewVariantIndex(index);
        onPreviewVariant(url);
      }
    },
    [onPreviewVariant]
  );

  const handleAddImage = useCallback(() => {
    if (isOfficial) return;
    const newImages = [...localImages, ''];
    setLocalImages(newImages);
    onEditChange('image', newImages);
  }, [isOfficial, localImages, onEditChange]);

  const handleRemoveImage = useCallback(
    (index: number) => {
      if (isOfficial) return;
      if (localImages.length <= 1) {
        setLocalImages(['']);
        onEditChange('image', '');
      } else {
        const newImages = localImages.filter((_, i) => i !== index);
        setLocalImages(newImages);
        onEditChange('image', newImages.length === 1 ? newImages[0] : newImages);
      }
    },
    [isOfficial, localImages, onEditChange]
  );

  const handleRefreshImages = useCallback(() => {
    if (isOfficial) return;
    onEditChange('image', localImages.length === 1 ? localImages[0] : localImages);
    if (onRefreshPreview) {
      setTimeout(() => onRefreshPreview(), 50);
    }
  }, [isOfficial, localImages, onEditChange, onRefreshPreview]);

  const handleAbilityChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (isOfficial) return;
      setLocalAbility(e.target.value);
      debouncedUpdate('ability', e.target.value);
    },
    [isOfficial, debouncedUpdate]
  );

  const handleAbilityKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (isOfficial) return;
      if (e.key === '[') {
        e.preventDefault();
        const textarea = e.currentTarget;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const before = localAbility.slice(0, start);
        const after = localAbility.slice(end);
        const newValue = `${before}[]${after}`;
        setLocalAbility(newValue);
        debouncedUpdate('ability', newValue);
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 1;
        });
      }
    },
    [isOfficial, localAbility, debouncedUpdate]
  );

  const handleSetupChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (isOfficial) return;
      const newSetupValue = e.target.checked;
      onEditChange('setup', newSetupValue);

      if (newSetupValue && !/\[.*?\]/.test(localAbility)) {
        const newAbility = `${localAbility.trim()} []`;
        setLocalAbility(newAbility);
        onEditChange('ability', newAbility);
      } else if (!newSetupValue && /\[.*?\]/.test(localAbility)) {
        const newAbility = localAbility
          .replace(/\[([^\]]*)\]/g, '$1')
          .replace(/\s+/g, ' ')
          .trim();
        setLocalAbility(newAbility);
        onEditChange('ability', newAbility);
      }
    },
    [isOfficial, localAbility, onEditChange]
  );

  // Night order handlers
  const handleFirstNightReminderChange = useCallback(
    (value: string) => {
      setLocalFirstNightReminder(value);
      debouncedUpdate('firstNightReminder', value);
    },
    [debouncedUpdate]
  );

  const handleFirstNightReminderBlur = useCallback(
    (value: string) => {
      onEditChange('firstNightReminder', value);
    },
    [onEditChange]
  );

  const handleFirstNightOrderChange = useCallback((value: number) => {
    setLocalFirstNight(value);
  }, []);

  const handleFirstNightOrderBlur = useCallback(
    (value: number) => {
      onEditChange('firstNight', value);
    },
    [onEditChange]
  );

  const handleOtherNightReminderChange = useCallback(
    (value: string) => {
      setLocalOtherNightReminder(value);
      debouncedUpdate('otherNightReminder', value);
    },
    [debouncedUpdate]
  );

  const handleOtherNightReminderBlur = useCallback(
    (value: string) => {
      onEditChange('otherNightReminder', value);
    },
    [onEditChange]
  );

  const handleOtherNightOrderChange = useCallback((value: number) => {
    setLocalOtherNight(value);
  }, []);

  const handleOtherNightOrderBlur = useCallback(
    (value: number) => {
      onEditChange('otherNight', value);
    },
    [onEditChange]
  );

  // Team styling
  const teamClass = useMemo(() => {
    const classKey = TEAM_SELECT_CLASS_MAP[character.team];
    return classKey ? styles[classKey] : '';
  }, [character.team]);

  // ============================================
  // Render
  // ============================================

  return (
    <div className={`${styles.tabContent} ${isOfficial ? styles.disabled : ''}`}>
      {/* Character ID */}
      <div className={styles.formGroup}>
        <div className={styles.labelWithAction}>
          <label htmlFor="edit-id">Character ID</label>
          <button
            type="button"
            className={`${styles.iconButton} ${isIdLinked ? styles.linked : ''}`}
            onClick={handleToggleIdLink}
            disabled={isOfficial}
            title={
              isOfficial
                ? 'Official character - cannot edit'
                : isIdLinked
                  ? 'ID linked to name (click to unlink)'
                  : 'ID not linked (click to link to name)'
            }
          >
            {isIdLinked ? '🔗' : '⛓️‍💥'}
          </button>
        </div>
        <input
          id="edit-id"
          type="text"
          value={isIdLinked ? nameToId(localName) : localId}
          readOnly={isIdLinked || isOfficial}
          disabled={isIdLinked || isOfficial}
          className={isIdLinked ? styles.linkedField : ''}
          onChange={(e) => {
            if (!(isIdLinked || isOfficial)) {
              setLocalId(e.target.value);
              onEditChange('id', e.target.value);
            }
          }}
          title={
            isOfficial
              ? 'Official character - cannot edit'
              : isIdLinked
                ? 'Unlink to edit ID manually'
                : 'Unique identifier for this character'
          }
        />
      </div>

      {/* Character Name */}
      <div className={styles.formGroup}>
        <div className={styles.labelWithAction}>
          <label htmlFor="edit-name">Character Name</label>
          <button
            type="button"
            className={styles.iconButton}
            onClick={handleRandomName}
            disabled={isOfficial}
            title={isOfficial ? 'Official character - cannot edit' : 'Generate random name'}
          >
            🎲
          </button>
        </div>
        <input
          id="edit-name"
          type="text"
          value={localName}
          disabled={isOfficial}
          onChange={handleNameChange}
          onBlur={handleNameBlur}
          placeholder="Character name"
        />
      </div>

      {/* Team */}
      <div className={`${styles.formGroup} ${styles.teamSelectGroup} ${teamClass}`}>
        <label htmlFor="edit-team">Team</label>
        <select
          id="edit-team"
          value={character.team}
          disabled={isOfficial}
          onChange={(e) => {
            if (!isOfficial) onEditChange('team', e.target.value);
          }}
        >
          <option value="townsfolk">Townsfolk</option>
          <option value="outsider">Outsider</option>
          <option value="minion">Minion</option>
          <option value="demon">Demon</option>
          <option value="traveller">Traveller</option>
          <option value="fabled">Fabled</option>
          <option value="loric">Loric</option>
        </select>
      </div>

      {/* Images */}
      <div className={styles.formGroup}>
        <span className={styles.label} id="image-urls-label">
          Image
        </span>
        <p className={styles.fieldHint}>Add one or more image URLs. Drag to reorder.</p>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragStart={imageDnd.onDragStart}
          onDragEnd={imageDnd.onDragEnd}
          onDragCancel={imageDnd.onDragCancel}
        >
          <SortableContext items={imageDnd.itemIds} strategy={verticalListSortingStrategy}>
            <ul className={styles.imageUrlsList} aria-labelledby="image-urls-label">
              {localImages.map((url, index) => (
                <SortableImageUrlRow
                  key={imageDnd.itemIds[index]}
                  id={String(imageDnd.itemIds[index])}
                  url={url}
                  resolvedUrl={resolvedImageUrls[index]}
                  index={index}
                  isPreviewActive={
                    previewVariantIndex === index || (previewVariantIndex === null && index === 0)
                  }
                  disabled={isOfficial}
                  canDrag={localImages.length > 1}
                  onChange={handleImageUpdate}
                  onBlur={handleImageBlur}
                  onPreviewClick={handleImagePreview}
                  onRemove={handleRemoveImage}
                  isLastItem={localImages.length <= 1}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>

        <div className={styles.imageUrlActions}>
          <button
            type="button"
            className={`${styles.btnSecondary} ${styles.btnSm}`}
            onClick={handleAddImage}
            disabled={isOfficial}
          >
            + Add Image URL
          </button>
          <button
            type="button"
            className={`${styles.btnSecondary} ${styles.btnSm}`}
            onClick={handleRefreshImages}
            disabled={isOfficial}
            title={
              isOfficial
                ? 'Official character - cannot edit'
                : 'Refresh preview with current image URLs'
            }
          >
            🔄 Refresh Images
          </button>
        </div>
      </div>

      {/* Ability Text */}
      <div className={styles.formGroup}>
        <label htmlFor="edit-ability">Ability Text</label>
        <textarea
          ref={abilityTextareaRef}
          id="edit-ability"
          className={styles.autoExpand}
          value={localAbility}
          disabled={isOfficial}
          onChange={handleAbilityChange}
          onKeyDown={handleAbilityKeyDown}
          onBlur={() => {
            if (!isOfficial) onEditChange('ability', localAbility);
          }}
          placeholder="Character ability description"
          rows={3}
        />
      </div>

      {/* Setup */}
      <div className={styles.formGroup}>
        <label htmlFor="edit-setup">Setup Character</label>
        <input
          id="edit-setup"
          type="checkbox"
          className={viewStyles.toggleSwitch}
          checked={character.setup}
          disabled={isOfficial}
          onChange={handleSetupChange}
        />
        <p className={styles.fieldHint}>
          Setup text [in brackets] enables this automatically. Enabling adds [], disabling removes
          brackets.
        </p>
      </div>

      {/* Reminders */}
      <div className={styles.formGroup}>
        <span className={styles.label} id="reminders-label">
          Reminders
        </span>
        <p className={styles.fieldHint}>
          Add reminder text that appears on reminder tokens. Use count to create multiple copies.
          Drag to reorder.
        </p>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragStart={reminderDnd.onDragStart}
          onDragEnd={reminderDnd.onDragEnd}
          onDragCancel={reminderDnd.onDragCancel}
        >
          <SortableContext items={reminderDnd.itemIds} strategy={verticalListSortingStrategy}>
            <ul className={styles.remindersUrlsList} aria-labelledby="reminders-label">
              {reminders.grouped.map((reminder, index) => (
                <SortableReminderRow
                  key={reminderDnd.itemIds[index]}
                  id={String(reminderDnd.itemIds[index])}
                  reminder={reminder}
                  index={index}
                  disabled={isOfficial}
                  canDrag={reminders.grouped.length > 1}
                  onTextChange={reminders.updateText}
                  onCountChange={reminders.updateCount}
                  onRemove={reminders.remove}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>

        <button
          type="button"
          className={`${styles.btnSecondary} ${styles.btnSm}`}
          onClick={reminders.add}
          disabled={isOfficial}
        >
          + Add Reminder
        </button>
      </div>

      {/* First Night Reminder */}
      <NightOrderField
        label="First Night Reminder"
        idPrefix="edit-firstnight"
        reminderValue={localFirstNightReminder}
        nightOrderValue={localFirstNight}
        disabled={isOfficial}
        onReminderChange={handleFirstNightReminderChange}
        onReminderBlur={handleFirstNightReminderBlur}
        onNightOrderChange={handleFirstNightOrderChange}
        onNightOrderBlur={handleFirstNightOrderBlur}
        placeholder="Reminder text for the first night"
      />

      {/* Other Night Reminder */}
      <NightOrderField
        label="Other Night Reminder"
        idPrefix="edit-othernight"
        reminderValue={localOtherNightReminder}
        nightOrderValue={localOtherNight}
        disabled={isOfficial}
        onReminderChange={handleOtherNightReminderChange}
        onReminderBlur={handleOtherNightReminderBlur}
        onNightOrderChange={handleOtherNightOrderChange}
        onNightOrderBlur={handleOtherNightOrderBlur}
        placeholder="Reminder text for other nights"
      />

      {/* Special Items */}
      <SpecialItemsEditor character={character} disabled={isOfficial} onEditChange={onEditChange} />
    </div>
  );
});

export default GameplayTabContent;
