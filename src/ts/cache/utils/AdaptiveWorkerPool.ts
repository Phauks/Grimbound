/**
 * Adaptive Worker Pool - Auto-scaling worker pool with memory pressure detection
 *
 * Extends WorkerPool with dynamic worker count adjustment based on:
 * - Memory pressure (via performance.memory API)
 * - Queue length and throughput
 * - Device capabilities (CPU cores)
 *
 * Features:
 * - Automatic scaling up when queue grows and memory allows
 * - Automatic scaling down when memory pressure high or workers idle
 * - Configurable min/max worker bounds
 * - Periodic adjustment checks
 * - Smart throttling to prevent thrashing
 *
 * @module cache/utils/AdaptiveWorkerPool
 */

import { logger } from '../../utils/logger.js';
import { WorkerPool, type WorkerPoolOptions } from './WorkerPool.js';

/**
 * Configuration for adaptive worker pool
 */
export interface AdaptiveWorkerPoolOptions extends WorkerPoolOptions {
  /** Minimum number of workers (default: 1) */
  minWorkers?: number;
  /** Maximum number of workers (default: navigator.hardwareConcurrency or 4) */
  maxWorkers?: number;
  /** Interval for checking if scaling is needed in ms (default: 5000) */
  checkInterval?: number;
  /** Memory pressure threshold to trigger scale-down (0-1, default: 0.8) */
  memoryPressureThreshold?: number;
  /** Queue length threshold to trigger scale-up (default: 10) */
  scaleUpQueueThreshold?: number;
  /** Enable auto-scaling (default: true) */
  enableAutoScaling?: boolean;
}

/**
 * Memory information (from performance.memory API)
 */
interface MemoryInfo {
  /** Total JS heap size allocated */
  totalJSHeapSize: number;
  /** Currently used JS heap size */
  usedJSHeapSize: number;
  /** Maximum JS heap size limit */
  jsHeapSizeLimit: number;
  /** Memory pressure ratio (0-1) */
  pressure: number;
}

/**
 * Adaptive Worker Pool with auto-scaling capabilities
 *
 * Automatically adjusts worker count based on memory pressure, queue length,
 * and device capabilities to optimize performance while preventing OOM errors.
 *
 * @example
 * ```typescript
 * const pool = new AdaptiveWorkerPool({
 *   minWorkers: 1,
 *   maxWorkers: 8,
 *   memoryPressureThreshold: 0.75
 * });
 *
 * // Pool automatically scales workers based on load and memory
 * const result = await pool.execute({ type: 'ENCODE_CANVAS', data: {...} });
 * ```
 */
export class AdaptiveWorkerPool extends WorkerPool {
  private readonly minWorkers: number;
  private readonly maxWorkers: number;
  private readonly checkInterval: number;
  private readonly memoryPressureThreshold: number;
  private readonly scaleUpQueueThreshold: number;
  private readonly enableAutoScaling: boolean;

  private intervalId: number | null = null;
  private currentWorkerCount: number;
  private lastScaleTime: number = 0;
  private readonly scaleThrottleMs = 3000; // Prevent rapid scaling changes

  /**
   * Create a new AdaptiveWorkerPool
   * @param options - Pool configuration options
   */
  constructor(options: AdaptiveWorkerPoolOptions = {}) {
    const maxCores = navigator.hardwareConcurrency || 4;
    const minWorkers = options.minWorkers ?? 1;
    const maxWorkers = options.maxWorkers ?? maxCores;

    // Start with half of max workers as initial count
    const initialWorkerCount = Math.max(minWorkers, Math.min(Math.floor(maxWorkers / 2), maxCores));

    // Initialize parent with initial worker count
    super({ ...options, workerCount: initialWorkerCount });

    this.minWorkers = minWorkers;
    this.maxWorkers = maxWorkers;
    this.currentWorkerCount = initialWorkerCount;
    this.checkInterval = options.checkInterval ?? 5000;
    this.memoryPressureThreshold = options.memoryPressureThreshold ?? 0.8;
    this.scaleUpQueueThreshold = options.scaleUpQueueThreshold ?? 10;
    this.enableAutoScaling = options.enableAutoScaling ?? true;

    if (this.enableAutoScaling) {
      this.startAutoScaling();
    }
  }

  /**
   * Start periodic auto-scaling checks
   */
  private startAutoScaling(): void {
    if (this.intervalId !== null) return;

    this.intervalId = window.setInterval(() => {
      this.checkAndAdjust();
    }, this.checkInterval);
  }

  /**
   * Stop periodic auto-scaling checks
   */
  private stopAutoScaling(): void {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Check conditions and adjust worker count if needed
   */
  private checkAndAdjust(): void {
    // Throttle scaling to prevent rapid changes
    const now = Date.now();
    if (now - this.lastScaleTime < this.scaleThrottleMs) {
      return;
    }

    const stats = this.getStats();
    const memory = this.getMemoryInfo();

    // Decision logic:
    // 1. Scale down if memory pressure high
    // 2. Scale down if workers idle for extended period
    // 3. Scale up if queue is growing and memory allows

    if (memory.pressure > this.memoryPressureThreshold) {
      // High memory pressure - scale down
      if (this.currentWorkerCount > this.minWorkers) {
        this.scaleDown();
        logger.debug(
          'AdaptiveWorkerPool',
          `[AdaptiveWorkerPool] Scaling down due to memory pressure: ${(memory.pressure * 100).toFixed(1)}%`
        );
      }
    } else if (stats.queuedTasks > this.scaleUpQueueThreshold && memory.pressure < 0.5) {
      // Low memory pressure + growing queue - scale up
      if (this.currentWorkerCount < this.maxWorkers) {
        this.scaleUp();
        logger.debug(
          'AdaptiveWorkerPool',
          `[AdaptiveWorkerPool] Scaling up due to queue length: ${stats.queuedTasks} tasks`
        );
      }
    } else if (stats.activeWorkers === 0 && stats.queuedTasks === 0) {
      // All idle - gradually scale down to min
      if (this.currentWorkerCount > this.minWorkers) {
        this.scaleDown();
        logger.debug('AdaptiveWorkerPool', '[AdaptiveWorkerPool] Scaling down due to idle workers');
      }
    }
  }

  /**
   * Add one worker to the pool
   */
  scaleUp(): void {
    if (this.currentWorkerCount >= this.maxWorkers) {
      return;
    }

    try {
      // Create new worker using parent's private method (via reflection workaround)
      const worker = (this as any).createWorker();
      (this as any).workers.push(worker);
      this.currentWorkerCount++;
      this.lastScaleTime = Date.now();

      logger.info('AdaptiveWorkerPool', `Scaled up to ${this.currentWorkerCount} workers`);
    } catch (error) {
      logger.error('AdaptiveWorkerPool', 'Failed to scale up', error);
    }
  }

  /**
   * Remove one worker from the pool
   */
  scaleDown(): void {
    if (this.currentWorkerCount <= this.minWorkers) {
      return;
    }

    const workers = (this as any).workers as Worker[];
    const activeWorkers = (this as any).activeWorkers as Set<Worker>;

    // Find an idle worker to terminate
    const idleWorker = workers.find((w) => !activeWorkers.has(w));
    if (!idleWorker) {
      // No idle workers available, skip scaling down
      return;
    }

    try {
      // Terminate the idle worker
      idleWorker.terminate();

      // Remove from workers array
      const index = workers.indexOf(idleWorker);
      if (index !== -1) {
        workers.splice(index, 1);
      }

      this.currentWorkerCount--;
      this.lastScaleTime = Date.now();

      logger.info('AdaptiveWorkerPool', `Scaled down to ${this.currentWorkerCount} workers`);
    } catch (error) {
      logger.error('AdaptiveWorkerPool', 'Failed to scale down', error);
    }
  }

  /**
   * Get current memory information
   * @returns Memory info with pressure calculation
   */
  getMemoryInfo(): MemoryInfo {
    // Try to use performance.memory API (Chrome/Edge)
    if ('memory' in performance && (performance as any).memory) {
      const memory = (performance as any).memory;
      const pressure = memory.usedJSHeapSize / memory.jsHeapSizeLimit;

      return {
        totalJSHeapSize: memory.totalJSHeapSize,
        usedJSHeapSize: memory.usedJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        pressure,
      };
    }

    // Fallback: estimate memory pressure from cache sizes
    // This is a rough approximation
    const estimatedPressure = this.estimateMemoryPressure();

    return {
      totalJSHeapSize: 0,
      usedJSHeapSize: 0,
      jsHeapSizeLimit: 0,
      pressure: estimatedPressure,
    };
  }

  /**
   * Estimate memory pressure when performance.memory not available
   * Uses queue length and worker count as proxies
   *
   * @returns Estimated pressure (0-1)
   */
  private estimateMemoryPressure(): number {
    const stats = this.getStats();

    // Heuristics:
    // - Many queued tasks = higher pressure
    // - Many active workers = higher pressure
    // - Very rough approximation

    const queuePressure = Math.min(stats.queuedTasks / 50, 0.5);
    const workerPressure = Math.min(stats.activeWorkers / this.maxWorkers, 0.5);

    return Math.min(queuePressure + workerPressure, 1);
  }

  /**
   * Get enhanced statistics including adaptive info
   */
  getAdaptiveStats() {
    const baseStats = super.getStats();
    const memory = this.getMemoryInfo();

    return {
      ...baseStats,
      currentWorkerCount: this.currentWorkerCount,
      minWorkers: this.minWorkers,
      maxWorkers: this.maxWorkers,
      memoryPressure: memory.pressure,
      memoryPressurePercent: `${(memory.pressure * 100).toFixed(1)}%`,
      autoScalingEnabled: this.enableAutoScaling,
      canScaleUp:
        this.currentWorkerCount < this.maxWorkers && memory.pressure < this.memoryPressureThreshold,
      canScaleDown: this.currentWorkerCount > this.minWorkers,
    };
  }

  /**
   * Manually trigger a scaling check (for testing or manual control)
   */
  triggerScaleCheck(): void {
    this.checkAndAdjust();
  }

  /**
   * Override terminate to clean up interval
   */
  override terminate(): void {
    this.stopAutoScaling();
    super.terminate();
  }
}
