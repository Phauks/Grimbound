/**
 * Edit Preset Modal
 *
 * Modal for editing an existing preset's name, description, and icon.
 * Migrated to use unified Modal and Button components.
 */

import { useEffect, useState } from 'react';
import type { CustomPreset } from '../../../../hooks/usePresets';
import styles from '../../../../styles/components/presets/PresetModal.module.css';
import { FormGroup, Input } from '../../../Shared/Form';
import { Modal } from '../../../Shared/ModalBase/Modal';
import { Button } from '../../../Shared/UI/Button';

interface EditPresetModalProps {
  isOpen: boolean;
  preset: CustomPreset;
  onClose: () => void;
  onSave: (name: string, icon: string, description: string) => void;
}

const EMOJI_OPTIONS = ['⭐', '🌸', '⬜', '🎨', '✨', '🎭', '🎪', '🎯', '🌙', '🔥', '💎', '🍀'];

export function EditPresetModal({ isOpen, preset, onClose, onSave }: EditPresetModalProps) {
  const [presetName, setPresetName] = useState(preset.name);
  const [presetDescription, setPresetDescription] = useState(preset.description || '');
  const [presetIcon, setPresetIcon] = useState(preset.icon);

  // Reset form when preset changes
  useEffect(() => {
    setPresetName(preset.name);
    setPresetDescription(preset.description || '');
    setPresetIcon(preset.icon);
  }, [preset]);

  const handleSave = () => {
    if (!presetName.trim()) return;
    onSave(presetName, presetIcon, presetDescription);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Preset"
      size="medium"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="accent" onClick={handleSave} disabled={!presetName.trim()}>
            Save Changes
          </Button>
        </>
      }
    >
      <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
        <FormGroup label="Preset Name" htmlFor="editPresetName" required>
          <Input
            id="editPresetName"
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

        <FormGroup label="Description" htmlFor="editPresetDescription">
          <Input
            id="editPresetDescription"
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
    </Modal>
  );
}
