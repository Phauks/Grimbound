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

import { memo, useCallback, useEffect, useMemo, useRef, useState, type RefCallback } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { useGroupedReminders, useDraggableList } from '@/hooks/index.js';
import { dataSyncService } from '@/ts/sync/index.js';
import { logger } from '@/ts/utils/logger.js';
import { generateRandomName, nameToId } from '@/ts/utils/nameGenerator';
import {
  analyzeReminderText,
  type FormatIssue,
  normalizeReminderText,
} from '@/ts/utils/textFormatAnalyzer';
import type { Character } from '@/ts/types/index.js';
import { TEAM_SELECT_CLASS_MAP } from './types';
import { SortableImageUrlRow } from './SortableImageUrlRow';
import { SortableReminderRow } from './SortableReminderRow';
import { FormatWarning } from './FormatWarning';
import { SpecialItemsEditor } from './SpecialItemsEditor';
import styles from '@/styles/components/characterEditor/TokenEditor.module.css';
import viewStyles from '@/styles/components/views/Views.module.css';

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

export const GameplayTabContent = memo(function GameplayTabContent({
  character,
  isOfficial,
  onEditChange,
  onReplaceCharacter,
  onRefreshPreview,
  onPreviewVariant,
  charUuid,
  isIdLinked,
  onIdLinkChange,
}: GameplayTabContentProps) {
  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Local state for text inputs
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

  // Resolved image URLs for preview
  const [resolvedImageUrls, setResolvedImageUrls] = useState<(string | null)[]>([]);

  // Format issue tracking
  const [firstNightFormatIssues, setFirstNightFormatIssues] = useState<FormatIssue[]>([]);
  const [otherNightFormatIssues, setOtherNightFormatIssues] = useState<FormatIssue[]>([]);

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
    character.uuid,
  ]);

  // Resize textareas when character changes
  useEffect(() => {
    requestAnimationFrame(() => {
      textareaRefs.current.forEach(resizeTextarea);
    });
  }, [resizeTextarea]);

  // Analyze format issues
  useEffect(() => {
    setFirstNightFormatIssues(analyzeReminderText(localFirstNightReminder));
  }, [localFirstNightReminder]);

  useEffect(() => {
    setOtherNightFormatIssues(analyzeReminderText(localOtherNightReminder));
  }, [localOtherNightReminder]);

  // Auto-detect setup text
  useEffect(() => {
    if (isOfficial) return;
    const hasSetupText = /\[.*?\]/.test(localAbility);
    if (hasSetupText && !character.setup) {
      onEditChange('setup', true);
    }
  }, [localAbility, character.setup, isOfficial, onEditChange]);

  // Resolve image URLs
  useEffect(() => {
    let isMounted = true;
    const objectUrls: string[] = [];

    const resolveImages = async () => {
      const resolved = await Promise.all(
        localImages.map(async (url) => {
          if (!url?.trim()) return null;
          if (url.startsWith('http://') || url.startsWith('https://')) return url;
          if (url.startsWith('asset:')) return url;

          const extractCharacterId = (path: string): string | null => {
            const segments = path.split('/');
            const filename = segments[segments.length - 1];
            const match = filename.match(/^(?:Icon_)?([a-z_]+)(?:\.(?:webp|png|jpg|jpeg|gif))?$/i);
            return match ? match[1].toLowerCase() : null;
          };

          const characterId = extractCharacterId(url);
          if (characterId) {
            try {
              const blob = await dataSyncService.getCharacterImage(characterId);
              if (blob) {
                const objectUrl = URL.createObjectURL(blob);
                objectUrls.push(objectUrl);
                return objectUrl;
              }
            } catch (error) {
              logger.warn('GameplayTabContent', `Failed to resolve image: ${characterId}`, error);
            }
          }
          return url;
        })
      );

      if (isMounted) {
        setResolvedImageUrls(resolved);
      }
    };

    resolveImages();

    return () => {
      isMounted = false;
      for (const url of objectUrls) {
        URL.revokeObjectURL(url);
      }
    };
  }, [localImages]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Debounced update helper
  const debouncedUpdate = useCallback(
    (field: keyof Character, value: Character[keyof Character], delay = 500) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        onEditChange(field, value);
      }, delay);
    },
    [onEditChange]
  );

  // Reminders management
  const reminders = useGroupedReminders({
    reminders: character.reminders || [],
    onChange: (newReminders) => onEditChange('reminders', newReminders),
    disabled: isOfficial,
  });

  // Image drag-and-drop
  const imageDnd = useDraggableList({
    items: localImages,
    getItemId: (_, index) => `image-${index}`,
    onReorder: (newImages) => {
      setLocalImages(newImages);
      onEditChange('image', newImages.length === 1 ? newImages[0] : newImages);
    },
    disabled: isOfficial || localImages.length <= 1,
  });

  // Reminder drag-and-drop
  const reminderDnd = useDraggableList({
    items: reminders.grouped,
    getItemId: (item, index) => `reminder-${item.text}-${index}`,
    onReorder: reminders.reorder,
    disabled: isOfficial || reminders.grouped.length <= 1,
  });

  // Handlers
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

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        if (isIdLinked && onReplaceCharacter) {
          onReplaceCharacter({ ...character, name: newName, id: nameToId(newName) });
        } else {
          onEditChange('name', newName);
        }
      }, 500);
    },
    [isOfficial, isIdLinked, onReplaceCharacter, character, onEditChange]
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
        debouncedUpdate('image', newImages.length === 1 ? newImages[0] : newImages, 800);
        return newImages;
      });
    },
    [isOfficial, debouncedUpdate]
  );

  const handleImageBlur = useCallback(() => {
    if (isOfficial) return;
    const images = localImages.length === 1 ? localImages[0] : localImages;
    onEditChange('image', images);
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
    const images = localImages.length === 1 ? localImages[0] : localImages;
    onEditChange('image', images);
    if (onRefreshPreview) {
      setTimeout(() => onRefreshPreview(), 50);
    }
  }, [isOfficial, localImages, onEditChange, onRefreshPreview]);

  const handleFixFirstNightFormat = useCallback(() => {
    if (isOfficial) return;
    const normalized = normalizeReminderText(localFirstNightReminder);
    setLocalFirstNightReminder(normalized);
    onEditChange('firstNightReminder', normalized);
  }, [isOfficial, localFirstNightReminder, onEditChange]);

  const handleFixOtherNightFormat = useCallback(() => {
    if (isOfficial) return;
    const normalized = normalizeReminderText(localOtherNightReminder);
    setLocalOtherNightReminder(normalized);
    onEditChange('otherNightReminder', normalized);
  }, [isOfficial, localOtherNightReminder, onEditChange]);

  // Team class
  const teamClass = TEAM_SELECT_CLASS_MAP[character.team]
    ? styles[TEAM_SELECT_CLASS_MAP[character.team]]
    : '';

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
        <span className={styles.label} id="image-urls-label">Image</span>
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
            <div className={styles.imageUrlsList} role="list" aria-labelledby="image-urls-label">
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
            </div>
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
          ref={registerTextareaRef}
          id="edit-ability"
          className={styles.autoExpand}
          value={localAbility}
          disabled={isOfficial}
          onChange={(e) => {
            if (isOfficial) return;
            setLocalAbility(e.target.value);
            debouncedUpdate('ability', e.target.value);
          }}
          onKeyDown={(e) => {
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
          }}
          onInput={handleTextareaInput}
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
          onChange={(e) => {
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
          }}
        />
        <p className={styles.fieldHint}>
          Setup text [in brackets] enables this automatically. Enabling adds [], disabling removes brackets.
        </p>
      </div>

      {/* Reminders */}
      <div className={styles.formGroup}>
        <span className={styles.label} id="reminders-label">Reminders</span>
        <p className={styles.fieldHint}>
          Add reminder text that appears on reminder tokens. Use count to create multiple copies. Drag to reorder.
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
            <div className={styles.remindersUrlsList} role="list" aria-labelledby="reminders-label">
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
            </div>
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
      <div className={styles.formGroup}>
        <div className={styles.labelWithAction}>
          <label htmlFor="edit-firstnight">First Night Reminder</label>
          <span className={styles.nightOrderLabel}>
            Night Order
            <input
              type="number"
              className={styles.nightOrderInput}
              value={localFirstNight === 0 ? '' : localFirstNight}
              disabled={isOfficial}
              min={0}
              placeholder="0"
              onChange={(e) => {
                if (isOfficial) return;
                const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                setLocalFirstNight(val);
              }}
              onBlur={() => {
                if (isOfficial) return;
                let normalizedValue = localFirstNight || 0;
                if (localFirstNightReminder.trim() && normalizedValue === 0) {
                  normalizedValue = 1;
                }
                setLocalFirstNight(normalizedValue);
                onEditChange('firstNight', normalizedValue);
              }}
            />
          </span>
        </div>
        <textarea
          ref={registerTextareaRef}
          id="edit-firstnight"
          className={styles.autoExpand}
          value={localFirstNightReminder}
          disabled={isOfficial}
          onChange={(e) => {
            if (isOfficial) return;
            const newValue = e.target.value;
            setLocalFirstNightReminder(newValue);
            debouncedUpdate('firstNightReminder', newValue);
            if (newValue.trim() && localFirstNight === 0) {
              setLocalFirstNight(1);
              onEditChange('firstNight', 1);
            }
          }}
          onInput={handleTextareaInput}
          onBlur={() => {
            if (!isOfficial) onEditChange('firstNightReminder', localFirstNightReminder);
          }}
          placeholder="Reminder text for the first night"
          rows={2}
        />
        <p className={styles.fieldHint}>Use *TEXT* for bold, :reminder: for reminder circle.</p>
        <FormatWarning
          issues={firstNightFormatIssues}
          disabled={isOfficial}
          onFix={handleFixFirstNightFormat}
        />
      </div>

      {/* Other Night Reminder */}
      <div className={styles.formGroup}>
        <div className={styles.labelWithAction}>
          <label htmlFor="edit-othernight">Other Night Reminder</label>
          <span className={styles.nightOrderLabel}>
            Night Order
            <input
              type="number"
              className={styles.nightOrderInput}
              value={localOtherNight === 0 ? '' : localOtherNight}
              disabled={isOfficial}
              min={0}
              placeholder="0"
              onChange={(e) => {
                if (isOfficial) return;
                const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                setLocalOtherNight(val);
              }}
              onBlur={() => {
                if (isOfficial) return;
                let normalizedValue = localOtherNight || 0;
                if (localOtherNightReminder.trim() && normalizedValue === 0) {
                  normalizedValue = 1;
                }
                setLocalOtherNight(normalizedValue);
                onEditChange('otherNight', normalizedValue);
              }}
            />
          </span>
        </div>
        <textarea
          ref={registerTextareaRef}
          id="edit-othernight"
          className={styles.autoExpand}
          value={localOtherNightReminder}
          disabled={isOfficial}
          onChange={(e) => {
            if (isOfficial) return;
            const newValue = e.target.value;
            setLocalOtherNightReminder(newValue);
            debouncedUpdate('otherNightReminder', newValue);
            if (newValue.trim() && localOtherNight === 0) {
              setLocalOtherNight(1);
              onEditChange('otherNight', 1);
            }
          }}
          onInput={handleTextareaInput}
          onBlur={() => {
            if (!isOfficial) onEditChange('otherNightReminder', localOtherNightReminder);
          }}
          placeholder="Reminder text for other nights"
          rows={2}
        />
        <p className={styles.fieldHint}>Use *TEXT* for bold, :reminder: for reminder circle.</p>
        <FormatWarning
          issues={otherNightFormatIssues}
          disabled={isOfficial}
          onFix={handleFixOtherNightFormat}
        />
      </div>

      {/* Special Items */}
      <SpecialItemsEditor
        character={character}
        disabled={isOfficial}
        onEditChange={onEditChange}
      />
    </div>
  );
});

export default GameplayTabContent;
