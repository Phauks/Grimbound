/**
 * Cache Logger - Structured logging with configurable log levels and performance timing.
 * Enables debugging cache behavior and measuring performance improvements.
 */

import { STORAGE_KEYS } from '@/ts/utils/storageKeys.js';

/**
 * Log levels for cache operations.
 * Higher levels include all lower levels.
 */
export enum CacheLogLevel {
  NONE = 0, // No logging
  ERROR = 1, // Only errors
  WARN = 2, // Warnings + errors
  INFO = 3, // Info + warnings + errors
  DEBUG = 4, // Debug + info + warnings + errors
  TRACE = 5, // Everything including trace
}

/**
 * Performance metrics for cache operations.
 */
export interface CachePerformanceMetrics {
  operation: string;
  duration: number; // milliseconds
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/**
 * Aggregated cache metrics for analysis
 */
export interface CacheMetrics {
  operation: string;
  hitCount: number;
  missCount: number;
  totalCount: number;
  hitRate: number;
  avgDuration: number;
  p50Duration: number;
  p95Duration: number;
  p99Duration: number;
  minDuration: number;
  maxDuration: number;
  durations: number[];
}

/**
 * Cache recommendation based on analysis
 */
export interface CacheRecommendation {
  severity: 'info' | 'warning' | 'critical';
  category: 'hit-rate' | 'performance' | 'memory' | 'eviction';
  message: string;
  details?: string;
  suggestedAction?: string;
}

/**
 * CacheLogger - Static utility class for structured cache logging.
 *
 * Features:
 * - Configurable log levels (NONE to TRACE)
 * - Performance timing with Performance API integration
 * - Structured metadata support
 * - DevTools integration via window.__CACHE_DEBUG__
 * - localStorage persistence for log level preference
 */
/**
 * Cache access tracking for hit/miss analysis
 */
interface CacheAccessTracker {
  hits: number;
  misses: number;
  durations: number[];
}

export namespace CacheLogger {
  let level: CacheLogLevel = CacheLogLevel.WARN;
  let performanceMetrics: CachePerformanceMetrics[] = [];
  const maxMetricsHistory = 100; // Keep last 100 measurements
  const accessTrackers = new Map<string, CacheAccessTracker>(); // Track hits/misses per operation

  /**
   * Initialize logger with persisted log level from localStorage.
   */
  export function initialize(): void {
    // Check localStorage for persisted log level
    const storedLevel = localStorage.getItem(STORAGE_KEYS.CACHE_LOG_LEVEL);
    if (storedLevel && storedLevel in CacheLogLevel) {
      level = CacheLogLevel[storedLevel as keyof typeof CacheLogLevel];
    }

    // Check for debug flag
    if (
      typeof window !== 'undefined' &&
      (window as unknown as { __CACHE_DEBUG__?: boolean }).__CACHE_DEBUG__
    ) {
      level = CacheLogLevel.DEBUG;
    }

    info('CacheLogger initialized', { level: CacheLogLevel[level] });
  }

  /**
   * Set log level programmatically.
   * @param newLevel - New log level
   */
  export function setLevel(newLevel: CacheLogLevel): void {
    level = newLevel;
    // Persist to localStorage
    localStorage.setItem(STORAGE_KEYS.CACHE_LOG_LEVEL, CacheLogLevel[newLevel]);
    console.info(`[Cache:INFO] Log level set to ${CacheLogLevel[newLevel]}`);
  }

  /**
   * Get current log level.
   * @returns Current log level
   */
  export function getLevel(): CacheLogLevel {
    return level;
  }

  /**
   * Check if level is enabled.
   * @param checkLevel - Level to check
   * @returns True if level is enabled
   */
  export function isLevelEnabled(checkLevel: CacheLogLevel): boolean {
    return level >= checkLevel;
  }

  /**
   * Log trace message (most verbose).
   * @param message - Message to log
   * @param data - Optional structured data
   */
  export function trace(message: string, data?: Record<string, unknown>): void {
    if (level >= CacheLogLevel.TRACE) {
      console.log(`[Cache:TRACE] ${message}`, data !== undefined ? data : '');
    }
  }

  /**
   * Log debug message.
   * @param message - Message to log
   * @param data - Optional structured data
   */
  export function debug(message: string, data?: Record<string, unknown>): void {
    if (level >= CacheLogLevel.DEBUG) {
      console.log(`[Cache:DEBUG] ${message}`, data !== undefined ? data : '');
    }
  }

  /**
   * Log info message.
   * @param message - Message to log
   * @param data - Optional structured data
   */
  export function info(message: string, data?: Record<string, unknown>): void {
    if (level >= CacheLogLevel.INFO) {
      console.info(`[Cache:INFO] ${message}`, data !== undefined ? data : '');
    }
  }

  /**
   * Log warning message.
   * @param message - Message to log
   * @param data - Optional structured data
   */
  export function warn(message: string, data?: Record<string, unknown>): void {
    if (level >= CacheLogLevel.WARN) {
      console.warn(`[Cache:WARN] ${message}`, data !== undefined ? data : '');
    }
  }

  /**
   * Log error message.
   * @param message - Message to log
   * @param error - Optional error object or data
   */
  export function error(message: string, error?: unknown): void {
    if (level >= CacheLogLevel.ERROR) {
      console.error(`[Cache:ERROR] ${message}`, error !== undefined ? error : '');
    }
  }

  /**
   * Start performance timing for an operation.
   * Uses Performance API marks.
   *
   * @param label - Unique label for this operation
   */
  export function startTiming(label: string): void {
    if (typeof performance !== 'undefined') {
      performance.mark(`cache:${label}:start`);
      trace(`Started timing: ${label}`);
    }
  }

  /**
   * End performance timing for an operation.
   * Calculates duration and logs if debug enabled.
   *
   * @param label - Label matching startTiming call
   * @param metadata - Optional metadata to include with metrics
   * @returns Duration in milliseconds, or null if timing failed
   */
  export function endTiming(label: string, metadata?: Record<string, unknown>): number | null {
    if (typeof performance === 'undefined') {
      return null;
    }

    const startMark = `cache:${label}:start`;
    const endMark = `cache:${label}:end`;

    try {
      performance.mark(endMark);
      performance.measure(`cache:${label}`, startMark, endMark);

      const measures = performance.getEntriesByName(`cache:${label}`, 'measure');
      if (measures.length > 0) {
        const measure = measures[measures.length - 1] as PerformanceMeasure;
        const duration = measure.duration;

        // Store metrics
        recordMetrics({
          operation: label,
          duration,
          timestamp: Date.now(),
          metadata,
        });

        // Log if debug enabled
        debug(`${label} completed`, {
          duration: `${duration.toFixed(2)}ms`,
          ...(metadata ?? {}),
        });

        // Clean up marks and measures
        performance.clearMarks(startMark);
        performance.clearMarks(endMark);
        performance.clearMeasures(`cache:${label}`);

        return duration;
      }
    } catch (error) {
      // Marks don't exist, silently fail
      trace(`Timing failed for: ${label}`, error as Record<string, unknown>);
    }

    return null;
  }

  /**
   * Record performance metrics.
   * Maintains circular buffer of recent measurements.
   *
   * @param metrics - Performance metrics to record
   */
  function recordMetrics(metrics: CachePerformanceMetrics): void {
    performanceMetrics.push(metrics);

    // Keep only last N metrics
    if (performanceMetrics.length > maxMetricsHistory) {
      performanceMetrics.shift();
    }
  }

  /**
   * Get all recorded performance metrics.
   * @returns Array of performance metrics
   */
  export function getMetrics(): readonly CachePerformanceMetrics[] {
    return [...performanceMetrics];
  }

  /**
   * Get metrics for specific operation.
   * @param operation - Operation name
   * @returns Array of matching metrics
   */
  export function getMetricsForOperation(operation: string): CachePerformanceMetrics[] {
    return performanceMetrics.filter((m) => m.operation === operation);
  }

  /**
   * Get average duration for operation.
   * @param operation - Operation name
   * @returns Average duration in ms, or null if no data
   */
  export function getAverageDuration(operation: string): number | null {
    const metrics = getMetricsForOperation(operation);
    if (metrics.length === 0) return null;

    const total = metrics.reduce((sum, m) => sum + m.duration, 0);
    return total / metrics.length;
  }

  /**
   * Log cache access (hit or miss) for analysis.
   * Tracks hit rates and performance per operation.
   *
   * @param operation - Operation name (e.g., 'image-cache', 'pre-render-cache')
   * @param hit - Whether this was a cache hit
   * @param durationMs - Duration of the operation in milliseconds
   */
  export function logAccess(operation: string, hit: boolean, durationMs: number): void {
    // Get or create tracker for this operation
    let tracker = accessTrackers.get(operation);
    if (!tracker) {
      tracker = { hits: 0, misses: 0, durations: [] };
      accessTrackers.set(operation, tracker);
    }

    // Update hit/miss count
    if (hit) {
      tracker.hits++;
    } else {
      tracker.misses++;
    }

    // Track duration (keep last 100 for percentile calculations)
    tracker.durations.push(durationMs);
    if (tracker.durations.length > maxMetricsHistory) {
      tracker.durations.shift();
    }

    // Log at trace level for detailed debugging
    trace(`Cache access: ${operation}`, {
      hit,
      duration: `${durationMs.toFixed(2)}ms`,
      hitRate: `${((tracker.hits / (tracker.hits + tracker.misses)) * 100).toFixed(1)}%`,
    });
  }

  /**
   * Get aggregated metrics analysis for an operation.
   * Calculates percentiles, hit rates, and performance stats.
   *
   * @param operation - Operation name
   * @returns Aggregated metrics or null if no data
   */
  export function getMetricsAnalysis(operation: string): CacheMetrics | null {
    const tracker = accessTrackers.get(operation);
    if (!tracker || tracker.durations.length === 0) {
      return null;
    }

    const totalCount = tracker.hits + tracker.misses;
    const hitRate = totalCount > 0 ? tracker.hits / totalCount : 0;

    // Sort durations for percentile calculations
    const sortedDurations = [...tracker.durations].sort((a, b) => a - b);

    // Calculate percentiles
    const p50Index = Math.floor(sortedDurations.length * 0.5);
    const p95Index = Math.floor(sortedDurations.length * 0.95);
    const p99Index = Math.floor(sortedDurations.length * 0.99);

    const p50Duration = sortedDurations[p50Index] || 0;
    const p95Duration = sortedDurations[p95Index] || 0;
    const p99Duration = sortedDurations[p99Index] || 0;

    // Calculate average
    const totalDuration = sortedDurations.reduce((sum, d) => sum + d, 0);
    const avgDuration = totalDuration / sortedDurations.length;

    return {
      operation,
      hitCount: tracker.hits,
      missCount: tracker.misses,
      totalCount,
      hitRate,
      avgDuration,
      p50Duration,
      p95Duration,
      p99Duration,
      minDuration: sortedDurations[0] || 0,
      maxDuration: sortedDurations[sortedDurations.length - 1] || 0,
      durations: [...tracker.durations],
    };
  }

  // Helper functions to reduce complexity in getRecommendations
  function analyzeHitRate(metrics: CacheMetrics, operation: string): CacheRecommendation[] {
    const recs: CacheRecommendation[] = [];
    if (metrics.hitRate < 0.5) {
      recs.push({
        severity: 'critical',
        category: 'hit-rate',
        message: `${operation}: Very low hit rate (${(metrics.hitRate * 100).toFixed(1)}%)`,
        details: `Only ${metrics.hitCount} hits out of ${metrics.totalCount} accesses`,
        suggestedAction: 'Consider increasing cache size or reviewing cache key strategy',
      });
    } else if (metrics.hitRate < 0.7) {
      recs.push({
        severity: 'warning',
        category: 'hit-rate',
        message: `${operation}: Suboptimal hit rate (${(metrics.hitRate * 100).toFixed(1)}%)`,
        details: `${metrics.hitCount} hits, ${metrics.missCount} misses`,
        suggestedAction: 'Cache size may be too small for current workload',
      });
    }
    return recs;
  }

  function analyzePerformance(metrics: CacheMetrics, operation: string): CacheRecommendation[] {
    const recs: CacheRecommendation[] = [];
    if (metrics.p95Duration > 500) {
      recs.push({
        severity: 'critical',
        category: 'performance',
        message: `${operation}: Slow performance (P95: ${metrics.p95Duration.toFixed(1)}ms)`,
        details: `95% of operations take longer than 500ms`,
        suggestedAction: 'Investigate slow operations, consider background preloading',
      });
    } else if (metrics.p95Duration > 100) {
      recs.push({
        severity: 'warning',
        category: 'performance',
        message: `${operation}: Moderate slowness (P95: ${metrics.p95Duration.toFixed(1)}ms)`,
        details: `Some operations are slower than optimal`,
        suggestedAction: 'Consider optimizing cache lookup or prefetching strategies',
      });
    }
    return recs;
  }

  function analyzeVariability(metrics: CacheMetrics, operation: string): CacheRecommendation[] {
    const recs: CacheRecommendation[] = [];
    const variability = metrics.p50Duration > 0 ? metrics.p99Duration / metrics.p50Duration : 0;
    if (variability > 10) {
      recs.push({
        severity: 'warning',
        category: 'performance',
        message: `${operation}: Inconsistent performance`,
        details: `P99 (${metrics.p99Duration.toFixed(1)}ms) is ${variability.toFixed(1)}x slower than P50 (${metrics.p50Duration.toFixed(1)}ms)`,
        suggestedAction: 'Some operations are outliers - investigate cache misses or slow paths',
      });
    }
    return recs;
  }

  function analyzeEvictions(): CacheRecommendation[] {
    const recs: CacheRecommendation[] = [];
    const evictionMetrics = performanceMetrics.filter(
      (m) => m.metadata && (m.metadata.reason === 'lru' || m.metadata.reason === 'ttl')
    );
    if (evictionMetrics.length > 20) {
      recs.push({
        severity: 'warning',
        category: 'eviction',
        message: `High eviction rate detected (${evictionMetrics.length} evictions)`,
        details: 'Frequent evictions may indicate cache is too small',
        suggestedAction: 'Increase maxSize or reduce TTL to keep more entries cached',
      });
    }
    return recs;
  }

  /**
   * Generate smart recommendations based on cache performance analysis.
   * Analyzes all tracked operations and suggests optimizations.
   *
   * @returns Array of recommendations sorted by severity
   */
  export function getRecommendations(): CacheRecommendation[] {
    const recommendations: CacheRecommendation[] = [];

    // Analyze each tracked operation
    for (const [operation] of accessTrackers.entries()) {
      const metrics = getMetricsAnalysis(operation);
      if (!metrics) continue;

      recommendations.push(...analyzeHitRate(metrics, operation));
      recommendations.push(...analyzePerformance(metrics, operation));
      recommendations.push(...analyzeVariability(metrics, operation));
    }

    recommendations.push(...analyzeEvictions());

    // If no issues found, add positive feedback
    if (recommendations.length === 0 && accessTrackers.size > 0) {
      recommendations.push({
        severity: 'info',
        category: 'hit-rate',
        message: '✓ All cache layers performing well',
        details: 'No performance issues detected',
        suggestedAction: 'Continue monitoring for changes in usage patterns',
      });
    }

    // Sort by severity (critical first, then warning, then info)
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return recommendations.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  }

  /**
   * Clear all performance metrics and access tracking.
   */
  export function clearMetrics(): void {
    performanceMetrics = [];
    accessTrackers.clear();
    debug('Performance metrics and access tracking cleared');
  }

  /**
   * Export metrics as JSON string.
   * Useful for debugging and support.
   *
   * @returns JSON string of all metrics including performance analysis and recommendations
   */
  export function exportMetrics(): string {
    // Get analysis for all tracked operations
    const operationAnalysis: Record<string, CacheMetrics | null> = {};
    for (const operation of accessTrackers.keys()) {
      operationAnalysis[operation] = getMetricsAnalysis(operation);
    }

    return JSON.stringify(
      {
        logLevel: CacheLogLevel[level],
        timestamp: Date.now(),
        performanceMetrics: {
          count: performanceMetrics.length,
          recent: performanceMetrics,
        },
        accessTracking: {
          operations: Array.from(accessTrackers.keys()),
          analysis: operationAnalysis,
        },
        recommendations: getRecommendations(),
      },
      null,
      2
    );
  }

  /**
   * Log cache hit/miss ratio.
   * @param hits - Number of cache hits
   * @param misses - Number of cache misses
   */
  export function logHitRate(hits: number, misses: number): void {
    const total = hits + misses;
    if (total === 0) return;

    const hitRate = ((hits / total) * 100).toFixed(1);
    info(`Cache hit rate: ${hitRate}%`, { hits, misses, total });
  }

  /**
   * Log memory usage.
   * @param cacheName - Name of cache
   * @param used - Memory used in bytes
   * @param max - Max memory in bytes
   */
  export function logMemoryUsage(cacheName: string, used: number, max?: number): void {
    const usedMB = (used / 1024 / 1024).toFixed(2);
    const data: Record<string, string | number> = { cacheName, used: `${usedMB} MB` };

    if (max) {
      const maxMB = (max / 1024 / 1024).toFixed(2);
      const percentage = ((used / max) * 100).toFixed(1);
      data.max = `${maxMB} MB`;
      data.usage = `${percentage}%`;
    }

    debug(`Memory usage: ${cacheName}`, data);
  }

  /**
   * Log cache eviction event.
   * @param cacheName - Name of cache
   * @param key - Key being evicted
   * @param reason - Reason for eviction
   * @param size - Size of evicted entry in bytes
   * @param lastAccessed - Timestamp of last access
   * @param accessCount - Number of times entry was accessed
   */
  export function logEviction(
    cacheName: string,
    key: string,
    reason: 'lru' | 'ttl' | 'manual',
    size: number,
    lastAccessed: number,
    accessCount: number
  ): void {
    const sizeMB = (size / 1024 / 1024).toFixed(2);
    const age = Math.floor((Date.now() - lastAccessed) / 1000); // seconds

    debug(`Cache eviction: ${cacheName}`, {
      key,
      reason,
      size: `${sizeMB} MB`,
      age: `${age}s ago`,
      accessCount,
    });
  }
}

// Auto-initialize on module load
if (typeof window !== 'undefined') {
  CacheLogger.initialize();
}

// Expose to window for DevTools access
if (typeof window !== 'undefined') {
  (window as unknown as { __CacheLogger__?: typeof CacheLogger }).__CacheLogger__ = CacheLogger;
}
