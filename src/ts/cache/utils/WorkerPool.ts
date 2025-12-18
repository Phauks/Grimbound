/**
 * Worker Pool - Manages multiple Web Workers for concurrent task execution.
 * Provides load balancing, queuing, and automatic worker management.
 */

import { logger } from '@/ts/utils/logger.js';
import type { WorkerResponse, WorkerTask } from '@/ts/workers/prerender-worker.js';

/**
 * Task in the queue.
 */
interface QueuedTask {
  task: WorkerTask;
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}

/**
 * Options for WorkerPool construction.
 */
export interface WorkerPoolOptions {
  /** Number of workers to create (default: navigator.hardwareConcurrency or 4) */
  workerCount?: number;
  /** Maximum tasks in queue before rejecting new tasks (default: 100) */
  maxQueueSize?: number;
}

/**
 * WorkerPool - Manages a pool of Web Workers for concurrent execution.
 *
 * Features:
 * - Automatic load balancing across workers
 * - Task queueing when all workers busy
 * - Graceful error handling and worker recovery
 * - TypeScript-safe task execution
 *
 * @example
 * const pool = new WorkerPool({ workerCount: 4 })
 * const dataUrl = await pool.execute<string>({
 *   type: 'ENCODE_CANVAS',
 *   id: 'task-1',
 *   data: { imageData, width, height }
 * })
 */
export class WorkerPool {
  private workers: Worker[] = [];
  private activeWorkers = new Set<Worker>();
  private queue: QueuedTask[] = [];
  private taskCounter = 0;
  private readonly maxQueueSize: number;

  /**
   * Create a new WorkerPool.
   * @param options - Pool configuration options
   */
  constructor(private options: WorkerPoolOptions = {}) {
    const workerCount = options.workerCount || navigator.hardwareConcurrency || 4;
    this.maxQueueSize = options.maxQueueSize || 100;

    // Create workers
    for (let i = 0; i < workerCount; i++) {
      const worker = this.createWorker();
      this.workers.push(worker);
    }
  }

  /**
   * Create a single worker instance.
   * @returns Worker instance
   */
  private createWorker(): Worker {
    // Vite handles this worker import specially
    const worker = new Worker(new URL('../../workers/prerender-worker.ts', import.meta.url), {
      type: 'module',
    });

    worker.onerror = (error) => {
      logger.error('WorkerPool', 'Worker error', error);
      // Remove failed worker from pool
      const index = this.workers.indexOf(worker);
      if (index !== -1) {
        this.workers.splice(index, 1);
        this.activeWorkers.delete(worker);
      }

      // Try to recover by creating a new worker
      if (this.workers.length < (this.options.workerCount || 4)) {
        try {
          const newWorker = this.createWorker();
          this.workers.push(newWorker);
        } catch (err) {
          logger.error('WorkerPool', 'Failed to recover worker', err);
        }
      }
    };

    return worker;
  }

  /**
   * Execute a task on an available worker.
   * Returns a promise that resolves with the worker's response.
   *
   * @param task - Task to execute
   * @returns Promise resolving to task result
   */
  async execute<T = unknown>(task: Omit<WorkerTask, 'id'>): Promise<T> {
    // Add unique ID to task
    const fullTask: WorkerTask = {
      ...task,
      id: `task-${++this.taskCounter}-${Date.now()}`,
    };

    return new Promise<T>((resolve, reject) => {
      // Check queue size limit
      if (this.queue.length >= this.maxQueueSize) {
        reject(new Error('Worker pool queue is full'));
        return;
      }

      // Try to find available worker
      const availableWorker = this.workers.find((w) => !this.activeWorkers.has(w));

      if (availableWorker) {
        this.runTask(availableWorker, fullTask, resolve, reject);
      } else {
        // Queue task for later - cast resolve since T is assignable to unknown
        this.queue.push({ task: fullTask, resolve: resolve as (value: unknown) => void, reject });
      }
    });
  }

  /**
   * Run a task on a specific worker.
   * @param worker - Worker to use
   * @param task - Task to execute
   * @param resolve - Promise resolve function
   * @param reject - Promise reject function
   */
  private runTask<T>(
    worker: Worker,
    task: WorkerTask,
    resolve: (value: T) => void,
    reject: (error: Error) => void
  ): void {
    this.activeWorkers.add(worker);

    // Set up one-time message handler for this task
    const handler = (e: MessageEvent<WorkerResponse>) => {
      // Check if this response matches our task
      if (e.data.id !== task.id) return;

      // Clean up
      worker.removeEventListener('message', handler);
      this.activeWorkers.delete(worker);

      // Handle response
      if (e.data.type === 'SUCCESS') {
        resolve(e.data.data as T);
      } else if (e.data.type === 'ERROR') {
        reject(new Error(e.data.error || 'Worker task failed'));
      }

      // Process next queued task if available
      this.processQueue();
    };

    worker.addEventListener('message', handler);

    // Send task to worker
    try {
      worker.postMessage(task);
    } catch (error) {
      worker.removeEventListener('message', handler);
      this.activeWorkers.delete(worker);
      reject(error instanceof Error ? error : new Error(String(error)));
      this.processQueue();
    }
  }

  /**
   * Process next task in queue if workers are available.
   */
  private processQueue(): void {
    if (this.queue.length === 0) return;

    const availableWorker = this.workers.find((w) => !this.activeWorkers.has(w));
    if (!availableWorker) return;

    const queued = this.queue.shift();
    if (queued) {
      this.runTask(availableWorker, queued.task, queued.resolve, queued.reject);
    }
  }

  /**
   * Get current pool statistics.
   * @returns Pool stats
   */
  getStats() {
    return {
      workerCount: this.workers.length,
      activeWorkers: this.activeWorkers.size,
      queuedTasks: this.queue.length,
      availableWorkers: this.workers.length - this.activeWorkers.size,
    };
  }

  /**
   * Terminate all workers and clear queue.
   * Call this when you're done using the pool.
   */
  terminate(): void {
    // Reject all queued tasks
    for (const queued of this.queue) {
      queued.reject(new Error('Worker pool terminated'));
    }
    this.queue = [];

    // Terminate all workers
    for (const worker of this.workers) {
      worker.terminate();
    }
    this.workers = [];
    this.activeWorkers.clear();
  }

  /**
   * Check if pool is idle (no active tasks).
   * @returns True if idle
   */
  isIdle(): boolean {
    return this.activeWorkers.size === 0 && this.queue.length === 0;
  }

  /**
   * Wait for all active tasks to complete.
   * Does not accept new tasks during wait.
   *
   * @param timeout - Maximum time to wait in ms (default: 30000)
   * @returns Promise resolving when idle or timeout
   */
  async waitForIdle(timeout: number = 30000): Promise<void> {
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const checkIdle = () => {
        if (this.isIdle()) {
          resolve();
          return;
        }

        if (Date.now() - startTime > timeout) {
          reject(new Error('Worker pool idle timeout'));
          return;
        }

        setTimeout(checkIdle, 100);
      };

      checkIdle();
    });
  }
}
