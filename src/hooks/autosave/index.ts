/**
 * Auto-Save Hooks Module
 *
 * Barrel export for all auto-save related hooks and their types.
 *
 * @module hooks/autosave
 */

// Component hooks
export { useAutoSaveDetector } from './useAutoSaveDetector.js';
export { useAutoSavePreference } from './useAutoSavePreference.js';
export {
  type AutoSaveTelemetry,
  type AutoSaveTelemetryStats,
  computeTelemetryStats,
  type UseAutoSaveTelemetryReturn,
  useAutoSaveTelemetry,
} from './useAutoSaveTelemetry.js';
export { useAutoSaveTrigger } from './useAutoSaveTrigger.js';
// Main orchestrator hook
export { useProjectAutoSave, useUnsavedChangesWarning } from './useProjectAutoSave.js';
