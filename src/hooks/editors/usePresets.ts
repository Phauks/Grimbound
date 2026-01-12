/**
 * usePresets Hook
 *
 * Manages the two-tier preset system:
 * - Global presets: Stored in localStorage, available across all projects
 * - Local presets: Stored in ProjectState, travel with project exports/imports
 *
 * @module hooks/editors/usePresets
 */

import { useProjectContext } from '@/contexts/ProjectContext';
import { useTokenContext } from '@/contexts/TokenContext';
import {
  createPreset,
  duplicatePreset,
  getDefaultOptions,
  isValidPreset,
} from '@/ts/generation/presets.js';
import type { GenerationOptions, Preset, PresetTier, PresetWithTier } from '@/ts/types/index.js';
import {
  getStorageItem,
  logger,
  STORAGE_KEYS,
  sanitizeFilename,
  setStorageItem,
} from '@/ts/utils/index.js';

// Re-export types for consumers
export type { Preset, PresetTier, PresetWithTier };

// ============================================================================
// Storage Helpers
// ============================================================================

function loadGlobalPresets(): Preset[] {
  try {
    const data = getStorageItem(STORAGE_KEYS.GLOBAL_PRESETS);
    if (!data) return [];

    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];

    // Filter to only valid presets
    return parsed.filter(isValidPreset);
  } catch {
    return [];
  }
}

function saveGlobalPresets(presets: Preset[]): void {
  setStorageItem(STORAGE_KEYS.GLOBAL_PRESETS, JSON.stringify(presets));
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function usePresets() {
  const { updateGenerationOptions, generationOptions } = useTokenContext();
  const { currentProject, setCurrentProject, setIsDirty } = useProjectContext();

  // ========================================================================
  // Global Presets (localStorage)
  // ========================================================================

  const getGlobalPresets = (): Preset[] => loadGlobalPresets();

  const saveGlobalPreset = (name: string, description: string, icon: string): Preset => {
    try {
      const presets = loadGlobalPresets();
      const newPreset = createPreset(name, description, icon, generationOptions);
      presets.push(newPreset);
      saveGlobalPresets(presets);
      logger.info('usePresets', `Saved global preset: ${name}`);
      return newPreset;
    } catch (error) {
      logger.error('usePresets', 'Failed to save global preset', error);
      throw error;
    }
  };

  const deleteGlobalPreset = (presetId: string): void => {
    try {
      const presets = loadGlobalPresets();
      const filtered = presets.filter((p) => p.id !== presetId);
      saveGlobalPresets(filtered);
      logger.info('usePresets', `Deleted global preset: ${presetId}`);
    } catch (error) {
      logger.error('usePresets', 'Failed to delete global preset', error);
      throw error;
    }
  };

  const updateGlobalPresetSettings = (presetId: string): boolean => {
    try {
      const presets = loadGlobalPresets();
      const index = presets.findIndex((p) => p.id === presetId);
      if (index === -1) return false;

      presets[index] = {
        ...presets[index],
        settings: { ...generationOptions },
        updatedAt: Date.now(),
      };
      saveGlobalPresets(presets);
      logger.info('usePresets', `Updated global preset settings: ${presetId}`);
      return true;
    } catch (error) {
      logger.error('usePresets', 'Failed to update global preset', error);
      return false;
    }
  };

  const editGlobalPreset = (
    presetId: string,
    name: string,
    icon: string,
    description?: string
  ): boolean => {
    try {
      const presets = loadGlobalPresets();
      const index = presets.findIndex((p) => p.id === presetId);
      if (index === -1) return false;

      presets[index] = {
        ...presets[index],
        name,
        icon,
        ...(description !== undefined && { description }),
        updatedAt: Date.now(),
      };
      saveGlobalPresets(presets);
      return true;
    } catch (error) {
      logger.error('usePresets', 'Failed to edit global preset', error);
      return false;
    }
  };

  const reorderGlobalPresets = (fromIndex: number, toIndex: number): boolean => {
    try {
      const presets = loadGlobalPresets();
      if (
        fromIndex < 0 ||
        fromIndex >= presets.length ||
        toIndex < 0 ||
        toIndex >= presets.length
      ) {
        return false;
      }
      const [removed] = presets.splice(fromIndex, 1);
      presets.splice(toIndex, 0, removed);
      saveGlobalPresets(presets);
      return true;
    } catch (error) {
      logger.error('usePresets', 'Failed to reorder global presets', error);
      return false;
    }
  };

  // ========================================================================
  // Local Presets (Project State)
  // ========================================================================

  const updateProjectPresets = (newPresets: Preset[]) => {
    if (!currentProject) return;

    const updatedProject = {
      ...currentProject,
      state: {
        ...currentProject.state,
        presets: newPresets,
      },
      stats: {
        ...currentProject.stats,
        presetCount: newPresets.length,
      },
    };

    setCurrentProject(updatedProject);
    setIsDirty(true);
  };

  const getLocalPresets = (): Preset[] => currentProject?.state.presets ?? [];

  const saveLocalPreset = (name: string, description: string, icon: string): Preset | null => {
    if (!currentProject) {
      logger.warn('usePresets', 'Cannot save local preset: no active project');
      return null;
    }

    try {
      const newPreset = createPreset(name, description, icon, generationOptions);
      const currentPresets = currentProject.state.presets ?? [];
      updateProjectPresets([...currentPresets, newPreset]);
      logger.info('usePresets', `Saved local preset: ${name}`);
      return newPreset;
    } catch (error) {
      logger.error('usePresets', 'Failed to save local preset', error);
      throw error;
    }
  };

  const deleteLocalPreset = (presetId: string): void => {
    if (!currentProject) return;

    try {
      const currentPresets = currentProject.state.presets ?? [];
      const filtered = currentPresets.filter((p) => p.id !== presetId);
      updateProjectPresets(filtered);
      logger.info('usePresets', `Deleted local preset: ${presetId}`);
    } catch (error) {
      logger.error('usePresets', 'Failed to delete local preset', error);
      throw error;
    }
  };

  const updateLocalPresetSettings = (presetId: string): boolean => {
    if (!currentProject) return false;

    try {
      const currentPresets = currentProject.state.presets ?? [];
      const index = currentPresets.findIndex((p) => p.id === presetId);
      if (index === -1) return false;

      const updatedPresets = [...currentPresets];
      updatedPresets[index] = {
        ...updatedPresets[index],
        settings: { ...generationOptions },
        updatedAt: Date.now(),
      };
      updateProjectPresets(updatedPresets);
      logger.info('usePresets', `Updated local preset settings: ${presetId}`);
      return true;
    } catch (error) {
      logger.error('usePresets', 'Failed to update local preset', error);
      return false;
    }
  };

  const editLocalPreset = (
    presetId: string,
    name: string,
    icon: string,
    description?: string
  ): boolean => {
    if (!currentProject) return false;

    try {
      const currentPresets = currentProject.state.presets ?? [];
      const index = currentPresets.findIndex((p) => p.id === presetId);
      if (index === -1) return false;

      const updatedPresets = [...currentPresets];
      updatedPresets[index] = {
        ...updatedPresets[index],
        name,
        icon,
        ...(description !== undefined && { description }),
        updatedAt: Date.now(),
      };
      updateProjectPresets(updatedPresets);
      return true;
    } catch (error) {
      logger.error('usePresets', 'Failed to edit local preset', error);
      return false;
    }
  };

  const reorderLocalPresets = (fromIndex: number, toIndex: number): boolean => {
    if (!currentProject) return false;

    try {
      const currentPresets = [...(currentProject.state.presets ?? [])];
      if (
        fromIndex < 0 ||
        fromIndex >= currentPresets.length ||
        toIndex < 0 ||
        toIndex >= currentPresets.length
      ) {
        return false;
      }
      const [removed] = currentPresets.splice(fromIndex, 1);
      currentPresets.splice(toIndex, 0, removed);
      updateProjectPresets(currentPresets);
      return true;
    } catch (error) {
      logger.error('usePresets', 'Failed to reorder local presets', error);
      return false;
    }
  };

  // ========================================================================
  // Cross-Tier Operations
  // ========================================================================

  const copyToLocal = (preset: Preset): Preset | null => {
    if (!currentProject) {
      logger.warn('usePresets', 'Cannot copy to local: no active project');
      return null;
    }

    try {
      const copy = duplicatePreset(preset, '');
      const currentPresets = currentProject.state.presets ?? [];
      updateProjectPresets([...currentPresets, copy]);
      logger.info('usePresets', `Copied preset to local: ${copy.name}`);
      return copy;
    } catch (error) {
      logger.error('usePresets', 'Failed to copy preset to local', error);
      throw error;
    }
  };

  const copyToGlobal = (preset: Preset): Preset => {
    try {
      const copy = duplicatePreset(preset, '');
      const presets = loadGlobalPresets();
      presets.push(copy);
      saveGlobalPresets(presets);
      logger.info('usePresets', `Copied preset to global: ${copy.name}`);
      return copy;
    } catch (error) {
      logger.error('usePresets', 'Failed to copy preset to global', error);
      throw error;
    }
  };

  const duplicateGlobalPreset = (preset: Preset): Preset => {
    const copy = duplicatePreset(preset);
    const presets = loadGlobalPresets();
    presets.push(copy);
    saveGlobalPresets(presets);
    return copy;
  };

  const duplicateLocalPreset = (preset: Preset): Preset | null => {
    if (!currentProject) return null;

    const copy = duplicatePreset(preset);
    const currentPresets = currentProject.state.presets ?? [];
    updateProjectPresets([...currentPresets, copy]);
    return copy;
  };

  // ========================================================================
  // Apply & Reset
  // ========================================================================

  const applyPreset = (preset: Preset): void => {
    updateGenerationOptions(preset.settings);
    logger.debug('usePresets', `Applied preset: ${preset.name}`);
  };

  const resetToDefaults = (): void => {
    updateGenerationOptions(getDefaultOptions());
    logger.info('usePresets', 'Reset to default options');
  };

  // ========================================================================
  // Combined View
  // ========================================================================

  const globalPresets = getGlobalPresets();
  const localPresets = getLocalPresets();

  const getAllPresets = (): PresetWithTier[] => {
    const global = getGlobalPresets().map(
      (p): PresetWithTier => ({ ...p, tier: 'global' as const })
    );
    const local = getLocalPresets().map((p): PresetWithTier => ({ ...p, tier: 'local' as const }));
    return [...global, ...local];
  };

  // ========================================================================
  // Export/Import
  // ========================================================================

  const exportPreset = (preset: Preset): void => {
    try {
      const dataStr = JSON.stringify(preset, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${sanitizeFilename(preset.name)}_preset.json`;
      a.click();
      URL.revokeObjectURL(url);
      logger.info('usePresets', `Exported preset: ${preset.name}`);
    } catch (error) {
      logger.error('usePresets', 'Failed to export preset', error);
      throw error;
    }
  };

  const importPreset = async (file: File, tier: PresetTier): Promise<Preset> => {
    try {
      const content = await file.text();
      const imported = JSON.parse(content) as Record<string, unknown>;

      if (!(imported.name && imported.settings)) {
        throw new Error('Invalid preset file: missing required fields');
      }

      const newPreset = createPreset(
        String(imported.name),
        String(imported.description ?? ''),
        String(imported.icon ?? '📥'),
        imported.settings as GenerationOptions
      );

      if (tier === 'global') {
        const presets = loadGlobalPresets();
        presets.push(newPreset);
        saveGlobalPresets(presets);
      } else {
        if (!currentProject) {
          throw new Error('Cannot import to local: no active project');
        }
        const currentPresets = currentProject.state.presets ?? [];
        updateProjectPresets([...currentPresets, newPreset]);
      }

      logger.info('usePresets', `Imported preset: ${newPreset.name} to ${tier}`);
      return newPreset;
    } catch (error) {
      logger.error('usePresets', 'Failed to import preset', error);
      throw error;
    }
  };

  // ========================================================================
  // Return API
  // ========================================================================

  return {
    // Global preset operations
    getGlobalPresets,
    saveGlobalPreset,
    deleteGlobalPreset,
    updateGlobalPresetSettings,
    editGlobalPreset,
    reorderGlobalPresets,
    duplicateGlobalPreset,

    // Local preset operations
    getLocalPresets,
    saveLocalPreset,
    deleteLocalPreset,
    updateLocalPresetSettings,
    editLocalPreset,
    reorderLocalPresets,
    duplicateLocalPreset,

    // Cross-tier operations
    copyToLocal,
    copyToGlobal,

    // Apply & reset
    applyPreset,
    resetToDefaults,

    // Combined view
    getAllPresets,
    globalPresets,
    localPresets,

    // Export/Import
    exportPreset,
    importPreset,

    // Utility
    hasActiveProject: currentProject !== null,
  };
}
