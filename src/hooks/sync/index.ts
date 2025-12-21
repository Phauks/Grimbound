/**
 * Sync Hooks Module
 *
 * Hooks for synchronization, storage management, and multi-tab coordination.
 *
 * @module hooks/sync
 */

// ============================================================================
// Tab Synchronization
// ============================================================================

export { useTabSynchronization } from './useTabSynchronization';

// ============================================================================
// Unsaved Work Detection
// ============================================================================

export { useHasUnsavedWork } from './useHasUnsavedWork';

// ============================================================================
// Storage Quota Management
// ============================================================================

export {
  useStorageQuota,
  type StorageQuota,
  type WarningLevel,
  type StorageWarningInfo,
  type UseStorageQuotaOptions,
} from './useStorageQuota';

