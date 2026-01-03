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
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AssetManagerModal } from '@/components/Modals/AssetManagerModal';
import { useToast } from '@/contexts/ToastContext';
import { useDraggableList, useGroupedReminders } from '@/hooks/index.js';
import { useResolvedImageUrls } from '@/hooks/sync/useResolvedImageUrls';
import { useAutoResizeTextarea } from '@/hooks/ui/useAutoResizeTextarea';
import { useControlledField } from '@/hooks/ui/useControlledField';
import styles from '@/styles/components/characterEditor/TokenEditor.module.css';
import viewStyles from '@/styles/components/views/Views.module.css';
import { TIMING } from '@/ts/constants.js';
import type { Character } from '@/ts/types/index.js';
import {
  combineAbilityWithSetup,
  ensureUniqueId,
  getOtherCharacterIds,
  hasSetupBrackets,
  splitAbilityText,
} from '@/ts/utils/index.js';
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

// ============================================
// Hook: Image URL Management
// ============================================

interface UseImageUrlsOptions {
  initialImages: string[];
  isOfficial: boolean;
  onEditChange: (field: keyof Character, value: Character[keyof Character]) => void;
  onRefreshPreview?: () => void;
  onPreviewVariant?: (imageUrl: string | undefined) => void;
  /** Debounced update for image changes (uses longer delay for image loading) */
  debouncedImageUpdate: (value: string | string[], delay?: number) => void;
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
  /** Handle asset selection from asset manager */
  handleAssetSelection: (index: number, assetId: string) => void;
}

function useImageUrls({
  initialImages,
  isOfficial,
  onEditChange,
  onRefreshPreview,
  onPreviewVariant,
  debouncedImageUpdate,
}: UseImageUrlsOptions): UseImageUrlsResult {
  const [localImages, setLocalImages] = useState<string[]>(initialImages);
  const [previewVariantIndex, setPreviewVariantIndex] = useState<number | null>(null);

  // Track previous content to prevent infinite loops when parent creates
  // new array references with same content
  const prevKeyRef = useRef<string>('');
  const currentKey = initialImages.join('\x00');

  // Sync with prop changes (using content comparison)
  useEffect(() => {
    // Skip if content hasn't changed (prevents infinite loops from new array refs)
    if (prevKeyRef.current === currentKey) {
      return;
    }
    prevKeyRef.current = currentKey;
    setLocalImages(initialImages);
    setPreviewVariantIndex(null);
  }, [initialImages, currentKey]);

  const handleImageUpdate = useCallback(
    (index: number, value: string) => {
      if (isOfficial) return;
      setLocalImages((prev) => {
        const newImages = [...prev];
        newImages[index] = value;
        return newImages;
      });
      const updatedImages = localImages.map((img, i) => (i === index ? value : img));
      debouncedImageUpdate(normalizeImageValue(updatedImages));
    },
    [isOfficial, localImages, debouncedImageUpdate]
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

  const handleAssetSelection = useCallback(
    (index: number, assetRef: string) => {
      if (isOfficial) return;
      // assetRef is already in "asset:uuid" format from useAssetSelection hook
      setLocalImages((prev) => {
        const newImages = [...prev];
        newImages[index] = assetRef;
        return newImages;
      });
      // Update immediately (no debounce for explicit selection)
      const updatedImages = localImages.map((img, i) => (i === index ? assetRef : img));
      onEditChange('image', normalizeImageValue(updatedImages));
    },
    [isOfficial, localImages, onEditChange]
  );

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
    handleAssetSelection,
  };
}

// ============================================
// Helper: Night Order Field Handlers
// ============================================

interface NightOrderHandlers {
  reminderValue: string;
  orderValue: number;
  onReminderChange: (value: string) => void;
  /** Blur handler - flushes debounced value (parent manages local state) */
  onReminderBlur: () => void;
  onOrderChange: (value: number) => void;
  onOrderBlur: (value: number) => void;
}

function useNightOrderField(
  initialReminder: string,
  initialOrder: number,
  reminderField: 'firstNightReminder' | 'otherNightReminder',
  orderField: 'firstNight' | 'otherNight',
  onEditChange: (field: keyof Character, value: Character[keyof Character]) => void,
  disabled: boolean
): NightOrderHandlers {
  // Use centralized controlled field hook for reminder text
  const reminder = useControlledField({
    value: initialReminder,
    onChange: (value) => onEditChange(reminderField, value),
    debounceMs: TIMING.METADATA_DEBOUNCE,
    disabled,
  });

  // Order value is a number, use simple state (no cursor issues with number inputs)
  const [orderValue, setOrderValue] = useState(initialOrder);
  const lastSentOrderRef = useRef<number>(initialOrder);

  // Sync order with prop changes
  useEffect(() => {
    if (initialOrder !== lastSentOrderRef.current) {
      setOrderValue(initialOrder);
      lastSentOrderRef.current = initialOrder;
    }
  }, [initialOrder]);

  const onOrderChange = useCallback((value: number) => {
    setOrderValue(value);
  }, []);

  const onOrderBlur = useCallback(
    (value: number) => {
      lastSentOrderRef.current = value;
      onEditChange(orderField, value);
    },
    [onEditChange, orderField]
  );

  return {
    reminderValue: reminder.localValue,
    orderValue,
    onReminderChange: reminder.handleChange,
    onReminderBlur: reminder.handleBlur,
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
  /** All characters on the script (for uniqueness checking) */
  scriptCharacters: Character[];
  /** Toast function for notifications */
  addToast: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
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

  const handleToggleIdLink = useCallback(() => {
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
  }, [
    isOfficial,
    isIdLinked,
    onIdLinkChange,
    character,
    scriptCharacters,
    addToast,
    onReplaceCharacter,
  ]);

  const updateNameWithIdLink = useCallback(
    (newName: string) => {
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
    },
    [
      isIdLinked,
      onReplaceCharacter,
      character,
      onEditChange,
      scriptCharacters,
      addToast,
      onIdLinkChange,
    ]
  );

  const handleRandomName = useCallback(() => {
    if (isOfficial) return;
    const newName = generateRandomName();
    name.handleChange(newName);
    updateNameWithIdLink(newName);
  }, [isOfficial, name, updateNameWithIdLink]);

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      name.handleChange(e.target.value);
    },
    [name]
  );

  const handleNameBlur = useCallback(() => {
    if (isOfficial) return;
    // On blur, handle ID linking if enabled
    updateNameWithIdLink(name.localValue);
  }, [isOfficial, name.localValue, updateNameWithIdLink]);

  const handleIdChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
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
    },
    [isIdLinked, isOfficial, onEditChange, scriptCharacters, character.uuid, addToast]
  );

  const handleTeamChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (!isOfficial) onEditChange('team', e.target.value);
    },
    [isOfficial, onEditChange]
  );

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

// ============================================
// Hook: Ability Field State and Handlers
// ============================================

interface UseAbilityFieldOptions {
  character: Character;
  isOfficial: boolean;
  onEditChange: (field: keyof Character, value: Character[keyof Character]) => void;
}

interface UseAbilityFieldResult {
  displayAbility: string;
  localSetupText: string;
  abilityTextareaRef: React.RefObject<HTMLTextAreaElement | null>;
  handleAbilityChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleAbilityBlur: () => void;
  handleSetupTextChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSetupTextBlur: () => void;
  handleSetupChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function useAbilityField({
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
  const abilitySplit = useMemo(() => {
    if (!character.setup) return null;
    return splitAbilityText(ability.localValue);
  }, [ability.localValue, character.setup]);

  // Display value for ability textarea (without brackets when setup enabled)
  const displayAbility =
    character.setup && abilitySplit ? abilitySplit.abilityWithoutSetup : ability.localValue;

  // Auto-resize for ability textarea
  const abilityTextareaRef = useAutoResizeTextarea({
    value: displayAbility,
    enabled: !isOfficial,
    minRows: 3,
  });

  // Sync setup text with split when setup is enabled
  useEffect(() => {
    if (abilitySplit) {
      setLocalSetupText(abilitySplit.setupContent);
    }
  }, [abilitySplit]);

  // Auto-detect setup text
  useEffect(() => {
    if (isOfficial) return;
    const hasSetup = hasSetupBrackets(ability.localValue);
    if (hasSetup && !character.setup) {
      onEditChange('setup', true);
      const split = splitAbilityText(ability.localValue);
      setLocalSetupText(split.setupContent);
    }
  }, [ability.localValue, character.setup, isOfficial, onEditChange]);

  const handleAbilityChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (isOfficial) return;
      const newAbilityPart = e.target.value;

      if (character.setup && localSetupText) {
        const combined = combineAbilityWithSetup(newAbilityPart, localSetupText);
        ability.handleChange(combined);
      } else {
        ability.handleChange(newAbilityPart);
      }
    },
    [isOfficial, character.setup, localSetupText, ability]
  );

  const handleAbilityBlur = useCallback(() => {
    if (isOfficial) return;
    if (character.setup && localSetupText) {
      const combined = combineAbilityWithSetup(displayAbility, localSetupText);
      ability.handleChange(combined);
    }
    ability.handleBlur();
  }, [isOfficial, character.setup, localSetupText, displayAbility, ability]);

  const handleSetupTextChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (isOfficial) return;
      const newSetupText = e.target.value;
      setLocalSetupText(newSetupText);

      const combined = combineAbilityWithSetup(
        abilitySplit?.abilityWithoutSetup || ability.localValue,
        newSetupText
      );
      ability.handleChange(combined);
    },
    [isOfficial, abilitySplit, ability]
  );

  const handleSetupTextBlur = useCallback(() => {
    if (isOfficial) return;
    const combined = combineAbilityWithSetup(
      abilitySplit?.abilityWithoutSetup || ability.localValue,
      localSetupText
    );
    ability.handleChange(combined);
    ability.handleBlur();
  }, [isOfficial, abilitySplit, ability, localSetupText]);

  const handleSetupChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
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
    },
    [isOfficial, ability, onEditChange]
  );

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

// ============================================
// Hook: Computed Titles (reduces JSX complexity)
// ============================================

interface UseComputedTitlesOptions {
  isOfficial: boolean;
  isIdLinked: boolean;
  localName: string;
  localId: string;
}

interface UseComputedTitlesResult {
  idLinkButtonTitle: string;
  idInputTitle: string;
  browseAssetsTitle: string;
  refreshImagesTitle: string;
  randomNameTitle: string;
  idInputValue: string;
}

function useComputedTitles({
  isOfficial,
  isIdLinked,
  localName,
  localId,
}: UseComputedTitlesOptions): UseComputedTitlesResult {
  return useMemo(() => {
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
  }, [isOfficial, isIdLinked, localName, localId]);
}

// ============================================
// Hook: Asset Modal State
// ============================================

interface UseAssetModalOptions {
  isOfficial: boolean;
  onAssetSelection: (index: number, assetId: string) => void;
}

interface UseAssetModalResult {
  showAssetModal: boolean;
  assetModalTargetIndex: number;
  handleOpenAssetModal: (index: number) => void;
  handleAssetModalSelect: (assetId: string) => void;
  handleCloseAssetModal: () => void;
}

function useAssetModal({
  isOfficial,
  onAssetSelection,
}: UseAssetModalOptions): UseAssetModalResult {
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [assetModalTargetIndex, setAssetModalTargetIndex] = useState(0);

  const handleOpenAssetModal = useCallback(
    (index: number) => {
      if (isOfficial) return;
      setAssetModalTargetIndex(index);
      setShowAssetModal(true);
    },
    [isOfficial]
  );

  const handleAssetModalSelect = useCallback(
    (assetId: string) => {
      onAssetSelection(assetModalTargetIndex, assetId);
      setShowAssetModal(false);
    },
    [assetModalTargetIndex, onAssetSelection]
  );

  const handleCloseAssetModal = useCallback(() => {
    setShowAssetModal(false);
  }, []);

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

  // Track timer for image debounce
  const imageDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedImageUpdate = useCallback(
    (value: string | string[], delay: number = TIMING.IMAGE_LOAD_DEBOUNCE) => {
      // Cancel any pending update
      if (imageDebounceTimerRef.current) {
        clearTimeout(imageDebounceTimerRef.current);
      }

      imageDebounceTimerRef.current = setTimeout(() => {
        imageDebounceTimerRef.current = null;
        onEditChange('image', value);
      }, delay);
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
  // Asset Manager Modal State (extracted hook)
  // ============================================

  const assetModal = useAssetModal({
    isOfficial,
    onAssetSelection: imageUrls.handleAssetSelection,
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
  const teamClass = useMemo(() => {
    const classKey = TEAM_SELECT_CLASS_MAP[character.team];
    return classKey ? styles[classKey] : '';
  }, [character.team]);

  // ============================================
  // Computed Titles (extracted hook)
  // ============================================

  const titles = useComputedTitles({
    isOfficial,
    isIdLinked,
    localName: identity.localName,
    localId: identity.localId,
  });

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
          initialAssetType="character-icon"
          selectionMode={true}
          includeBuiltIn={false}
        />
      )}
    </div>
  );
});

export default GameplayTabContent;
