/**
 * PresetSection Component
 *
 * Two-tier preset management UI:
 * - Global presets: Available across all projects
 * - Project presets: Stored with and travel with the project
 *
 * Features:
 * - Drag-and-drop reordering within tiers
 * - Drag-and-drop copy between tiers
 * - Reset to defaults button
 */

import { useCallback, useState } from 'react';
import { ConfirmDialog } from '@/components/Shared/ModalBase/ConfirmDialog';
import { useToast } from '@/contexts/ToastContext';
import { type Preset, type PresetTier, usePresets } from '@/hooks/editors/usePresets';
import styles from '@/styles/components/presets/PresetSection.module.css';
import { cn } from '@/ts/utils/index.js';
import { EditPresetModal } from './EditPresetModal';
import { PresetCard } from './PresetCard';
import { SavePresetModal } from './SavePresetModal';

interface PresetSectionProps {
  /** Force re-render when presets change externally */
  refreshKey?: number;
  /** Callback when presets change (for parent state sync) */
  onPresetsChange?: () => void;
}

export function PresetSection({ onPresetsChange }: PresetSectionProps) {
  const {
    // Global operations
    getGlobalPresets,
    saveGlobalPreset,
    deleteGlobalPreset,
    updateGlobalPresetSettings,
    editGlobalPreset,
    reorderGlobalPresets,
    duplicateGlobalPreset,
    // Local operations
    getLocalPresets,
    saveLocalPreset,
    deleteLocalPreset,
    updateLocalPresetSettings,
    editLocalPreset,
    reorderLocalPresets,
    duplicateLocalPreset,
    // Cross-tier
    copyToLocal,
    copyToGlobal,
    // Apply & reset
    applyPreset,
    resetToDefaults,
    // Export/Import
    exportPreset,
    importPreset,
    // Utility
    hasActiveProject,
  } = usePresets();

  const { addToast } = useToast();

  // UI State
  const [activePresetMenu, setActivePresetMenu] = useState<string | null>(null);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [editingPreset, setEditingPreset] = useState<{ preset: Preset; tier: PresetTier } | null>(
    null
  );
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Save modal state - includes which tier to save to
  const [saveModalState, setSaveModalState] = useState<{
    isOpen: boolean;
    tier: PresetTier;
  }>({ isOpen: false, tier: 'global' });

  // Drag state - track tier and index
  const [dragState, setDragState] = useState<{
    tier: PresetTier;
    index: number;
  } | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    tier: PresetTier;
    index: number;
  } | null>(null);
  const [containerDropTarget, setContainerDropTarget] = useState<PresetTier | null>(null);

  // Get current presets
  const globalPresets = getGlobalPresets();
  const localPresets = getLocalPresets();

  // ========================================================================
  // Confirmation Dialog Helpers
  // ========================================================================

  const showConfirm = useCallback((title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({ isOpen: true, title, message, onConfirm });
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmModal(null);
  }, []);

  // ========================================================================
  // Apply & Reset Handlers
  // ========================================================================

  const handleApplyPreset = useCallback(
    (preset: Preset) => {
      applyPreset(preset);
      setActivePresetId(preset.id);
      setActivePresetMenu(null);
    },
    [applyPreset]
  );

  const handleResetToDefaults = useCallback(() => {
    resetToDefaults();
    setActivePresetId(null);
    addToast('Reset to default settings', 'success');
  }, [resetToDefaults, addToast]);

  // ========================================================================
  // Global Preset Handlers
  // ========================================================================

  const handleSaveGlobalPreset = useCallback(
    (name: string, icon: string, description: string) => {
      try {
        const newPreset = saveGlobalPreset(name, description, icon);
        setSaveModalState({ isOpen: false, tier: 'global' });
        setActivePresetId(newPreset.id);
        onPresetsChange?.();
        addToast(`Preset "${name}" saved to Global`, 'success');
      } catch {
        addToast('Failed to save preset', 'error');
      }
    },
    [saveGlobalPreset, onPresetsChange, addToast]
  );

  const handleDeleteGlobalPreset = useCallback(
    (presetId: string) => {
      setActivePresetMenu(null);
      showConfirm('Delete Preset', 'Are you sure you want to delete this preset?', () => {
        try {
          deleteGlobalPreset(presetId);
          if (activePresetId === presetId) setActivePresetId(null);
          onPresetsChange?.();
          addToast('Preset deleted', 'success');
        } catch {
          addToast('Failed to delete preset', 'error');
        }
        closeConfirm();
      });
    },
    [deleteGlobalPreset, activePresetId, showConfirm, closeConfirm, onPresetsChange, addToast]
  );

  const handleUpdateGlobalPreset = useCallback(
    (presetId: string) => {
      setActivePresetMenu(null);
      showConfirm('Update Preset', 'Update this preset with current settings?', () => {
        try {
          updateGlobalPresetSettings(presetId);
          onPresetsChange?.();
          addToast('Preset updated', 'success');
        } catch {
          addToast('Failed to update preset', 'error');
        }
        closeConfirm();
      });
    },
    [updateGlobalPresetSettings, showConfirm, closeConfirm, onPresetsChange, addToast]
  );

  // ========================================================================
  // Local Preset Handlers
  // ========================================================================

  const handleSaveLocalPreset = useCallback(
    (name: string, icon: string, description: string) => {
      try {
        const newPreset = saveLocalPreset(name, description, icon);
        if (newPreset) {
          setSaveModalState({ isOpen: false, tier: 'local' });
          setActivePresetId(newPreset.id);
          onPresetsChange?.();
          addToast(`Preset "${name}" saved to Project`, 'success');
        } else {
          addToast('No active project to save preset to', 'error');
        }
      } catch {
        addToast('Failed to save preset', 'error');
      }
    },
    [saveLocalPreset, onPresetsChange, addToast]
  );

  const handleDeleteLocalPreset = useCallback(
    (presetId: string) => {
      setActivePresetMenu(null);
      showConfirm('Delete Preset', 'Are you sure you want to delete this preset?', () => {
        try {
          deleteLocalPreset(presetId);
          if (activePresetId === presetId) setActivePresetId(null);
          onPresetsChange?.();
          addToast('Preset deleted', 'success');
        } catch {
          addToast('Failed to delete preset', 'error');
        }
        closeConfirm();
      });
    },
    [deleteLocalPreset, activePresetId, showConfirm, closeConfirm, onPresetsChange, addToast]
  );

  const handleUpdateLocalPreset = useCallback(
    (presetId: string) => {
      setActivePresetMenu(null);
      showConfirm('Update Preset', 'Update this preset with current settings?', () => {
        try {
          updateLocalPresetSettings(presetId);
          onPresetsChange?.();
          addToast('Preset updated', 'success');
        } catch {
          addToast('Failed to update preset', 'error');
        }
        closeConfirm();
      });
    },
    [updateLocalPresetSettings, showConfirm, closeConfirm, onPresetsChange, addToast]
  );

  // ========================================================================
  // Edit Preset Handler (shared)
  // ========================================================================

  const handleEditPreset = useCallback(
    (name: string, icon: string, description: string) => {
      if (!editingPreset) return;

      try {
        if (editingPreset.tier === 'global') {
          editGlobalPreset(editingPreset.preset.id, name, icon, description);
        } else {
          editLocalPreset(editingPreset.preset.id, name, icon, description);
        }
        setEditingPreset(null);
        onPresetsChange?.();
        addToast('Preset updated', 'success');
      } catch {
        addToast('Failed to update preset', 'error');
      }
    },
    [editingPreset, editGlobalPreset, editLocalPreset, onPresetsChange, addToast]
  );

  // ========================================================================
  // Duplicate & Export Handlers
  // ========================================================================

  const handleDuplicateGlobal = useCallback(
    (preset: Preset) => {
      try {
        const newPreset = duplicateGlobalPreset(preset);
        setActivePresetMenu(null);
        setActivePresetId(newPreset.id);
        onPresetsChange?.();
        addToast('Preset duplicated', 'success');
      } catch {
        addToast('Failed to duplicate preset', 'error');
      }
    },
    [duplicateGlobalPreset, onPresetsChange, addToast]
  );

  const handleDuplicateLocal = useCallback(
    (preset: Preset) => {
      try {
        const newPreset = duplicateLocalPreset(preset);
        if (newPreset) {
          setActivePresetMenu(null);
          setActivePresetId(newPreset.id);
          onPresetsChange?.();
          addToast('Preset duplicated', 'success');
        }
      } catch {
        addToast('Failed to duplicate preset', 'error');
      }
    },
    [duplicateLocalPreset, onPresetsChange, addToast]
  );

  const handleExport = useCallback(
    (preset: Preset) => {
      try {
        exportPreset(preset);
        setActivePresetMenu(null);
        addToast(`Preset "${preset.name}" exported`, 'success');
      } catch {
        addToast('Failed to export preset', 'error');
      }
    },
    [exportPreset, addToast]
  );

  // ========================================================================
  // Cross-Tier Copy Handlers
  // ========================================================================

  const handleCopyToLocal = useCallback(
    (preset: Preset) => {
      try {
        const copied = copyToLocal(preset);
        if (copied) {
          setActivePresetMenu(null);
          onPresetsChange?.();
          addToast(`"${preset.name}" copied to Project`, 'success');
        } else {
          addToast('No active project', 'error');
        }
      } catch {
        addToast('Failed to copy preset', 'error');
      }
    },
    [copyToLocal, onPresetsChange, addToast]
  );

  const handleCopyToGlobal = useCallback(
    (preset: Preset) => {
      try {
        copyToGlobal(preset);
        setActivePresetMenu(null);
        onPresetsChange?.();
        addToast(`"${preset.name}" copied to Global`, 'success');
      } catch {
        addToast('Failed to copy preset', 'error');
      }
    },
    [copyToGlobal, onPresetsChange, addToast]
  );

  // ========================================================================
  // Drag and Drop Handlers
  // ========================================================================

  const handleDragStart = useCallback((e: React.DragEvent, tier: PresetTier, index: number) => {
    setDragState({ tier, index });
    e.dataTransfer.effectAllowed = 'copyMove';
    e.dataTransfer.setData('text/plain', JSON.stringify({ tier, index }));
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, tier: PresetTier, index: number) => {
      e.preventDefault();
      // Show copy effect when dragging between tiers, move within same tier
      e.dataTransfer.dropEffect = dragState?.tier !== tier ? 'copy' : 'move';
      setDropTarget({ tier, index });
    },
    [dragState]
  );

  const handleDragLeave = useCallback(() => {
    setDropTarget(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetTier: PresetTier, targetIndex: number) => {
      e.preventDefault();

      if (!dragState) return;

      const { tier: sourceTier, index: sourceIndex } = dragState;

      // Same tier - reorder
      if (sourceTier === targetTier) {
        if (sourceIndex !== targetIndex) {
          if (targetTier === 'global') {
            reorderGlobalPresets(sourceIndex, targetIndex);
          } else {
            reorderLocalPresets(sourceIndex, targetIndex);
          }
          onPresetsChange?.();
        }
      } else {
        // Different tier - copy
        const sourcePresets = sourceTier === 'global' ? globalPresets : localPresets;
        const preset = sourcePresets[sourceIndex];

        if (preset) {
          if (targetTier === 'local') {
            handleCopyToLocal(preset);
          } else {
            handleCopyToGlobal(preset);
          }
        }
      }

      setDragState(null);
      setDropTarget(null);
    },
    [
      dragState,
      globalPresets,
      localPresets,
      reorderGlobalPresets,
      reorderLocalPresets,
      handleCopyToLocal,
      handleCopyToGlobal,
      onPresetsChange,
    ]
  );

  const handleDragEnd = useCallback(() => {
    setDragState(null);
    setDropTarget(null);
    setContainerDropTarget(null);
  }, []);

  // Container-level drag handlers for dropping anywhere in the section
  const handleContainerDragOver = useCallback(
    (e: React.DragEvent, tier: PresetTier) => {
      // Only handle cross-tier drops
      if (!dragState || dragState.tier === tier) return;

      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      setContainerDropTarget(tier);
    },
    [dragState]
  );

  const handleContainerDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if leaving the container (not entering a child)
    const relatedTarget = e.relatedTarget as Node | null;
    const currentTarget = e.currentTarget as Node;
    if (!(relatedTarget && currentTarget.contains(relatedTarget))) {
      setContainerDropTarget(null);
    }
  }, []);

  const handleContainerDrop = useCallback(
    (e: React.DragEvent, targetTier: PresetTier) => {
      // Only handle cross-tier drops
      if (!dragState || dragState.tier === targetTier) return;

      e.preventDefault();

      const { tier: sourceTier, index: sourceIndex } = dragState;
      const sourcePresets = sourceTier === 'global' ? globalPresets : localPresets;
      const preset = sourcePresets[sourceIndex];

      if (preset) {
        if (targetTier === 'local') {
          handleCopyToLocal(preset);
        } else {
          handleCopyToGlobal(preset);
        }
      }

      setDragState(null);
      setDropTarget(null);
      setContainerDropTarget(null);
    },
    [dragState, globalPresets, localPresets, handleCopyToLocal, handleCopyToGlobal]
  );

  // ========================================================================
  // Import Handler
  // ========================================================================

  const handleImport = useCallback(
    async (file: File) => {
      try {
        const newPreset = await importPreset(file, saveModalState.tier);
        setSaveModalState({ isOpen: false, tier: 'global' });
        setActivePresetId(newPreset.id);
        onPresetsChange?.();
        addToast(`Preset "${newPreset.name}" imported`, 'success');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Invalid preset file';
        addToast(message, 'error');
        throw err;
      }
    },
    [importPreset, saveModalState.tier, onPresetsChange, addToast]
  );

  // ========================================================================
  // Menu Items Builders
  // ========================================================================

  const getGlobalMenuItems = (preset: Preset) => [
    {
      icon: '✏️',
      label: 'Edit',
      description: 'Change name, icon, or description',
      onClick: () => {
        setEditingPreset({ preset, tier: 'global' });
        setActivePresetMenu(null);
      },
    },
    {
      icon: '💾',
      label: 'Update Settings',
      description: 'Save current settings to this preset',
      onClick: () => handleUpdateGlobalPreset(preset.id),
    },
    {
      icon: '📋',
      label: 'Duplicate',
      description: 'Create a copy of this preset',
      onClick: () => handleDuplicateGlobal(preset),
    },
    ...(hasActiveProject
      ? [
          {
            icon: '📁',
            label: 'Copy to Project',
            description: 'Copy this preset to the current project',
            onClick: () => handleCopyToLocal(preset),
          },
        ]
      : []),
    {
      icon: '📤',
      label: 'Export',
      description: 'Download preset as a JSON file',
      onClick: () => handleExport(preset),
    },
    {
      icon: '🗑️',
      label: 'Delete',
      description: 'Permanently remove this preset',
      onClick: () => handleDeleteGlobalPreset(preset.id),
    },
  ];

  const getLocalMenuItems = (preset: Preset) => [
    {
      icon: '✏️',
      label: 'Edit',
      description: 'Change name, icon, or description',
      onClick: () => {
        setEditingPreset({ preset, tier: 'local' });
        setActivePresetMenu(null);
      },
    },
    {
      icon: '💾',
      label: 'Update Settings',
      description: 'Save current settings to this preset',
      onClick: () => handleUpdateLocalPreset(preset.id),
    },
    {
      icon: '📋',
      label: 'Duplicate',
      description: 'Create a copy of this preset',
      onClick: () => handleDuplicateLocal(preset),
    },
    {
      icon: '🌐',
      label: 'Copy to Global',
      description: 'Copy this preset to global presets',
      onClick: () => handleCopyToGlobal(preset),
    },
    {
      icon: '📤',
      label: 'Export',
      description: 'Download preset as a JSON file',
      onClick: () => handleExport(preset),
    },
    {
      icon: '🗑️',
      label: 'Delete',
      description: 'Permanently remove this preset',
      onClick: () => handleDeleteLocalPreset(preset.id),
    },
  ];

  // ========================================================================
  // Render
  // ========================================================================

  return (
    <div className={styles.presetSection}>
      {/* Global Presets */}
      <div className={styles.presetGroup}>
        <div className={styles.presetGroupLabel}>
          <span>🌐 Global</span>
          <span className={styles.presetGroupHint}>Available across all projects</span>
        </div>
        <section
          aria-label="Global presets"
          className={cn(
            styles.presetButtons,
            containerDropTarget === 'global' && styles.containerDropTarget
          )}
          onDragOver={(e) => handleContainerDragOver(e, 'global')}
          onDragLeave={handleContainerDragLeave}
          onDrop={(e) => handleContainerDrop(e, 'global')}
        >
          {globalPresets.map((preset, index) => (
            <PresetCard
              key={preset.id}
              icon={preset.icon}
              name={preset.name}
              title={preset.description || preset.name}
              isActive={activePresetId === preset.id}
              onApply={() => handleApplyPreset(preset)}
              onMenuToggle={() =>
                setActivePresetMenu(activePresetMenu === preset.id ? null : preset.id)
              }
              menuIsOpen={activePresetMenu === preset.id}
              menuItems={getGlobalMenuItems(preset)}
              draggable={true}
              isDragging={dragState?.tier === 'global' && dragState?.index === index}
              isDropTarget={dropTarget?.tier === 'global' && dropTarget?.index === index}
              onDragStart={(e) => handleDragStart(e, 'global', index)}
              onDragOver={(e) => handleDragOver(e, 'global', index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'global', index)}
              onDragEnd={handleDragEnd}
            />
          ))}
          {/* Add new global preset button */}
          <PresetCard
            icon="➕"
            name="New"
            title="Create new global preset from current settings"
            onApply={() => setSaveModalState({ isOpen: true, tier: 'global' })}
            onMenuToggle={() => {}}
            isAddButton
          />
        </section>
      </div>

      {/* Project Presets */}
      <div className={styles.presetGroup}>
        <div className={styles.presetGroupLabel}>
          <span>📁 Project</span>
          <span className={styles.presetGroupHint}>
            {hasActiveProject ? 'Saved with this project' : 'No project loaded'}
          </span>
        </div>
        <section
          aria-label="Project presets"
          className={cn(
            styles.presetButtons,
            containerDropTarget === 'local' && styles.containerDropTarget
          )}
          onDragOver={(e) => handleContainerDragOver(e, 'local')}
          onDragLeave={handleContainerDragLeave}
          onDrop={(e) => handleContainerDrop(e, 'local')}
        >
          {localPresets.map((preset, index) => (
            <PresetCard
              key={preset.id}
              icon={preset.icon}
              name={preset.name}
              title={preset.description || preset.name}
              isActive={activePresetId === preset.id}
              onApply={() => handleApplyPreset(preset)}
              onMenuToggle={() =>
                setActivePresetMenu(activePresetMenu === preset.id ? null : preset.id)
              }
              menuIsOpen={activePresetMenu === preset.id}
              menuItems={getLocalMenuItems(preset)}
              draggable={true}
              isDragging={dragState?.tier === 'local' && dragState?.index === index}
              isDropTarget={dropTarget?.tier === 'local' && dropTarget?.index === index}
              onDragStart={(e) => handleDragStart(e, 'local', index)}
              onDragOver={(e) => handleDragOver(e, 'local', index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'local', index)}
              onDragEnd={handleDragEnd}
            />
          ))}
          {/* Add new local preset button - disabled if no project */}
          <PresetCard
            icon="➕"
            name="New"
            title={
              hasActiveProject
                ? 'Create new project preset from current settings'
                : 'Load a project to create project presets'
            }
            onApply={() =>
              hasActiveProject
                ? setSaveModalState({ isOpen: true, tier: 'local' })
                : addToast('Load a project first to create project presets', 'info')
            }
            onMenuToggle={() => {}}
            isAddButton
            disabled={!hasActiveProject}
          />
        </section>
      </div>

      {/* Drag hint */}
      {(globalPresets.length > 0 || localPresets.length > 0) && (
        <div className={styles.dragHint}>Drag presets between sections to copy</div>
      )}

      {/* Save Preset Modal */}
      <SavePresetModal
        isOpen={saveModalState.isOpen}
        onClose={() => setSaveModalState({ isOpen: false, tier: 'global' })}
        onSave={saveModalState.tier === 'global' ? handleSaveGlobalPreset : handleSaveLocalPreset}
        onImport={handleImport}
      />

      {/* Edit Preset Modal */}
      {editingPreset && (
        <EditPresetModal
          isOpen={true}
          preset={editingPreset.preset}
          onClose={() => setEditingPreset(null)}
          onSave={handleEditPreset}
          onResetToDefaults={handleResetToDefaults}
        />
      )}

      {/* Confirm Dialog */}
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
