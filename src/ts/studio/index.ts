/**
 * Studio Module
 *
 * Simplified barrel export for Studio utilities.
 * Exports icon processing, character presets, and basic canvas operations.
 */

// Icon color replacement (HSL-based selective recoloring)
export {
  replaceIconColor,
  replaceIconColorWithHex,
  replaceIconColorSplit,
  applyTeamColorPreset,
  detectOptimalThreshold,
  getTeamPresetById,
  hueToPreviewColor,
  TEAM_COLOR_PRESETS,
  DEFAULT_COLOR_OPTIONS,
} from './iconColorReplacer.js';
export type {
  ColorReplacementOptions,
  TeamColorPreset,
  SplitColorConfig,
} from './iconColorReplacer.js';

// Icon border rendering
export {
  addIconBorder,
  addCircularBorder,
  shrinkIconContent,
  DEFAULT_BORDER_OPTIONS,
} from './iconBorderRenderer.js';
export type { BorderOptions } from './iconBorderRenderer.js';

// Legacy character presets (for backwards compatibility)
export {
  CHARACTER_PRESETS,
  applyCharacterPreset,
  getPresetById,
  getPresetByName,
} from './characterPresets.js';
export type { CharacterPreset } from '@/ts/types/index.js';

// Canvas operations (basic utilities)
export {
  createStudioCanvas,
  releaseStudioCanvas,
  getCanvasPoolStats,
  loadImageToCanvas,
  loadImageFromUrl,
  pasteFromClipboard,
  createBlankCanvas,
  cloneCanvas,
  resizeCanvas,
  getImageData,
  putImageData,
  clearCanvas,
  fillCanvas,
  canvasToDataURL,
} from './canvasOperations.js';

// Navigation helpers (for "Edit in Studio" functionality)
export {
  navigateToStudioWithUrl,
  navigateToStudioWithBlob,
  navigateToStudioWithAsset,
  consumePendingStudioOperation,
  hasPendingStudioOperation,
  clearPendingStudioOperation,
} from './navigationHelpers.js';
export type { StudioEditMode } from './navigationHelpers.js';
