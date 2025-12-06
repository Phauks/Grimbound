import { useState, useEffect } from 'react'
import type { CustomPreset } from '../../hooks/usePresets'
import styles from '../../styles/components/presets/PresetModal.module.css'
import modalStyles from '../../styles/components/layout/Modal.module.css'

interface EditPresetModalProps {
  isOpen: boolean
  preset: CustomPreset
  onClose: () => void
  onSave: (name: string, icon: string, description: string) => void
}

export function EditPresetModal({ isOpen, preset, onClose, onSave }: EditPresetModalProps) {
  const [presetName, setPresetName] = useState(preset.name)
  const [presetDescription, setPresetDescription] = useState(preset.description || '')
  const [presetIcon, setPresetIcon] = useState(preset.icon)

  // Reset form when preset changes
  useEffect(() => {
    setPresetName(preset.name)
    setPresetDescription(preset.description || '')
    setPresetIcon(preset.icon)
  }, [preset])

  const handleSave = () => {
    if (!presetName.trim()) {
      return
    }
    onSave(presetName, presetIcon, presetDescription)
  }

  if (!isOpen) return null

  return (
    <div className={modalStyles.overlay}>
      <div className={modalStyles.backdrop} onClick={onClose} />
      <div className={modalStyles.container}>
        <div className={modalStyles.header}>
          <h2>Edit Preset</h2>
          <button className={modalStyles.closeBtn} onClick={onClose}>
            ×
          </button>
        </div>
        <div className={modalStyles.body}>
          <form className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="editPresetName">Preset Name *</label>
              <input
                id="editPresetName"
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="My Custom Preset"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleSave()
                  }
                }}
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="editPresetDescription">Description</label>
              <input
                id="editPresetDescription"
                type="text"
                value={presetDescription}
                onChange={(e) => setPresetDescription(e.target.value)}
                placeholder="Optional description of this preset"
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="editPresetIcon">Icon</label>
              <div className={styles.emojiPicker}>
                {['⭐', '🌸', '⬜', '🎨', '✨', '🎭', '🎪', '🎯', '🌙', '🔥', '💎', '🍀'].map((emoji) => (
                  <button
                    key={emoji}
                    className={`${styles.emojiOption} ${presetIcon === emoji ? styles.selected : ''}`}
                    onClick={(e) => {
                      e.preventDefault()
                      setPresetIcon(emoji)
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </form>
        </div>
        <div className={modalStyles.actions}>
          <button className={modalStyles.secondaryBtn} onClick={onClose}>
            Cancel
          </button>
          <button className={modalStyles.primaryBtn} onClick={handleSave} disabled={!presetName.trim()}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}
