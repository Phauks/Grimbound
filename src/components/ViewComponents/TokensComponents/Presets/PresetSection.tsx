import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { type CustomPreset, usePresets } from '@/hooks/usePresets';
import styles from '@/styles/components/presets/PresetSection.module.css';
import { getPreset } from '@/ts/generation/presets';
import type { PresetName } from '@/ts/types/index';
import { ConfirmDialog } from '@/components/Shared/ModalBase/ConfirmDialog';
import { EditPresetModal } from './EditPresetModal';
import { PresetCard } from './PresetCard';
import { SavePresetModal } from './SavePresetModal';

interface PresetSectionProps {
  customPresets: CustomPreset[];
  onCustomPresetsChange: (presets: CustomPreset[]) => void;
  onShowSaveModal: () => void;
}

const BUILT_IN_PRESETS: Array<{ name: PresetName; icon: string }> = [
  { name: 'classic', icon: '⚙️' },
  { name: 'fullbloom', icon: '🌸' },
  { name: 'minimal', icon: '⬜' },
];

export function PresetSection({
  customPresets,
  onCustomPresetsChange,
  onShowSaveModal: _onShowSaveModal,
}: PresetSectionProps) {
  const {
    applyPreset,
    applyCustomPreset,
    deleteCustomPreset,
    updateCustomPreset,
    saveCustomPreset,
    getCustomPresets,
    duplicateCustomPreset,
    duplicateBuiltInPreset,
    editPreset,
    setDefaultPreset,
    getDefaultPresetId,
    loadDefaultPreset,
    exportPreset,
    importPreset,
    reorderPresets,
  } = usePresets();

  const { addToast } = useToast();

  const [activePresetMenu, setActivePresetMenu] = useState<string | null>(null);
  const [showSavePresetModal, setShowSavePresetModal] = useState(false);
  const [activePresetId, setActivePresetId] = useState<string>(() => getDefaultPresetId());
  const [editingPreset, setEditingPreset] = useState<CustomPreset | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Drag and drop state for custom presets
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

  // Load default preset on mount
  useEffect(() => {
    loadDefaultPreset();
  }, [loadDefaultPreset]);

  const showConfirm = useCallback((title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({ isOpen: true, title, message, onConfirm });
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmModal(null);
  }, []);

  const handleDeleteCustomPreset = useCallback(
    (presetId: string) => {
      setActivePresetMenu(null); // Close menu before showing confirm
      showConfirm('Delete Preset', 'Are you sure you want to delete this preset?', () => {
        try {
          deleteCustomPreset(presetId);
          onCustomPresetsChange(getCustomPresets());
          if (activePresetId === presetId) {
            setActivePresetId('classic');
          }
          addToast('Preset deleted', 'success');
        } catch (_err) {
          addToast('Failed to delete preset', 'error');
        }
        closeConfirm();
      });
    },
    [
      deleteCustomPreset,
      getCustomPresets,
      onCustomPresetsChange,
      activePresetId,
      showConfirm,
      closeConfirm,
      addToast,
    ]
  );

  const handleUpdateCustomPreset = useCallback(
    (presetId: string) => {
      setActivePresetMenu(null); // Close menu before showing confirm
      showConfirm('Update Preset', 'Update this preset with current settings?', () => {
        try {
          updateCustomPreset(presetId);
          onCustomPresetsChange(getCustomPresets());
          addToast('Preset updated', 'success');
        } catch (_err) {
          addToast('Failed to update preset', 'error');
        }
        closeConfirm();
      });
    },
    [
      updateCustomPreset,
      getCustomPresets,
      onCustomPresetsChange,
      showConfirm,
      closeConfirm,
      addToast,
    ]
  );

  const handleApplyPreset = useCallback(
    (presetName: PresetName) => {
      const result = applyPreset(presetName);
      if (result) {
        setActivePresetId(presetName);
      }
    },
    [applyPreset]
  );

  const handleApplyCustomPreset = useCallback(
    (preset: CustomPreset) => {
      const result = applyCustomPreset(preset);
      if (result) {
        setActivePresetId(preset.id);
      }
    },
    [applyCustomPreset]
  );

  const handleSavePreset = useCallback(
    (presetName: string, presetIcon: string, description: string) => {
      try {
        const newPreset = saveCustomPreset(presetName, description, presetIcon);
        onCustomPresetsChange(getCustomPresets());
        setShowSavePresetModal(false);
        setActivePresetId(newPreset.id);
        addToast(`Preset "${presetName}" saved`, 'success');
      } catch (_err) {
        addToast('Failed to save preset', 'error');
      }
    },
    [saveCustomPreset, getCustomPresets, onCustomPresetsChange, addToast]
  );

  const handleDuplicateBuiltIn = useCallback(
    (presetName: PresetName) => {
      try {
        const newPreset = duplicateBuiltInPreset(presetName);
        onCustomPresetsChange(getCustomPresets());
        setActivePresetMenu(null);
        setActivePresetId(newPreset.id);
        addToast('Preset duplicated', 'success');
      } catch (_err) {
        addToast('Failed to duplicate preset', 'error');
      }
    },
    [duplicateBuiltInPreset, getCustomPresets, onCustomPresetsChange, addToast]
  );

  const handleDuplicateCustom = useCallback(
    (preset: CustomPreset) => {
      try {
        const newPreset = duplicateCustomPreset(preset);
        onCustomPresetsChange(getCustomPresets());
        setActivePresetMenu(null);
        setActivePresetId(newPreset.id);
        addToast('Preset duplicated', 'success');
      } catch (_err) {
        addToast('Failed to duplicate preset', 'error');
      }
    },
    [duplicateCustomPreset, getCustomPresets, onCustomPresetsChange, addToast]
  );

  const handleEditPreset = useCallback(
    (name: string, icon: string, description: string) => {
      if (editingPreset) {
        try {
          editPreset(editingPreset.id, name, icon, description);
          onCustomPresetsChange(getCustomPresets());
          setEditingPreset(null);
          addToast('Preset updated', 'success');
        } catch (_err) {
          addToast('Failed to update preset', 'error');
        }
      }
    },
    [editingPreset, editPreset, getCustomPresets, onCustomPresetsChange, addToast]
  );

  const handleSetDefault = useCallback(
    (presetId: string, isCurrentlyDefault: boolean) => {
      // If already default, remove default (set to classic)
      // Otherwise, set this preset as default
      const newDefaultId = isCurrentlyDefault ? 'classic' : presetId;
      setDefaultPreset(newDefaultId);
      setActivePresetMenu(null);
      // Force re-render to update default star
      onCustomPresetsChange(getCustomPresets());
    },
    [setDefaultPreset, getCustomPresets, onCustomPresetsChange]
  );

  // Drag and drop handlers for custom presets
  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (draggedIndex !== null && draggedIndex !== index) {
        setDropTargetIndex(index);
      }
    },
    [draggedIndex]
  );

  const handleDragLeave = useCallback(() => {
    setDropTargetIndex(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, toIndex: number) => {
      e.preventDefault();
      if (draggedIndex !== null && draggedIndex !== toIndex) {
        const success = reorderPresets(draggedIndex, toIndex);
        if (success) {
          onCustomPresetsChange(getCustomPresets());
        }
      }
      setDraggedIndex(null);
      setDropTargetIndex(null);
    },
    [draggedIndex, reorderPresets, getCustomPresets, onCustomPresetsChange]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDropTargetIndex(null);
  }, []);

  const handleExportPreset = useCallback(
    (preset: CustomPreset) => {
      try {
        exportPreset(preset);
        setActivePresetMenu(null);
        addToast(`Preset "${preset.name}" exported`, 'success');
      } catch (_err) {
        addToast('Failed to export preset', 'error');
      }
    },
    [exportPreset, addToast]
  );

  const _handleImportFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const newPreset = await importPreset(file);
        onCustomPresetsChange(getCustomPresets());
        setActivePresetId(newPreset.id);
        addToast(`Preset "${newPreset.name}" imported`, 'success');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Invalid preset file';
        addToast(message, 'error');
      }

      // Reset input
      e.target.value = '';
    },
    [importPreset, getCustomPresets, onCustomPresetsChange, addToast]
  );

  const defaultPresetId = getDefaultPresetId();

  return (
    <div className={styles.presetSection}>
      {/* Built-in Presets */}
      <div className={styles.presetGroup}>
        <div className={styles.presetGroupLabel}>Built-in</div>
        <div className={styles.presetButtons}>
          {BUILT_IN_PRESETS.map(({ name, icon }) => {
            const preset = getPreset(name);
            const isDefault = defaultPresetId === name;
            return (
              <PresetCard
                key={name}
                icon={icon}
                name={preset.name}
                title={preset.description}
                isActive={activePresetId === name}
                defaultStar={isDefault}
                onApply={() => handleApplyPreset(name)}
                onMenuToggle={() => setActivePresetMenu(activePresetMenu === name ? null : name)}
                menuIsOpen={activePresetMenu === name}
                menuItems={[
                  {
                    icon: '📋',
                    label: 'Duplicate',
                    description: 'Create a copy as a custom preset',
                    onClick: () => handleDuplicateBuiltIn(name),
                  },
                  {
                    icon: isDefault ? '⭐' : '☆',
                    label: isDefault ? 'Remove Default' : 'Set as Default',
                    description: isDefault
                      ? 'Remove as startup preset'
                      : 'Load this preset on startup',
                    onClick: () => handleSetDefault(name, isDefault),
                  },
                ]}
              />
            );
          })}
        </div>
      </div>

      {/* Custom Presets + Add button */}
      <div className={styles.presetGroup}>
        <div className={styles.presetGroupLabel}>Custom</div>
        <div className={styles.presetButtons}>
          {customPresets.map((preset, index) => {
            const isDefault = defaultPresetId === preset.id;
            return (
              <PresetCard
                key={preset.id}
                icon={preset.icon}
                name={preset.name}
                title={preset.description || preset.name}
                isActive={activePresetId === preset.id}
                defaultStar={isDefault}
                onApply={() => handleApplyCustomPreset(preset)}
                onMenuToggle={() =>
                  setActivePresetMenu(activePresetMenu === preset.id ? null : preset.id)
                }
                menuIsOpen={activePresetMenu === preset.id}
                // Drag and drop props for custom presets
                draggable={true}
                isDragging={draggedIndex === index}
                isDropTarget={dropTargetIndex === index}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                menuItems={[
                  {
                    icon: '✏️',
                    label: 'Edit',
                    description: 'Change name, icon, or description',
                    onClick: () => {
                      setEditingPreset(preset);
                      setActivePresetMenu(null);
                    },
                  },
                  {
                    icon: '💾',
                    label: 'Update Settings',
                    description: 'Save current settings to this preset',
                    onClick: () => handleUpdateCustomPreset(preset.id),
                  },
                  {
                    icon: '📋',
                    label: 'Duplicate',
                    description: 'Create a copy of this preset',
                    onClick: () => handleDuplicateCustom(preset),
                  },
                  {
                    icon: '📤',
                    label: 'Export',
                    description: 'Download preset as a JSON file',
                    onClick: () => handleExportPreset(preset),
                  },
                  {
                    icon: isDefault ? '⭐' : '☆',
                    label: isDefault ? 'Remove Default' : 'Set as Default',
                    description: isDefault
                      ? 'Remove as startup preset'
                      : 'Load this preset on startup',
                    onClick: () => handleSetDefault(preset.id, isDefault),
                  },
                  {
                    icon: '🗑️',
                    label: 'Delete',
                    description: 'Permanently remove this preset',
                    onClick: () => handleDeleteCustomPreset(preset.id),
                  },
                ]}
              />
            );
          })}
          {/* Add new preset button */}
          <PresetCard
            icon="➕"
            name="New"
            title="Create new preset from current settings"
            onApply={() => setShowSavePresetModal(true)}
            onMenuToggle={() => {}}
            isAddButton
          />
        </div>
      </div>

      <SavePresetModal
        isOpen={showSavePresetModal}
        onClose={() => setShowSavePresetModal(false)}
        onSave={handleSavePreset}
        onImport={async (file: File) => {
          try {
            const newPreset = await importPreset(file);
            onCustomPresetsChange(getCustomPresets());
            setActivePresetId(newPreset.id);
            setShowSavePresetModal(false);
            addToast(`Preset "${newPreset.name}" imported`, 'success');
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Invalid preset file';
            addToast(message, 'error');
            throw err; // Re-throw so SavePresetModal can also show the error
          }
        }}
      />

      {editingPreset && (
        <EditPresetModal
          isOpen={true}
          preset={editingPreset}
          onClose={() => setEditingPreset(null)}
          onSave={handleEditPreset}
        />
      )}

      {confirmModal && (
        <ConfirmDialog
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onClose={closeConfirm}
        />
      )}
    </div>
  );
}
