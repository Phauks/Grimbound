/**
 * Cache Logger - Structured logging with configurable log levels and performance timing.
 * Enables debugging cache behavior and measuring performance improvements.
 */

/**
 * Log levels for cache operations.
 * Higher levels include all lower levels.
 */
export enum CacheLogLevel {
  NONE = 0,   // No logging
  ERROR = 1,  // Only errors
  WARN = 2,   // Warnings + errors
  INFO = 3,   // Info + warnings + errors
  DEBUG = 4,  // Debug + info + warnings + errors
  TRACE = 5,  // Everything including trace
}

/**
 * Performance metrics for cache operations.
 */
export interface CachePerformanceMetrics {
  operation: string
  duration: number  // milliseconds
  timestamp: number
  metadata?: Record<string, any>
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
export class CacheLogger {
  private static level: CacheLogLevel = CacheLogLevel.WARN
  private static performanceMetrics: CachePerformanceMetrics[] = []
  private static maxMetricsHistory = 100  // Keep last 100 measurements

  /**
   * Initialize logger with persisted log level from localStorage.
   */
  static initialize(): void {
    // Check localStorage for persisted log level
    const storedLevel = localStorage.getItem('cache:logLevel')
    if (storedLevel && storedLevel in CacheLogLevel) {
      this.level = CacheLogLevel[storedLevel as keyof typeof CacheLogLevel]
    }

    // Check for debug flag
    if (typeof window !== 'undefined' && (window as any).__CACHE_DEBUG__) {
      this.level = CacheLogLevel.DEBUG
    }

    this.info('CacheLogger initialized', { level: CacheLogLevel[this.level] })
  }

  /**
   * Set log level programmatically.
   * @param level - New log level
   */
  static setLevel(level: CacheLogLevel): void {
    this.level = level
    // Persist to localStorage
    localStorage.setItem('cache:logLevel', CacheLogLevel[level])
    console.info(`[Cache:INFO] Log level set to ${CacheLogLevel[level]}`)
  }

  /**
   * Get current log level.
   * @returns Current log level
   */
  static getLevel(): CacheLogLevel {
    return this.level
  }

  /**
   * Check if level is enabled.
   * @param level - Level to check
   * @returns True if level is enabled
   */
  static isLevelEnabled(level: CacheLogLevel): boolean {
    return this.level >= level
  }

  /**
   * Log trace message (most verbose).
   * @param message - Message to log
   * @param data - Optional structured data
   */
  static trace(message: string, data?: any): void {
    if (this.level >= CacheLogLevel.TRACE) {
      console.log(`[Cache:TRACE] ${message}`, data !== undefined ? data : '')
    }
  }

  /**
   * Log debug message.
   * @param message - Message to log
   * @param data - Optional structured data
   */
  static debug(message: string, data?: any): void {
    if (this.level >= CacheLogLevel.DEBUG) {
      console.log(`[Cache:DEBUG] ${message}`, data !== undefined ? data : '')
    }
  }

  /**
   * Log info message.
   * @param message - Message to log
   * @param data - Optional structured data
   */
  static info(message: string, data?: any): void {
    if (this.level >= CacheLogLevel.INFO) {
      console.info(`[Cache:INFO] ${message}`, data !== undefined ? data : '')
    }
  }

  /**
   * Log warning message.
   * @param message - Message to log
   * @param data - Optional structured data
   */
  static warn(message: string, data?: any): void {
    if (this.level >= CacheLogLevel.WARN) {
      console.warn(`[Cache:WARN] ${message}`, data !== undefined ? data : '')
    }
  }

  /**
   * Log error message.
   * @param message - Message to log
   * @param error - Optional error object or data
   */
  static error(message: string, error?: any): void {
    if (this.level >= CacheLogLevel.ERROR) {
      console.error(`[Cache:ERROR] ${message}`, error !== undefined ? error : '')
    }
  }

  /**
   * Start performance timing for an operation.
   * Uses Performance API marks.
   *
   * @param label - Unique label for this operation
   */
  static startTiming(label: string): void {
    if (typeof performance !== 'undefined') {
      performance.mark(`cache:${label}:start`)
      this.trace(`Started timing: ${label}`)
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
  static endTiming(label: string, metadata?: Record<string, any>): number | null {
    if (typeof performance === 'undefined') {
      return null
    }

    const startMark = `cache:${label}:start`
    const endMark = `cache:${label}:end`

    try {
      performance.mark(endMark)
      performance.measure(`cache:${label}`, startMark, endMark)

      const measures = performance.getEntriesByName(`cache:${label}`, 'measure')
      if (measures.length > 0) {
        const measure = measures[measures.length - 1] as PerformanceMeasure
        const duration = measure.duration

        // Store metrics
        this.recordMetrics({
          operation: label,
          duration,
          timestamp: Date.now(),
          metadata
        })

        // Log if debug enabled
        this.debug(`${label} completed`, {
          duration: `${duration.toFixed(2)}ms`,
          ...metadata
        })

        // Clean up marks and measures
        performance.clearMarks(startMark)
        performance.clearMarks(endMark)
        performance.clearMeasures(`cache:${label}`)

        return duration
      }
    } catch (error) {
      // Marks don't exist, silently fail
      this.trace(`Timing failed for: ${label}`, error)
    }

    return null
  }

  /**
   * Record performance metrics.
   * Maintains circular buffer of recent measurements.
   *
   * @param metrics - Performance metrics to record
   */
  private static recordMetrics(metrics: CachePerformanceMetrics): void {
    this.performanceMetrics.push(metrics)

    // Keep only last N metrics
    if (this.performanceMetrics.length > this.maxMetricsHistory) {
      this.performanceMetrics.shift()
    }
  }

  /**
   * Get all recorded performance metrics.
   * @returns Array of performance metrics
   */
  static getMetrics(): readonly CachePerformanceMetrics[] {
    return [...this.performanceMetrics]
  }

  /**
   * Get metrics for specific operation.
   * @param operation - Operation name
   * @returns Array of matching metrics
   */
  static getMetricsForOperation(operation: string): CachePerformanceMetrics[] {
    return this.performanceMetrics.filter(m => m.operation === operation)
  }

  /**
   * Get average duration for operation.
   * @param operation - Operation name
   * @returns Average duration in ms, or null if no data
   */
  static getAverageDuration(operation: string): number | null {
    const metrics = this.getMetricsForOperation(operation)
    if (metrics.length === 0) return null

    const total = metrics.reduce((sum, m) => sum + m.duration, 0)
    return total / metrics.length
  }

  /**
   * Clear all performance metrics.
   */
  static clearMetrics(): void {
    this.performanceMetrics = []
    this.debug('Performance metrics cleared')
  }

  /**
   * Export metrics as JSON string.
   * Useful for debugging and support.
   *
   * @returns JSON string of all metrics
   */
  static exportMetrics(): string {
    return JSON.stringify({
      logLevel: CacheLogLevel[this.level],
      metricsCount: this.performanceMetrics.length,
      metrics: this.performanceMetrics,
      timestamp: Date.now()
    }, null, 2)
  }

  /**
   * Log cache hit/miss ratio.
   * @param hits - Number of cache hits
   * @param misses - Number of cache misses
   */
  static logHitRate(hits: number, misses: number): void {
    const total = hits + misses
    if (total === 0) return

    const hitRate = (hits / total * 100).toFixed(1)
    this.info(`Cache hit rate: ${hitRate}%`, { hits, misses, total })
  }

  /**
   * Log memory usage.
   * @param cacheName - Name of cache
   * @param used - Memory used in bytes
   * @param max - Max memory in bytes
   */
  static logMemoryUsage(cacheName: string, used: number, max?: number): void {
    const usedMB = (used / 1024 / 1024).toFixed(2)
    const data: any = { cacheName, used: `${usedMB} MB` }

    if (max) {
      const maxMB = (max / 1024 / 1024).toFixed(2)
      const percentage = ((used / max) * 100).toFixed(1)
      data.max = `${maxMB} MB`
      data.usage = `${percentage}%`
    }

    this.debug(`Memory usage: ${cacheName}`, data)
  }
}

// Auto-initialize on module load
if (typeof window !== 'undefined') {
  CacheLogger.initialize()
}

// Expose to window for DevTools access
if (typeof window !== 'undefined') {
  (window as any).__CacheLogger__ = CacheLogger
}
