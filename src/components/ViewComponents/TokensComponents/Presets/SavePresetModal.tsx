/**
 * Save Preset Modal
 *
 * Modal for saving current settings as a new preset.
 * Supports drag-and-drop import of preset files.
 * Migrated to use unified Modal, Button, and Alert components.
 */

import { useCallback, useRef, useState } from 'react';
import styles from '../../../../styles/components/presets/PresetModal.module.css';
import { FormGroup, Input } from '../../../Shared/Form';
import { Modal } from '../../../Shared/ModalBase/Modal';
import { Alert } from '../../../Shared/UI/Alert';
import { Button } from '../../../Shared/UI/Button';

interface SavePresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, icon: string, description: string) => void;
  onImport?: (file: File) => Promise<void>;
  importError?: string | null;
}

const EMOJI_OPTIONS = ['⭐', '🌸', '⬜', '🎨', '✨', '🎭', '🎪', '🎯', '🌙', '🔥', '💎', '🍀'];

export function SavePresetModal({
  isOpen,
  onClose,
  onSave,
  onImport,
  importError,
}: SavePresetModalProps) {
  const [presetName, setPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');
  const [presetIcon, setPresetIcon] = useState('⭐');
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    if (!presetName.trim()) return;
    try {
      onSave(presetName, presetIcon, presetDescription);
      setPresetName('');
      setPresetDescription('');
      setPresetIcon('⭐');
    } catch (err) {
      console.error('Failed to save preset:', err);
    }
  };

  const handleImportClick = () => {
    setLocalError(null);
    importInputRef.current?.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImport) {
      setLocalError(null);
      try {
        await onImport(file);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to import preset';
        setLocalError(message);
      }
      e.target.value = '';
    }
  };

  // Drag and drop handlers
  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (onImport) setIsDragging(true);
    },
    [onImport]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      setLocalError(null);

      if (!onImport) return;

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const file = files[0];
        if (file.type === 'application/json' || file.name.endsWith('.json')) {
          try {
            await onImport(file);
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to import preset';
            setLocalError(message);
          }
        } else {
          setLocalError('Please drop a JSON file');
        }
      }
    },
    [onImport]
  );

  const displayError = localError || importError;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Save Current Settings as Preset"
      size="medium"
      className={isDragging ? styles.dragOver : undefined}
      footer={
        <>
          {onImport && (
            <>
              <input
                ref={importInputRef}
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={handleImportFile}
              />
              <Button variant="secondary" onClick={handleImportClick}>
                📥 Import
              </Button>
            </>
          )}
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="accent" onClick={handleSave} disabled={!presetName.trim()}>
            Save Preset
          </Button>
        </>
      }
    >
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {displayError && (
          <Alert variant="error" style={{ marginBottom: 'var(--spacing-md)' }}>
            {displayError}
          </Alert>
        )}

        <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
          <FormGroup label="Preset Name" htmlFor="presetName" required>
            <Input
              id="presetName"
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="My Custom Preset"
              fullWidth
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSave();
                }
              }}
            />
          </FormGroup>

          <FormGroup label="Description" htmlFor="presetDescription">
            <Input
              id="presetDescription"
              type="text"
              value={presetDescription}
              onChange={(e) => setPresetDescription(e.target.value)}
              placeholder="Optional description of this preset"
              fullWidth
            />
          </FormGroup>

          <FormGroup label="Icon">
            <div className={styles.emojiPicker}>
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className={`${styles.emojiOption} ${presetIcon === emoji ? styles.selected : ''}`}
                  onClick={() => setPresetIcon(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </FormGroup>
        </form>
      </div>
    </Modal>
  );
}
