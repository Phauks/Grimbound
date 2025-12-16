/**
 * Studio Module
 *
 * Barrel export for all Studio-related utilities
 */

// Asset integration (connects Studio to global asset storage)
export * from './assetIntegration.js';
// Background removal
export * from './backgroundRemoval.js';
// Canvas operations
export * from './canvasOperations.js';
export { createStudioCanvas, getCanvasPoolStats, releaseStudioCanvas } from './canvasOperations.js';
// Canvas overlay (grid, guides, rulers)
export * from './canvasOverlay.js';
// Character presets
export * from './characterPresets.js';
// Drawing engine
export * from './drawingEngine.js';
// Filter engine
export * from './filterEngine.js';
// History manager (undo/redo system)
export * from './historyManager.js';
// Layer manager
export * from './layerManager.js';
// Logo templates (script logo generation)
export * from './logoTemplates.js';
// Memory manager (memory monitoring and cleanup)
export * from './memoryManager.js';
// Navigation helpers (cross-tab navigation to Studio)
export * from './navigationHelpers.js';
// Studio presets
export * from './studioPresets.js';
