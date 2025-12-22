/**
 * useAssetSelection Hook
 *
 * Manages asset selection state for selection mode in the Asset Manager.
 * Handles user assets, built-in assets, and "none" option selection.
 *
 * @module hooks/assets/useAssetSelection
 */

import { useCallback, useMemo, useState } from 'react';
import { getBuiltInAssets } from '@/ts/constants/builtInAssets.js';
import { createAssetReference } from '@/ts/services/upload/assetResolver.js';
import type { AssetType } from '@/ts/services/upload/index.js';

// ============================================================================
// Types
// ============================================================================

export interface BuiltInAsset {
  id: string;
  label: string;
  src: string;
}

export interface UseAssetSelectionOptions {
  /** Whether the modal is in selection mode */
  selectionMode: boolean;
  /** Include built-in assets in selection mode */
  includeBuiltIn: boolean;
  /** Show a "None" option in selection mode */
  showNoneOption: boolean;
  /** Label for the None option */
  noneLabel?: string;
  /** Active tab for filtering built-in assets */
  activeTab: AssetType | 'all';
  /** Initial asset type filter (for determining which built-ins to show) */
  initialAssetType?: AssetType;
  /** Callback when an asset is selected and applied */
  onSelectAsset?: (assetId: string) => void;
  /** Callback to close the modal */
  onClose: () => void;
}

export interface UseAssetSelectionReturn {
  /** Currently selected asset ID (null, 'none', 'builtin:*', or user asset ID) */
  selectedAssetId: string | null;
  /** Set the selected asset ID */
  setSelectedAssetId: (id: string | null) => void;
  /** Toggle selection for an asset */
  toggleAssetSelection: (id: string) => void;
  /** Built-in assets available for selection */
  builtInAssets: BuiltInAsset[];
  /** Handle the Apply button click */
  handleApply: () => void;
  /** Check if the apply button should be disabled */
  isApplyDisabled: boolean;
  /** Label for the None option */
  noneLabel: string;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook for managing asset selection in selection mode
 */
export function useAssetSelection(options: UseAssetSelectionOptions): UseAssetSelectionReturn {
  const {
    selectionMode,
    includeBuiltIn,
    showNoneOption: _showNoneOption,
    noneLabel = 'None',
    activeTab,
    initialAssetType,
    onSelectAsset,
    onClose,
  } = options;

  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  // Get built-in assets for the current filter type
  const builtInAssets = useMemo(() => {
    if (!(selectionMode && includeBuiltIn)) return [];
    const filterType = activeTab === 'all' ? initialAssetType : activeTab;
    if (!filterType) return [];
    return getBuiltInAssets(filterType);
  }, [selectionMode, includeBuiltIn, activeTab, initialAssetType]);

  // Toggle selection for an asset
  const toggleAssetSelection = useCallback((id: string) => {
    setSelectedAssetId((prev) => (prev === id ? null : id));
  }, []);

  // Handle apply button click (selection mode)
  const handleApply = useCallback(() => {
    if (onSelectAsset) {
      if (selectedAssetId === 'none') {
        // "None" was selected
        onSelectAsset('none');
      } else if (selectedAssetId?.startsWith('builtin:')) {
        // Built-in asset - return just the ID without prefix
        onSelectAsset(selectedAssetId.replace('builtin:', ''));
      } else if (selectedAssetId) {
        // User asset - return as asset reference
        onSelectAsset(createAssetReference(selectedAssetId));
      }
      onClose();
    }
  }, [selectedAssetId, onSelectAsset, onClose]);

  const isApplyDisabled = !selectedAssetId;

  return {
    selectedAssetId,
    setSelectedAssetId,
    toggleAssetSelection,
    builtInAssets,
    handleApply,
    isApplyDisabled,
    noneLabel,
  };
}

export default useAssetSelection;
