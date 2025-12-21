/**
 * Auto-Save Hooks Module
 *
 * Barrel export for all auto-save related hooks and their types.
 *
 * @module hooks/autosave
 */

// Main orchestrator hook
export { useProjectAutoSave, useUnsavedChangesWarning } from './useProjectAutoSave.js';

// Component hooks
export { useAutoSaveDetector } from './useAutoSaveDetector.js';
export { useAutoSaveTrigger } from './useAutoSaveTrigger.js';
export { useAutoSavePreference } from './useAutoSavePreference.js';
export {
  useAutoSaveTelemetry,
  computeTelemetryStats,
  type AutoSaveTelemetry,
  type AutoSaveTelemetryStats,
  type UseAutoSaveTelemetryReturn,
} from './useAutoSaveTelemetry.js';
