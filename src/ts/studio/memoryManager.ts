/**
 * Memory Manager
 *
 * Monitors and manages memory usage in Studio to prevent performance degradation.
 * Provides utilities for estimating memory consumption and triggering cleanup.
 */

import { studioCanvasPool } from '../canvas/canvasPool.js';
import type { Layer } from '../types/index.js';
import { logger } from '../utils/logger.js';

// ============================================================================
// Types
// ============================================================================

export interface MemoryStats {
  /** Estimated total memory usage in MB */
  totalMB: number;
  /** Estimated layer canvas memory in MB */
  layersMB: number;
  /** Estimated history memory in MB */
  historyMB: number;
  /** Canvas pool statistics */
  poolStats: {
    available: number;
    inUse: number;
    total: number;
  };
  /** Whether memory usage exceeds recommended limits */
  isWarning: boolean;
  /** Whether memory usage is critical */
  isCritical: boolean;
}

export interface MemoryConfig {
  /** Maximum recommended memory usage in MB */
  maxMemoryMB: number;
  /** Warning threshold as percentage of max (default: 0.8) */
  warningThreshold: number;
  /** Critical threshold as percentage of max (default: 0.95) */
  criticalThreshold: number;
  /** Enable debug logging */
  debug: boolean;
}

// ============================================================================
// MemoryManager
// ============================================================================

/**
 * Manages memory usage and provides cleanup utilities
 */
export class MemoryManager {
  private config: MemoryConfig;

  constructor(config: Partial<MemoryConfig> = {}) {
    this.config = {
      maxMemoryMB: config.maxMemoryMB ?? 200,
      warningThreshold: config.warningThreshold ?? 0.8,
      criticalThreshold: config.criticalThreshold ?? 0.95,
      debug: config.debug ?? false,
    };
  }

  // ==========================================================================
  // Memory Estimation
  // ==========================================================================

  /**
   * Estimate memory usage of layers
   *
   * @param layers - Array of layers to analyze
   * @returns Estimated memory in MB
   */
  estimateLayerMemory(layers: Layer[]): number {
    let totalBytes = 0;

    for (const layer of layers) {
      // Each pixel in RGBA format = 4 bytes
      const canvasBytes = layer.canvas.width * layer.canvas.height * 4;

      // Add overhead for layer metadata (~1KB per layer)
      const metadataBytes = 1024;

      totalBytes += canvasBytes + metadataBytes;
    }

    return totalBytes / (1024 * 1024); // Convert to MB
  }

  /**
   * Estimate memory usage of history entries
   * Note: This is a rough estimate based on typical compression ratios
   *
   * @param historyCount - Number of history entries
   * @param avgCanvasSize - Average canvas dimensions
   * @returns Estimated memory in MB
   */
  estimateHistoryMemory(
    historyCount: number,
    avgCanvasSize: { width: number; height: number }
  ): number {
    if (historyCount === 0) return 0;

    // Compressed PNG/JPEG is roughly 10-20% of raw size
    const compressionRatio = 0.15;
    const avgPixels = avgCanvasSize.width * avgCanvasSize.height;
    const avgRawBytes = avgPixels * 4; // RGBA
    const avgCompressedBytes = avgRawBytes * compressionRatio;

    const totalBytes = avgCompressedBytes * historyCount;
    return totalBytes / (1024 * 1024); // Convert to MB
  }

  /**
   * Get comprehensive memory statistics
   *
   * @param layers - Current layers
   * @param historyCount - Number of history entries
   * @param canvasSize - Current canvas size
   * @returns Memory statistics
   */
  getStats(
    layers: Layer[],
    historyCount: number,
    canvasSize: { width: number; height: number }
  ): MemoryStats {
    const layersMB = this.estimateLayerMemory(layers);
    const historyMB = this.estimateHistoryMemory(historyCount, canvasSize);
    const totalMB = layersMB + historyMB;

    const warningLimit = this.config.maxMemoryMB * this.config.warningThreshold;
    const criticalLimit = this.config.maxMemoryMB * this.config.criticalThreshold;

    const stats: MemoryStats = {
      totalMB: Math.round(totalMB * 100) / 100,
      layersMB: Math.round(layersMB * 100) / 100,
      historyMB: Math.round(historyMB * 100) / 100,
      poolStats: studioCanvasPool.getStats(),
      isWarning: totalMB > warningLimit,
      isCritical: totalMB > criticalLimit,
    };

    if (this.config.debug) {
      logger.debug('MemoryManager', 'Stats:', stats);
    }

    return stats;
  }

  /**
   * Check if memory usage is within acceptable limits
   *
   * @param layers - Current layers
   * @param historyCount - Number of history entries
   * @param canvasSize - Current canvas size
   * @returns True if memory usage is safe
   */
  checkMemoryLimit(
    layers: Layer[],
    historyCount: number,
    canvasSize: { width: number; height: number }
  ): boolean {
    const stats = this.getStats(layers, historyCount, canvasSize);
    return !stats.isCritical;
  }

  // ==========================================================================
  // Cleanup Utilities
  // ==========================================================================

  /**
   * Trigger browser garbage collection hints
   * Note: This doesn't force GC, but encourages it
   */
  triggerGarbageCollection(): void {
    if (this.config.debug) {
      logger.debug('MemoryManager', 'Triggering GC hints');
    }

    // Revoke any object URLs that might be lingering
    // (This is just a hint, actual cleanup happens in specific modules)

    // Clear any temporary references
    // Force a microtask to allow GC to run
    Promise.resolve().then(() => {
      if (this.config.debug) {
        logger.debug('MemoryManager', 'GC hints completed');
      }
    });
  }

  /**
   * Clear canvas pool to free memory
   */
  clearCanvasPool(): void {
    if (this.config.debug) {
      logger.debug('MemoryManager', 'Clearing canvas pool');
    }

    studioCanvasPool.clear();
  }

  /**
   * Perform comprehensive cleanup
   * Call this when closing Studio or switching projects
   *
   * @param options - Cleanup options
   */
  cleanup(options: { clearPool?: boolean; triggerGC?: boolean } = {}): void {
    const { clearPool = true, triggerGC = true } = options;

    if (this.config.debug) {
      logger.debug('MemoryManager', 'Starting cleanup', options);
    }

    if (clearPool) {
      this.clearCanvasPool();
    }

    if (triggerGC) {
      this.triggerGarbageCollection();
    }

    if (this.config.debug) {
      logger.debug('MemoryManager', 'Cleanup complete');
    }
  }

  // ==========================================================================
  // Recommendations
  // ==========================================================================

  /**
   * Get memory optimization recommendations
   *
   * @param stats - Current memory statistics
   * @returns Array of recommendation strings
   */
  getRecommendations(stats: MemoryStats): string[] {
    const recommendations: string[] = [];

    if (stats.isCritical) {
      recommendations.push(
        'Memory usage is critical. Consider clearing history or merging layers.'
      );
    } else if (stats.isWarning) {
      recommendations.push('Memory usage is high. Consider optimizing your workflow.');
    }

    if (stats.layersMB > 100) {
      recommendations.push('Layer memory usage is high. Consider merging or flattening layers.');
    }

    if (stats.historyMB > 50) {
      recommendations.push('History memory usage is high. Consider clearing undo history.');
    }

    if (stats.poolStats.available > 10) {
      recommendations.push(
        'Canvas pool has many unused canvases. They will be released automatically.'
      );
    }

    return recommendations;
  }

  /**
   * Format memory stats for display
   *
   * @param stats - Memory statistics
   * @returns Formatted string
   */
  formatStats(stats: MemoryStats): string {
    const lines = [
      `Total Memory: ${stats.totalMB.toFixed(2)} MB / ${this.config.maxMemoryMB} MB`,
      `  Layers: ${stats.layersMB.toFixed(2)} MB`,
      `  History: ${stats.historyMB.toFixed(2)} MB`,
      `Canvas Pool: ${stats.poolStats.inUse} in use, ${stats.poolStats.available} available`,
    ];

    if (stats.isWarning) {
      lines.push(
        `⚠️  Memory usage: ${((stats.totalMB / this.config.maxMemoryMB) * 100).toFixed(1)}%`
      );
    }

    return lines.join('\n');
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Global memory manager instance
 * Can be used directly or create custom instances with different config
 */
export const memoryManager = new MemoryManager();
