/**
 * Studio Module
 *
 * Simplified barrel export for Studio utilities.
 * Exports icon processing, character presets, and basic canvas operations.
 */

export type { CharacterPreset } from '@/ts/types/index.js';
// Canvas operations (basic utilities)
export {
  canvasToDataURL,
  clearCanvas,
  cloneCanvas,
  createBlankCanvas,
  createStudioCanvas,
  fillCanvas,
  getCanvasPoolStats,
  getImageData,
  loadImageFromUrl,
  loadImageToCanvas,
  pasteFromClipboard,
  putImageData,
  releaseStudioCanvas,
  resizeCanvas,
} from './canvasOperations.js';
// Legacy character presets (for backwards compatibility)
export {
  applyCharacterPreset,
  CHARACTER_PRESETS,
  getPresetById,
  getPresetByName,
} from './characterPresets.js';
export type { BorderOptions } from './iconBorderRenderer.js';
// Icon border rendering
export {
  addCircularBorder,
  addIconBorder,
  DEFAULT_BORDER_OPTIONS,
  shrinkIconContent,
} from './iconBorderRenderer.js';
export type {
  ColorReplacementOptions,
  SplitColorConfig,
  TeamColorPreset,
} from './iconColorReplacer.js';
// Icon color replacement (HSL-based selective recoloring)
export {
  applyTeamColorPreset,
  DEFAULT_COLOR_OPTIONS,
  detectOptimalThreshold,
  getTeamPresetById,
  hueToPreviewColor,
  replaceIconColor,
  replaceIconColorSplit,
  replaceIconColorWithHex,
  TEAM_COLOR_PRESETS,
} from './iconColorReplacer.js';
export type { StudioEditMode } from './navigationHelpers.js';
// Navigation helpers (for "Edit in Studio" functionality)
export {
  clearPendingStudioOperation,
  consumePendingStudioOperation,
  hasPendingStudioOperation,
  navigateToStudioWithAsset,
  navigateToStudioWithBlob,
  navigateToStudioWithUrl,
} from './navigationHelpers.js';
