/**
 * Storage Quota Monitoring Hook
 *
 * Monitors IndexedDB storage quota and warns users when approaching limits.
 * Provides cleanup functionality for orphaned assets.
 *
 * @module hooks/sync/useStorageQuota
 */

import { useCallback, useEffect, useState } from 'react';
import { useAssetStorageService } from '@/contexts/ServiceContext';
import { logger } from '@/ts/utils/logger.js';

// ============================================================================
// Types
// ============================================================================

export interface StorageQuota {
  /** Current usage in bytes */
  usage: number;
  /** Total quota in bytes */
  quota: number;
  /** Usage percentage (0-100) */
  percentage: number;
  /** Usage in MB */
  usageMB: number;
  /** Quota in MB */
  quotaMB: number;
}

export type WarningLevel = 'none' | 'warning' | 'critical';

export interface StorageWarningInfo {
  /** Warning level based on usage */
  level: WarningLevel;
  /** User-friendly warning message */
  message: string;
  /** Suggested actions */
  suggestions: string[];
  /** Quota information */
  quota: StorageQuota | null;
}

// ============================================================================
// Hook Options
// ============================================================================

export interface UseStorageQuotaOptions {
  /** Check interval in milliseconds (default: 5 minutes) */
  checkInterval?: number;
  /** Warning threshold percentage (default: 80) */
  warningThreshold?: number;
  /** Critical threshold percentage (default: 90) */
  criticalThreshold?: number;
  /** Enable automatic checking (default: true) */
  enabled?: boolean;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for monitoring IndexedDB storage quota and providing cleanup utilities.
 *
 * @param options - Configuration options
 * @returns Storage quota state and cleanup functions
 *
 * @example
 * ```tsx
 * function App() {
 *   const { warning, cleanup, checkQuota } = useStorageQuota()
 *
 *   if (warning.level === 'critical') {
 *     return <StorageWarning warning={warning} onCleanup={cleanup} />
 *   }
 * }
 * ```
 */
export function useStorageQuota(options: UseStorageQuotaOptions = {}) {
  // Get service from DI context
  const assetStorageService = useAssetStorageService();

  const {
    checkInterval = 5 * 60 * 1000, // 5 minutes
    warningThreshold = 80,
    criticalThreshold = 90,
    enabled = true,
  } = options;

  const [quota, setQuota] = useState<StorageQuota | null>(null);
  const [warning, setWarning] = useState<StorageWarningInfo>({
    level: 'none',
    message: '',
    suggestions: [],
    quota: null,
  });
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<number | null>(null);

  /**
   * Check current storage quota using StorageManager API
   */
  const checkQuota = useCallback(async (): Promise<StorageQuota | null> => {
    setIsChecking(true);

    try {
      // Check if StorageManager API is available
      if (!navigator.storage?.estimate) {
        logger.warn('useStorageQuota', 'StorageManager API not available');
        setIsChecking(false);
        return null;
      }

      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage ?? 0;
      const quota = estimate.quota ?? 0;
      const percentage = quota > 0 ? (usage / quota) * 100 : 0;

      const quotaInfo: StorageQuota = {
        usage,
        quota,
        percentage,
        usageMB: Math.round((usage / 1024 / 1024) * 100) / 100,
        quotaMB: Math.round((quota / 1024 / 1024) * 100) / 100,
      };

      setQuota(quotaInfo);
      setLastCheckTime(Date.now());

      // Determine warning level and generate message
      const warningInfo = generateWarning(quotaInfo, warningThreshold, criticalThreshold);
      setWarning(warningInfo);

      setIsChecking(false);
      return quotaInfo;
    } catch (error) {
      logger.error('useStorageQuota', 'Failed to check quota:', error);
      setIsChecking(false);
      return null;
    }
  }, [warningThreshold, criticalThreshold]);

  /**
   * Clean up orphaned assets (assets not linked to any project)
   */
  const cleanupOrphaned = useCallback(async (): Promise<number> => {
    try {
      // Get all assets
      const allAssets = await assetStorageService.list({});

      // Find orphaned assets (not linked to any characters)
      const orphanedAssets = allAssets.filter(
        (asset) => !asset.linkedTo || asset.linkedTo.length === 0
      );

      if (orphanedAssets.length === 0) {
        logger.debug('useStorageQuota', 'No orphaned assets found');
        return 0;
      }

      // Delete orphaned assets
      let deletedCount = 0;
      for (const asset of orphanedAssets) {
        try {
          await assetStorageService.delete(asset.id);
          deletedCount++;
        } catch (error) {
          logger.error('useStorageQuota', `Failed to delete asset ${asset.id}:`, error);
        }
      }

      logger.info('useStorageQuota', `Cleaned up ${deletedCount} orphaned assets`);

      // Re-check quota after cleanup
      await checkQuota();

      return deletedCount;
    } catch (error) {
      logger.error('useStorageQuota', 'Cleanup failed:', error);
      return 0;
    }
  }, [assetStorageService, checkQuota]);

  /**
   * Clean up old cached assets (LRU eviction)
   */
  const cleanupOldAssets = useCallback(
    async (maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<number> => {
      try {
        const now = Date.now();
        const allAssets = await assetStorageService.list({});

        // Find assets older than maxAge
        const oldAssets = allAssets.filter((asset) => {
          const age = now - (asset.metadata.uploadedAt ?? 0);
          return age > maxAge;
        });

        if (oldAssets.length === 0) {
          logger.debug('useStorageQuota', 'No old assets found');
          return 0;
        }

        // Sort by age (oldest first) and delete
        oldAssets.sort((a, b) => (a.metadata.uploadedAt ?? 0) - (b.metadata.uploadedAt ?? 0));

        let deletedCount = 0;
        for (const asset of oldAssets) {
          try {
            await assetStorageService.delete(asset.id);
            deletedCount++;
          } catch (error) {
            logger.error('useStorageQuota', `Failed to delete asset ${asset.id}:`, error);
          }
        }

        logger.info('useStorageQuota', `Cleaned up ${deletedCount} old assets`);

        // Re-check quota after cleanup
        await checkQuota();

        return deletedCount;
      } catch (error) {
        logger.error('useStorageQuota', 'Cleanup failed:', error);
        return 0;
      }
    },
    [assetStorageService, checkQuota]
  );

  /**
   * Combined cleanup function (orphaned + old assets)
   */
  const cleanup = useCallback(async (): Promise<{ orphaned: number; old: number }> => {
    const orphaned = await cleanupOrphaned();
    const old = await cleanupOldAssets();
    return { orphaned, old };
  }, [cleanupOrphaned, cleanupOldAssets]);

  // Initial check and periodic updates
  useEffect(() => {
    if (!enabled) return;

    // Check immediately on mount
    checkQuota();

    // Set up periodic checking
    const intervalId = setInterval(() => {
      checkQuota();
    }, checkInterval);

    return () => {
      clearInterval(intervalId);
    };
  }, [enabled, checkInterval, checkQuota]);

  return {
    /** Current quota information */
    quota,
    /** Warning information (level, message, suggestions) */
    warning,
    /** Whether quota check is in progress */
    isChecking,
    /** Last check timestamp */
    lastCheckTime,
    /** Manually trigger quota check */
    checkQuota,
    /** Clean up orphaned assets */
    cleanupOrphaned,
    /** Clean up old assets */
    cleanupOldAssets,
    /** Combined cleanup (orphaned + old) */
    cleanup,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate warning information based on quota usage
 */
function generateWarning(
  quota: StorageQuota,
  warningThreshold: number,
  criticalThreshold: number
): StorageWarningInfo {
  const { percentage, usageMB, quotaMB } = quota;

  if (percentage >= criticalThreshold) {
    return {
      level: 'critical',
      message: `Storage critically low: ${usageMB} MB of ${quotaMB} MB used (${Math.round(percentage)}%)`,
      suggestions: [
        'Clean up orphaned assets immediately',
        'Delete unused projects',
        'Remove old custom images',
        'Consider exporting projects and clearing local storage',
      ],
      quota,
    };
  }

  if (percentage >= warningThreshold) {
    return {
      level: 'warning',
      message: `Storage running low: ${usageMB} MB of ${quotaMB} MB used (${Math.round(percentage)}%)`,
      suggestions: [
        'Clean up orphaned assets',
        'Review and delete unused custom images',
        'Export old projects to free up space',
      ],
      quota,
    };
  }

  return {
    level: 'none',
    message: '',
    suggestions: [],
    quota,
  };
}
