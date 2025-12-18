/**
 * Studio Navigation Helpers
 *
 * Utilities for navigating to Studio from other parts of the app
 */

import type { EditorTab } from '@/components/Layout/TabNavigation';

/**
 * Edit mode for Studio
 * - 'full': Full editing capabilities (all layers editable)
 * - 'icon-only': Only the icon layer is editable (text, background, etc. are locked)
 */
export type StudioEditMode = 'full' | 'icon-only';

/**
 * Pending Studio operation
 * Stored globally to be picked up when Studio tab loads
 */
interface PendingStudioOperation {
  type: 'loadFromUrl' | 'loadFromBlob' | 'loadFromAsset';
  data: string | Blob;
  editMode?: StudioEditMode;
  metadata?: {
    characterId?: string;
    characterName?: string;
    source?: string;
  };
}

let pendingOperation: PendingStudioOperation | null = null;

/**
 * Navigate to Studio and load an image from a URL
 *
 * @param url - Image URL to load
 * @param onTabChange - Tab change callback from current view
 * @param metadata - Optional metadata about the source
 * @param editMode - Edit mode for Studio ('full' or 'icon-only')
 */
export function navigateToStudioWithUrl(
  url: string,
  onTabChange: (tab: EditorTab) => void,
  metadata?: { characterId?: string; characterName?: string; source?: string },
  editMode: StudioEditMode = 'full'
): void {
  // Store pending operation
  pendingOperation = {
    type: 'loadFromUrl',
    data: url,
    editMode,
    metadata,
  };

  // Navigate to Studio tab
  onTabChange('studio');
}

/**
 * Navigate to Studio and load an image from a Blob
 *
 * @param blob - Image blob to load
 * @param onTabChange - Tab change callback from current view
 * @param metadata - Optional metadata about the source
 * @param editMode - Edit mode for Studio ('full' or 'icon-only')
 */
export function navigateToStudioWithBlob(
  blob: Blob,
  onTabChange: (tab: EditorTab) => void,
  metadata?: { characterId?: string; characterName?: string; source?: string },
  editMode: StudioEditMode = 'full'
): void {
  // Store pending operation
  pendingOperation = {
    type: 'loadFromBlob',
    data: blob,
    editMode,
    metadata,
  };

  // Navigate to Studio tab
  onTabChange('studio');
}

/**
 * Navigate to Studio and load an asset by ID
 *
 * @param assetId - Asset ID to load
 * @param onTabChange - Tab change callback from current view
 * @param metadata - Optional metadata about the source
 * @param editMode - Edit mode for Studio ('full' or 'icon-only')
 */
export function navigateToStudioWithAsset(
  assetId: string,
  onTabChange: (tab: EditorTab) => void,
  metadata?: { characterId?: string; characterName?: string; source?: string },
  editMode: StudioEditMode = 'full'
): void {
  // Store pending operation
  pendingOperation = {
    type: 'loadFromAsset',
    data: assetId,
    editMode,
    metadata,
  };

  // Navigate to Studio tab
  onTabChange('studio');
}

/**
 * Get and clear pending Studio operation
 * Should be called by StudioView when it mounts/becomes active
 *
 * @returns Pending operation if any
 */
export function consumePendingStudioOperation(): PendingStudioOperation | null {
  const operation = pendingOperation;
  pendingOperation = null;
  return operation;
}

/**
 * Check if there's a pending Studio operation
 *
 * @returns True if there's a pending operation
 */
export function hasPendingStudioOperation(): boolean {
  return pendingOperation !== null;
}

/**
 * Clear pending Studio operation without consuming it
 */
export function clearPendingStudioOperation(): void {
  pendingOperation = null;
}
