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
import { useState } from 'react';
import { AssetManagerModal } from '@/components/Modals/AssetManagerModal';
import { useToast } from '@/contexts/ToastContext';
import { useDraggableList, useGroupedReminders } from '@/hooks/index.js';
import { useResolvedImageUrls } from '@/hooks/sync/useResolvedImageUrls';
import { useDebouncedCallback } from '@/hooks/ui/useDebouncedCallback';
import styles from '@/styles/components/characterEditor/TokenEditor.module.css';
import viewStyles from '@/styles/components/views/Views.module.css';
import { TIMING } from '@/ts/constants.js';
import type { Character } from '@/ts/types/index.js';
import { nameToId } from '@/ts/utils/nameGenerator';
import {
  normalizeImageValue,
  useAbilityField,
  useIdentityFields,
  useImageUrls,
  useNightOrderField,
} from './hooks';
import { JinxEditor, type JinxPreviewData } from './JinxEditor';
import { NightOrderField } from './NightOrderField';
import { SortableImageUrlRow } from './SortableImageUrlRow';
import { SortableReminderRow } from './SortableReminderRow';
import { SpecialItemsEditor } from './SpecialItemsEditor';
import { TEAM_SELECT_CLASS_MAP } from './types';

// ============================================
// Helper Hooks (kept inline - small and specific)
// ============================================

/** Computed titles for various UI elements */
function useComputedTitles(
  isOfficial: boolean,
  isIdLinked: boolean,
  localName: string,
  localId: string
) {
  const officialMsg = 'Official character - cannot edit';
  return {
    idLinkButtonTitle: isOfficial
      ? officialMsg
      : isIdLinked
        ? 'ID linked to name (click to unlink)'
        : 'ID not linked (click to link to name)',
    idInputTitle: isOfficial
      ? officialMsg
      : isIdLinked
        ? 'Unlink to edit ID manually'
        : 'Unique identifier for this character',
    browseAssetsTitle: isOfficial ? officialMsg : 'Browse character icons from Asset Manager',
    refreshImagesTitle: isOfficial ? officialMsg : 'Refresh preview with current image URLs',
    randomNameTitle: isOfficial ? officialMsg : 'Generate random name',
    idInputValue: isIdLinked ? nameToId(localName) : localId,
  };
}

/** Asset modal state management */
function useAssetModal(
  isOfficial: boolean,
  onAssetSelection: (index: number, assetId: string) => void
) {
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [assetModalTargetIndex, setAssetModalTargetIndex] = useState(0);

  const handleOpenAssetModal = (index: number) => {
    if (isOfficial) return;
    setAssetModalTargetIndex(index);
    setShowAssetModal(true);
  };

  const handleAssetModalSelect = (assetId: string) => {
    onAssetSelection(assetModalTargetIndex, assetId);
    setShowAssetModal(false);
  };

  const handleCloseAssetModal = () => {
    setShowAssetModal(false);
  };

  return {
    showAssetModal,
    assetModalTargetIndex,
    handleOpenAssetModal,
    handleAssetModalSelect,
    handleCloseAssetModal,
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
  /** Callback to convert official character to custom */
  onConvertToCustom?: () => void;
}

// ============================================
// Main Component
// ============================================

export function GameplayTabContent({
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
  onConvertToCustom,
}: GameplayTabContentProps) {
  // Toast for notifications
  const { addToast } = useToast();

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ============================================
  // Debounced Update Helper (for image URLs only - special timing)
  // ============================================

  const { debouncedFn: debouncedImageUpdate } = useDebouncedCallback(
    (value: string | string[]) => {
      onEditChange('image', value);
    },
    { delay: TIMING.IMAGE_LOAD_DEBOUNCE }
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
    scriptCharacters,
    addToast,
  });

  // ============================================
  // Ability Text State (extracted hook)
  // ============================================

  const ability = useAbilityField({
    character,
    isOfficial,
    onEditChange,
  });

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
    debouncedImageUpdate,
  });

  // Resolved image URLs for display
  const { resolvedUrls: resolvedImageUrls } = useResolvedImageUrls({
    imageUrls: imageUrls.localImages,
    enabled: true,
  });

  // ============================================
  // Asset Manager Modal State (inline helper hook)
  // ============================================

  const assetModal = useAssetModal(isOfficial, imageUrls.handleAssetSelection);

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
  // Night Order Handlers
  // ============================================

  const firstNight = useNightOrderField(
    character.firstNightReminder || '',
    character.firstNight ?? 0,
    'firstNightReminder',
    'firstNight',
    onEditChange,
    isOfficial
  );

  const otherNight = useNightOrderField(
    character.otherNightReminder || '',
    character.otherNight ?? 0,
    'otherNightReminder',
    'otherNight',
    onEditChange,
    isOfficial
  );

  // Team styling
  const teamClass = (() => {
    const classKey = TEAM_SELECT_CLASS_MAP[character.team];
    return classKey ? styles[classKey] : '';
  })();

  // ============================================
  // Computed Titles (inline helper hook)
  // ============================================

  const titles = useComputedTitles(isOfficial, isIdLinked, identity.localName, identity.localId);

  // ============================================
  // Render
  // ============================================

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
        {/* Character ID */}
        <div className={styles.formGroup}>
          <div className={styles.labelWithAction}>
            <label htmlFor="edit-id">Character ID</label>
            <button
              type="button"
              className={`${styles.iconButton} ${isIdLinked ? styles.linked : ''}`}
              onClick={identity.handleToggleIdLink}
              disabled={isOfficial}
              title={titles.idLinkButtonTitle}
            >
              {isIdLinked ? '🔗' : '⛓️‍💥'}
            </button>
          </div>
          <input
            id="edit-id"
            type="text"
            value={titles.idInputValue}
            readOnly={isIdLinked || isOfficial}
            disabled={isIdLinked || isOfficial}
            className={isIdLinked ? styles.linkedField : ''}
            onChange={identity.handleIdChange}
            title={titles.idInputTitle}
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
              title={titles.randomNameTitle}
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
                    onBrowseAssets={assetModal.handleOpenAssetModal}
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
              onClick={() => assetModal.handleOpenAssetModal(0)}
              disabled={isOfficial}
              title={titles.browseAssetsTitle}
            >
              📁 Browse Assets
            </button>
            <button
              type="button"
              className={`${styles.btnSecondary} ${styles.btnSm}`}
              onClick={imageUrls.handleRefreshImages}
              disabled={isOfficial}
              title={titles.refreshImagesTitle}
            >
              🔄 Refresh Images
            </button>
          </div>
        </div>

        {/* Ability Text */}
        <div className={styles.formGroup}>
          <label htmlFor="edit-ability">Ability Text</label>
          <textarea
            ref={ability.abilityTextareaRef}
            id="edit-ability"
            className={styles.autoExpand}
            value={ability.displayAbility}
            disabled={isOfficial}
            onChange={ability.handleAbilityChange}
            onBlur={ability.handleAbilityBlur}
            placeholder="Character ability description"
            rows={3}
          />
        </div>

        {/* Setup */}
        <div className={styles.formGroup}>
          <label htmlFor="edit-setup">Setup Character</label>
          <div className={styles.setupRow}>
            <input
              id="edit-setup"
              type="checkbox"
              className={viewStyles.toggleSwitch}
              checked={character.setup}
              disabled={isOfficial}
              onChange={ability.handleSetupChange}
            />
            {character.setup && (
              <div className={styles.setupInputWrapper}>
                <span className={`${styles.setupBracket} ${styles.setupBracketLeft}`}>[</span>
                <input
                  type="text"
                  className={styles.setupTextInput}
                  value={ability.localSetupText}
                  disabled={isOfficial}
                  onChange={ability.handleSetupTextChange}
                  onBlur={ability.handleSetupTextBlur}
                  placeholder="Setup text"
                  aria-label="Setup text"
                />
                <span className={`${styles.setupBracket} ${styles.setupBracketRight}`}>]</span>
              </div>
            )}
          </div>
          <p className={styles.fieldHint}>
            {character.setup
              ? 'Edit setup text separately. It will appear in [brackets] on the token.'
              : 'Enable to add setup text that appears in [brackets] on the token.'}
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
        <SpecialItemsEditor
          character={character}
          disabled={isOfficial}
          onEditChange={onEditChange}
        />

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

      {/* Asset Manager Modal for browsing character icons */}
      {assetModal.showAssetModal && (
        <AssetManagerModal
          isOpen={assetModal.showAssetModal}
          onClose={assetModal.handleCloseAssetModal}
          onSelectAsset={assetModal.handleAssetModalSelect}
          initialAssetType="icon"
          selectionMode={true}
          includeBuiltIn={false}
        />
      )}
    </div>
  );
}
