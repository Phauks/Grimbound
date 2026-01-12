/**
 * InlineEditableText Component
 *
 * Text that can be edited inline via double-click.
 * Used for renaming assets, folders, and other items.
 *
 * @example
 * ```tsx
 * <InlineEditableText
 *   value={asset.filename}
 *   onSave={handleRename}
 *   validate={(v) => v.trim() ? null : 'Name cannot be empty'}
 * />
 * ```
 */

import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import styles from '@/styles/components/shared/InlineEditableText.module.css';
import { cn } from '@/ts/utils';

export interface InlineEditableTextProps {
  /** Current value to display/edit */
  value: string;
  /** Called when user saves a new value */
  onSave: (newValue: string) => Promise<void> | void;
  /** Validation function - return error message or null if valid */
  validate?: (value: string) => string | null;
  /** Placeholder text when empty */
  placeholder?: string;
  /** Additional CSS class for the container */
  className?: string;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Maximum characters allowed */
  maxLength?: number;
  /** Whether to select all text on edit start */
  selectAllOnEdit?: boolean;
  /** Called when edit mode is entered */
  onEditStart?: () => void;
  /** Called when edit mode is exited (regardless of save/cancel) */
  onEditEnd?: () => void;
}

export function InlineEditableText({
  value,
  onSave,
  validate,
  placeholder = 'Untitled',
  className,
  disabled = false,
  maxLength,
  selectAllOnEdit = true,
  onEditStart,
  onEditEnd,
}: InlineEditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update edit value when prop value changes (while not editing)
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value);
    }
  }, [value, isEditing]);

  // Focus and select when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (selectAllOnEdit) {
        inputRef.current.select();
      }
    }
  }, [isEditing, selectAllOnEdit]);

  const startEditing = () => {
    if (disabled) return;
    setIsEditing(true);
    setEditValue(value);
    setError(null);
    onEditStart?.();
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditValue(value);
    setError(null);
    onEditEnd?.();
  };

  const saveEdit = async () => {
    const trimmedValue = editValue.trim();

    // If unchanged, just exit edit mode
    if (trimmedValue === value) {
      setIsEditing(false);
      setError(null);
      onEditEnd?.();
      return;
    }

    // Run validation
    if (validate) {
      const validationError = validate(trimmedValue);
      if (validationError) {
        setError(validationError);
        inputRef.current?.focus();
        return;
      }
    }

    // Save
    try {
      setIsSaving(true);
      setError(null);
      await onSave(trimmedValue);
      setIsEditing(false);
      onEditEnd?.();
    } catch (err) {
      setError((err as Error).message || 'Failed to save');
      inputRef.current?.focus();
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  };

  const handleBlur = () => {
    // Don't save on blur if there's an error (user might be fixing it)
    if (error) return;
    saveEdit();
  };

  const handleDoubleClick = () => {
    startEditing();
  };

  // Display mode - use button for proper accessibility
  if (!isEditing) {
    return (
      <button
        type="button"
        className={cn(styles.container, disabled && styles.disabled, className)}
        onDoubleClick={handleDoubleClick}
        onClick={startEditing}
        title={`${value || placeholder} (click to edit)`}
        disabled={disabled}
        aria-label={`Edit ${value || placeholder}`}
      >
        <span className={cn(styles.text, !value && styles.placeholder)}>
          {value || placeholder}
        </span>
      </button>
    );
  }

  // Edit mode
  return (
    <span className={cn(styles.container, styles.editing, className)}>
      <input
        ref={inputRef}
        type="text"
        className={cn(styles.input, error && styles.inputError)}
        value={editValue}
        onChange={(e) => {
          setEditValue(e.target.value);
          setError(null);
        }}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        disabled={isSaving}
        maxLength={maxLength}
        aria-invalid={!!error}
        aria-describedby={error ? 'inline-edit-error' : undefined}
      />
      {error && (
        <span id="inline-edit-error" className={styles.error} role="alert">
          {error}
        </span>
      )}
      {isSaving && <span className={styles.spinner} aria-hidden="true" />}
    </span>
  );
}
