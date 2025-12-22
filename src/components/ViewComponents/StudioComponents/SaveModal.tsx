/**
 * Save Modal Component
 *
 * Simple modal for naming assets when saving.
 */

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import styles from '@/styles/components/studio/Studio.module.css';
import { cn } from '@/ts/utils/classNames.js';

export interface SaveModalProps {
  isOpen: boolean;
  saveAsNew: boolean;
  initialName: string;
  onSave: (name: string) => void;
  onCancel: () => void;
}

export const SaveModal = memo(function SaveModal({
  isOpen,
  saveAsNew,
  initialName,
  onSave,
  onCancel,
}: SaveModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(initialName);

  // Sync name when modal opens
  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      const timer = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialName]);

  const handleConfirm = useCallback(() => {
    if (name.trim()) {
      onSave(name.trim());
    }
  }, [name, onSave]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleConfirm();
      if (e.key === 'Escape') onCancel();
    },
    [handleConfirm, onCancel]
  );

  if (!isOpen) return null;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Modal backdrop is intentionally a click-to-dismiss overlay
    <div className={styles.processingOverlay} role="presentation" onClick={onCancel}>
      <div
        className={styles.saveModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-modal-title"
        style={{
          background: 'var(--bg-panel)',
          borderRadius: 'var(--border-radius)',
          minWidth: '300px',
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <h3 id="save-modal-title" style={{ margin: '0 0 var(--spacing-md) 0' }}>
          {saveAsNew ? 'Save as New Asset' : 'Save Asset'}
        </h3>
        <input
          ref={inputRef}
          type="text"
          className={styles.saveModalInput}
          placeholder="Asset name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className={styles.saveModalActions}>
          <button
            type="button"
            className={cn(styles.actionButton, styles.secondary)}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.actionButton}
            onClick={handleConfirm}
            disabled={!name.trim()}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
});
