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
  type StorageQuota,
  type StorageWarningInfo,
  type UseStorageQuotaOptions,
  useStorageQuota,
  type WarningLevel,
} from './useStorageQuota';

// ============================================================================
// Official Character Images
// ============================================================================

export { useOfficialCharacterImages } from './useOfficialCharacterImages';

// ============================================================================
// Image URL Resolution
// ============================================================================

export { useResolvedImageUrls } from './useResolvedImageUrls';
