/**
 * Auto-Save Hooks Module
 *
 * Barrel export for all auto-save related hooks and their types.
 *
 * @module hooks/autosave
 */

// Core auto-save hooks
export { useAutoSave } from './useAutoSave.js';
export { useAutoSavePreference } from './useAutoSavePreference.js';
export {
  type AutoSaveTelemetry,
  type AutoSaveTelemetryStats,
  computeTelemetryStats,
  type UseAutoSaveTelemetryReturn,
  useAutoSaveTelemetry,
} from './useAutoSaveTelemetry.js';

// Main orchestrator hook
export { useProjectAutoSave, useUnsavedChangesWarning } from './useProjectAutoSave.js';
