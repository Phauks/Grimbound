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
import { TIMING } from '@/ts/constants.js';
import type { Character } from '@/ts/types/index.js';
import { generateRandomName, nameToId } from '@/ts/utils/nameGenerator';
import { JinxEditor, type JinxPreviewData } from './JinxEditor';
import { NightOrderField } from './NightOrderField';
import { SortableImageUrlRow } from './SortableImageUrlRow';
import { SortableReminderRow } from './SortableReminderRow';
import { SpecialItemsEditor } from './SpecialItemsEditor';
import { TEAM_SELECT_CLASS_MAP } from './types';

// ============================================
// Helpers
// ============================================

/** Normalize image array for storage - single image stored as string, multiple as array */
function normalizeImageValue(images: string[]): string | string[] {
  return images.length === 1 ? images[0] : images;
}

/** Parse ability text to update/add/remove setup brackets */
function adjustAbilityForSetup(ability: string, enableSetup: boolean): string {
  const hasSetupBrackets = /\[.*?\]/.test(ability);
  if (enableSetup && !hasSetupBrackets) {
    return `${ability.trim()} []`;
  }
  if (!enableSetup && hasSetupBrackets) {
    return ability
      .replace(/\[([^\]]*)\]/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();
  }
  return ability;
}

// ============================================
// Hook: Image URL Management
// ============================================

interface UseImageUrlsOptions {
  initialImages: string[];
  isOfficial: boolean;
  onEditChange: (field: keyof Character, value: Character[keyof Character]) => void;
  onRefreshPreview?: () => void;
  onPreviewVariant?: (imageUrl: string | undefined) => void;
  debouncedUpdate: (
    field: keyof Character,
    value: Character[keyof Character],
    delay?: number
  ) => void;
}

interface UseImageUrlsResult {
  localImages: string[];
  setLocalImages: React.Dispatch<React.SetStateAction<string[]>>;
  previewVariantIndex: number | null;
  handleImageUpdate: (index: number, value: string) => void;
  handleImageBlur: () => void;
  handleImagePreview: (index: number, url: string) => void;
  handleAddImage: () => void;
  handleRemoveImage: (index: number) => void;
  handleRefreshImages: () => void;
}

function useImageUrls({
  initialImages,
  isOfficial,
  onEditChange,
  onRefreshPreview,
  onPreviewVariant,
  debouncedUpdate,
}: UseImageUrlsOptions): UseImageUrlsResult {
  const [localImages, setLocalImages] = useState<string[]>(initialImages);
  const [previewVariantIndex, setPreviewVariantIndex] = useState<number | null>(null);

  // Sync with prop changes
  useEffect(() => {
    setLocalImages(initialImages);
    setPreviewVariantIndex(null);
  }, [initialImages]);

  const handleImageUpdate = useCallback(
    (index: number, value: string) => {
      if (isOfficial) return;
      setLocalImages((prev) => {
        const newImages = [...prev];
        newImages[index] = value;
        return newImages;
      });
      const updatedImages = localImages.map((img, i) => (i === index ? value : img));
      debouncedUpdate('image', normalizeImageValue(updatedImages), TIMING.IMAGE_LOAD_DEBOUNCE);
    },
    [isOfficial, localImages, debouncedUpdate]
  );

  const handleImageBlur = useCallback(() => {
    if (isOfficial) return;
    onEditChange('image', normalizeImageValue(localImages));
  }, [isOfficial, localImages, onEditChange]);

  const handleImagePreview = useCallback(
    (index: number, url: string) => {
      if (!onPreviewVariant) return;
      setPreviewVariantIndex(index);
      onPreviewVariant(url);
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
      const isLastImage = localImages.length <= 1;
      if (isLastImage) {
        setLocalImages(['']);
        onEditChange('image', '');
        return;
      }
      const newImages = localImages.filter((_, i) => i !== index);
      setLocalImages(newImages);
      onEditChange('image', normalizeImageValue(newImages));
    },
    [isOfficial, localImages, onEditChange]
  );

  const handleRefreshImages = useCallback(() => {
    if (isOfficial) return;
    onEditChange('image', normalizeImageValue(localImages));
    onRefreshPreview?.();
  }, [isOfficial, localImages, onEditChange, onRefreshPreview]);

  return {
    localImages,
    setLocalImages,
    previewVariantIndex,
    handleImageUpdate,
    handleImageBlur,
    handleImagePreview,
    handleAddImage,
    handleRemoveImage,
    handleRefreshImages,
  };
}

// ============================================
// Helper: Night Order Field Handlers
// ============================================

interface NightOrderHandlers {
  reminderValue: string;
  orderValue: number;
  onReminderChange: (value: string) => void;
  onReminderBlur: (value: string) => void;
  onOrderChange: (value: number) => void;
  onOrderBlur: (value: number) => void;
}

function useNightOrderField(
  initialReminder: string,
  initialOrder: number,
  reminderField: 'firstNightReminder' | 'otherNightReminder',
  orderField: 'firstNight' | 'otherNight',
  debouncedUpdate: (field: keyof Character, value: Character[keyof Character]) => void,
  onEditChange: (field: keyof Character, value: Character[keyof Character]) => void
): NightOrderHandlers {
  const [reminderValue, setReminderValue] = useState(initialReminder);
  const [orderValue, setOrderValue] = useState(initialOrder);

  // Sync with prop changes
  useEffect(() => {
    setReminderValue(initialReminder);
    setOrderValue(initialOrder);
  }, [initialReminder, initialOrder]);

  const onReminderChange = useCallback(
    (value: string) => {
      setReminderValue(value);
      debouncedUpdate(reminderField, value);
    },
    [debouncedUpdate, reminderField]
  );

  const onReminderBlur = useCallback(
    (value: string) => {
      onEditChange(reminderField, value);
    },
    [onEditChange, reminderField]
  );

  const onOrderChange = useCallback((value: number) => {
    setOrderValue(value);
  }, []);

  const onOrderBlur = useCallback(
    (value: number) => {
      onEditChange(orderField, value);
    },
    [onEditChange, orderField]
  );

  return {
    reminderValue,
    orderValue,
    onReminderChange,
    onReminderBlur,
    onOrderChange,
    onOrderBlur,
  };
}

// ============================================
// Hook: Identity Fields (Name, ID, Team)
// ============================================

interface UseIdentityFieldsOptions {
  character: Character;
  isOfficial: boolean;
  isIdLinked: boolean;
  onIdLinkChange: (linked: boolean) => void;
  onEditChange: (field: keyof Character, value: Character[keyof Character]) => void;
  onReplaceCharacter?: (character: Character) => void;
  debouncedUpdate: (field: keyof Character, value: Character[keyof Character]) => void;
}

interface UseIdentityFieldsResult {
  localName: string;
  localId: string;
  handleToggleIdLink: () => void;
  handleRandomName: () => void;
  handleNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleNameBlur: () => void;
  handleIdChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleTeamChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

function useIdentityFields({
  character,
  isOfficial,
  isIdLinked,
  onIdLinkChange,
  onEditChange,
  onReplaceCharacter,
  debouncedUpdate,
}: UseIdentityFieldsOptions): UseIdentityFieldsResult {
  const [localName, setLocalName] = useState(character.name || '');
  const [localId, setLocalId] = useState(character.id || '');

  // Sync with prop changes
  useEffect(() => {
    setLocalName(character.name || '');
    setLocalId(character.id || '');
  }, [character.name, character.id]);

  const handleToggleIdLink = useCallback(() => {
    if (!isOfficial) onIdLinkChange(!isIdLinked);
  }, [isOfficial, isIdLinked, onIdLinkChange]);

  const updateNameWithIdLink = useCallback(
    (newName: string) => {
      if (isIdLinked && onReplaceCharacter) {
        onReplaceCharacter({ ...character, name: newName, id: nameToId(newName) });
        return;
      }
      onEditChange('name', newName);
    },
    [isIdLinked, onReplaceCharacter, character, onEditChange]
  );

  const handleRandomName = useCallback(() => {
    if (isOfficial) return;
    const newName = generateRandomName();
    setLocalName(newName);
    updateNameWithIdLink(newName);
  }, [isOfficial, updateNameWithIdLink]);

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (isOfficial) return;
      setLocalName(e.target.value);
      debouncedUpdate('name', e.target.value);
    },
    [isOfficial, debouncedUpdate]
  );

  const handleNameBlur = useCallback(() => {
    if (isOfficial) return;
    updateNameWithIdLink(localName);
  }, [isOfficial, localName, updateNameWithIdLink]);

  const handleIdChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (isIdLinked || isOfficial) return;
      setLocalId(e.target.value);
      onEditChange('id', e.target.value);
    },
    [isIdLinked, isOfficial, onEditChange]
  );

  const handleTeamChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (!isOfficial) onEditChange('team', e.target.value);
    },
    [isOfficial, onEditChange]
  );

  return {
    localName,
    localId,
    handleToggleIdLink,
    handleRandomName,
    handleNameChange,
    handleNameBlur,
    handleIdChange,
    handleTeamChange,
  };
}

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
  /** Characters currently on the script (for jinx editor) */
  scriptCharacters?: Character[];
  /** All official characters from sync (for jinx editor) */
  officialCharacters?: Character[];
  /** Callback to preview a jinx token */
  onPreviewJinx?: (data: JinxPreviewData | null) => void;
  /** Index of currently previewed jinx */
  previewedJinxIndex?: number | null;
}

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
  scriptCharacters = [],
  officialCharacters = [],
  onPreviewJinx,
  previewedJinxIndex,
}: GameplayTabContentProps) {
  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ============================================
  // Debounced Update Helper
  // ============================================

  const debouncedUpdate = useCallback(
    (
      field: keyof Character,
      value: Character[keyof Character],
      delay: number = TIMING.METADATA_DEBOUNCE
    ) => {
      const timer = setTimeout(() => {
        onEditChange(field, value);
      }, delay);
      return () => clearTimeout(timer);
    },
    [onEditChange]
  );

  // ============================================
  // Identity Fields (Name, ID, Team)
  // ============================================

  const identity = useIdentityFields({
    character,
    isOfficial,
    isIdLinked,
    onIdLinkChange,
    onEditChange,
    onReplaceCharacter,
    debouncedUpdate,
  });

  // ============================================
  // Ability Text State
  // ============================================

  const [localAbility, setLocalAbility] = useState(character.ability || '');

  // Auto-resize for ability textarea
  const abilityTextareaRef = useAutoResizeTextarea({
    value: localAbility,
    enabled: !isOfficial,
    minRows: 3,
  });

  // Sync ability with prop changes
  useEffect(() => {
    setLocalAbility(character.ability || '');
  }, [character.ability]);

  // Auto-detect setup text
  useEffect(() => {
    if (isOfficial) return;
    const hasSetupText = /\[.*?\]/.test(localAbility);
    if (hasSetupText && !character.setup) {
      onEditChange('setup', true);
    }
  }, [localAbility, character.setup, isOfficial, onEditChange]);

  // ============================================
  // Image URL Management (extracted hook)
  // ============================================

  const initialImages = Array.isArray(character.image) ? character.image : [character.image || ''];

  const imageUrls = useImageUrls({
    initialImages,
    isOfficial,
    onEditChange,
    onRefreshPreview,
    onPreviewVariant,
    debouncedUpdate,
  });

  // Resolved image URLs for display
  const { resolvedUrls: resolvedImageUrls } = useResolvedImageUrls({
    imageUrls: imageUrls.localImages,
    enabled: true,
  });

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
    items: imageUrls.localImages,
    getItemId: (_, index) => `image-${index}`,
    onReorder: (newImages) => {
      imageUrls.setLocalImages(newImages);
      onEditChange('image', normalizeImageValue(newImages));
    },
    disabled: isOfficial || imageUrls.localImages.length <= 1,
  });

  const reminderDnd = useDraggableList({
    items: reminders.grouped,
    getItemId: (item, index) => `reminder-${item.text}-${index}`,
    onReorder: reminders.reorder,
    disabled: isOfficial || reminders.grouped.length <= 1,
  });

  // ============================================
  // Ability Handlers
  // ============================================

  const handleAbilityChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (isOfficial) return;
      setLocalAbility(e.target.value);
      debouncedUpdate('ability', e.target.value);
    },
    [isOfficial, debouncedUpdate]
  );

  const handleAbilityBlur = useCallback(() => {
    if (!isOfficial) onEditChange('ability', localAbility);
  }, [isOfficial, localAbility, onEditChange]);

  const handleSetupChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (isOfficial) return;
      const newSetupValue = e.target.checked;
      onEditChange('setup', newSetupValue);

      const newAbility = adjustAbilityForSetup(localAbility, newSetupValue);
      if (newAbility !== localAbility) {
        setLocalAbility(newAbility);
        onEditChange('ability', newAbility);
      }
    },
    [isOfficial, localAbility, onEditChange]
  );

  // ============================================
  // Night Order Handlers
  // ============================================

  const firstNight = useNightOrderField(
    character.firstNightReminder || '',
    character.firstNight ?? 0,
    'firstNightReminder',
    'firstNight',
    debouncedUpdate,
    onEditChange
  );

  const otherNight = useNightOrderField(
    character.otherNightReminder || '',
    character.otherNight ?? 0,
    'otherNightReminder',
    'otherNight',
    debouncedUpdate,
    onEditChange
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
            onClick={identity.handleToggleIdLink}
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
          value={isIdLinked ? nameToId(identity.localName) : identity.localId}
          readOnly={isIdLinked || isOfficial}
          disabled={isIdLinked || isOfficial}
          className={isIdLinked ? styles.linkedField : ''}
          onChange={identity.handleIdChange}
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
            onClick={identity.handleRandomName}
            disabled={isOfficial}
            title={isOfficial ? 'Official character - cannot edit' : 'Generate random name'}
          >
            🎲
          </button>
        </div>
        <input
          id="edit-name"
          type="text"
          value={identity.localName}
          disabled={isOfficial}
          onChange={identity.handleNameChange}
          onBlur={identity.handleNameBlur}
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
          onChange={identity.handleTeamChange}
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
              {imageUrls.localImages.map((url, index) => (
                <SortableImageUrlRow
                  key={imageDnd.itemIds[index]}
                  id={String(imageDnd.itemIds[index])}
                  url={url}
                  resolvedUrl={resolvedImageUrls[index]}
                  index={index}
                  isPreviewActive={
                    imageUrls.previewVariantIndex === index ||
                    (imageUrls.previewVariantIndex === null && index === 0)
                  }
                  disabled={isOfficial}
                  canDrag={imageUrls.localImages.length > 1}
                  onChange={imageUrls.handleImageUpdate}
                  onBlur={imageUrls.handleImageBlur}
                  onPreviewClick={imageUrls.handleImagePreview}
                  onRemove={imageUrls.handleRemoveImage}
                  isLastItem={imageUrls.localImages.length <= 1}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>

        <div className={styles.imageUrlActions}>
          <button
            type="button"
            className={`${styles.btnSecondary} ${styles.btnSm}`}
            onClick={imageUrls.handleAddImage}
            disabled={isOfficial}
          >
            + Add Image URL
          </button>
          <button
            type="button"
            className={`${styles.btnSecondary} ${styles.btnSm}`}
            onClick={imageUrls.handleRefreshImages}
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
          onBlur={handleAbilityBlur}
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
        reminderValue={firstNight.reminderValue}
        nightOrderValue={firstNight.orderValue}
        disabled={isOfficial}
        onReminderChange={firstNight.onReminderChange}
        onReminderBlur={firstNight.onReminderBlur}
        onNightOrderChange={firstNight.onOrderChange}
        onNightOrderBlur={firstNight.onOrderBlur}
        placeholder="Reminder text for the first night"
      />

      {/* Other Night Reminder */}
      <NightOrderField
        label="Other Night Reminder"
        idPrefix="edit-othernight"
        reminderValue={otherNight.reminderValue}
        nightOrderValue={otherNight.orderValue}
        disabled={isOfficial}
        onReminderChange={otherNight.onReminderChange}
        onReminderBlur={otherNight.onReminderBlur}
        onNightOrderChange={otherNight.onOrderChange}
        onNightOrderBlur={otherNight.onOrderBlur}
        placeholder="Reminder text for other nights"
      />

      {/* Special Items */}
      <SpecialItemsEditor character={character} disabled={isOfficial} onEditChange={onEditChange} />

      {/* Jinxes */}
      <JinxEditor
        character={character}
        disabled={isOfficial}
        onEditChange={onEditChange}
        scriptCharacters={scriptCharacters}
        officialCharacters={officialCharacters}
        onPreviewJinx={onPreviewJinx}
        previewedJinxIndex={previewedJinxIndex}
      />
    </div>
  );
});

export default GameplayTabContent;
