/**
 * Script-related hooks
 *
 * This module provides hooks for managing script data, transformations, and reminders.
 *
 * @module hooks/scripts
 */

// Script data management
export { useScriptData } from './useScriptData.js';

// Script transformations (format, sort, condense)
export {
  useScriptTransformations,
  type FormatIssue,
  type FormatIssuesSummary,
  type ScriptAnalysis,
  type ScriptTransformationHandlers,
  type UseScriptTransformationsOptions,
  type UseScriptTransformationsResult,
} from './useScriptTransformations.js';

// Grouped reminders management
export {
  useGroupedReminders,
  type GroupedReminder,
  type UseGroupedRemindersOptions,
  type UseGroupedRemindersResult,
} from './useGroupedReminders.js';
