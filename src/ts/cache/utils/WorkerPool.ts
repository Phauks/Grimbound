/**
 * Worker Pool - Manages multiple Web Workers for concurrent task execution.
 * Provides load balancing, queuing, and automatic worker management.
 */

import { TokenGeneratorError } from '@/ts/errors.js';
import { logger } from '@/ts/utils/logger.js';
import type { WorkerResponse, WorkerTask } from '@/ts/workers/prerender-worker.js';

/**
 * Task in the queue.
 */
interface QueuedTask {
  task: WorkerTask;
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  signal?: AbortSignal;
  transfer?: Transferable[];
}

/**
 * Worker with ready state tracking.
 */
interface ManagedWorker {
  worker: Worker;
  ready: Promise<void>;
  isReady: boolean;
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
  protected workers: Worker[] = [];
  protected managedWorkers: ManagedWorker[] = [];
  protected activeWorkers = new Set<Worker>();
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
      const managed = this.createManagedWorker();
      this.managedWorkers.push(managed);
      this.workers.push(managed.worker);
    }
  }

  /**
   * Create a single worker instance.
   * @returns Worker instance
   * @deprecated Use createManagedWorker for new code
   */
  protected createWorker(): Worker {
    return this.createManagedWorker().worker;
  }

  /**
   * Create a managed worker with ready state tracking.
   * @returns ManagedWorker with worker and ready promise
   */
  protected createManagedWorker(): ManagedWorker {
    // Vite handles this worker import specially
    const worker = new Worker(new URL('../../workers/prerender-worker.ts', import.meta.url), {
      type: 'module',
    });

    // Create ready promise that resolves when worker sends READY message
    let resolveReady: () => void;
    const ready = new Promise<void>((resolve) => {
      resolveReady = resolve;
    });

    const managed: ManagedWorker = {
      worker,
      ready,
      isReady: false,
    };

    // Listen for READY message
    const readyHandler = (e: MessageEvent) => {
      if (e.data?.type === 'READY') {
        managed.isReady = true;
        resolveReady();
        worker.removeEventListener('message', readyHandler);
      }
    };
    worker.addEventListener('message', readyHandler);

    worker.onerror = (error) => {
      logger.error('WorkerPool', 'Worker error', error);
      // Remove failed worker from pool
      const index = this.workers.indexOf(worker);
      if (index !== -1) {
        this.workers.splice(index, 1);
        this.activeWorkers.delete(worker);
        // Also remove from managed workers
        const managedIndex = this.managedWorkers.findIndex((m) => m.worker === worker);
        if (managedIndex !== -1) {
          this.managedWorkers.splice(managedIndex, 1);
        }
      }

      // Try to recover by creating a new worker
      if (this.workers.length < (this.options.workerCount || 4)) {
        try {
          const newManaged = this.createManagedWorker();
          this.managedWorkers.push(newManaged);
          this.workers.push(newManaged.worker);
        } catch (err) {
          logger.error('WorkerPool', 'Failed to recover worker', err);
        }
      }
    };

    return managed;
  }

  /**
   * Execute a task on an available worker.
   * Returns a promise that resolves with the worker's response.
   *
   * @param task - Task to execute
   * @param options - Optional execution options
   * @param options.signal - AbortSignal to cancel the task
   * @param options.transfer - Transferable objects to transfer ownership (zero-copy)
   * @returns Promise resolving to task result
   */
  async execute<T = unknown>(
    task: Omit<WorkerTask, 'id'>,
    options?: { signal?: AbortSignal; transfer?: Transferable[] }
  ): Promise<T> {
    const signal = options?.signal;
    const transfer = options?.transfer;
    // Check if already aborted
    if (signal?.aborted) {
      throw new DOMException('Task aborted', 'AbortError');
    }

    // Add unique ID to task
    const fullTask: WorkerTask = {
      ...task,
      id: `task-${++this.taskCounter}-${Date.now()}`,
    };

    return new Promise<T>((resolve, reject) => {
      // Check queue size limit
      if (this.queue.length >= this.maxQueueSize) {
        reject(new TokenGeneratorError('Worker pool queue is full'));
        return;
      }

      // Set up abort listener
      const onAbort = () => {
        // Remove from queue if still queued
        const queueIndex = this.queue.findIndex((q) => q.task.id === fullTask.id);
        if (queueIndex !== -1) {
          this.queue.splice(queueIndex, 1);
          reject(new DOMException('Task aborted', 'AbortError'));
        }
        // Note: If task is already running, we can't cancel it in the worker
        // The worker will complete but the result will be ignored
      };

      if (signal) {
        signal.addEventListener('abort', onAbort, { once: true });
      }

      // Wrap resolve/reject to clean up abort listener
      const wrappedResolve = (value: T) => {
        signal?.removeEventListener('abort', onAbort);
        resolve(value);
      };

      const wrappedReject = (error: Error) => {
        signal?.removeEventListener('abort', onAbort);
        reject(error);
      };

      // Try to find available and ready worker
      const availableManaged = this.managedWorkers.find(
        (m) => m.isReady && !this.activeWorkers.has(m.worker)
      );

      if (availableManaged) {
        this.runTask(
          availableManaged.worker,
          fullTask,
          wrappedResolve,
          wrappedReject,
          signal,
          transfer
        );
      } else {
        // Check if there's an available but not-yet-ready worker
        const pendingManaged = this.managedWorkers.find((m) => !this.activeWorkers.has(m.worker));

        if (pendingManaged && !pendingManaged.isReady) {
          // Wait for worker to be ready, then run task
          pendingManaged.ready.then(() => {
            if (signal?.aborted) return; // Check if aborted while waiting
            this.runTask(
              pendingManaged.worker,
              fullTask,
              wrappedResolve,
              wrappedReject,
              signal,
              transfer
            );
          });
        } else {
          // Queue task for later
          this.queue.push({
            task: fullTask,
            resolve: wrappedResolve as (value: unknown) => void,
            reject: wrappedReject,
            signal,
            transfer,
          });
        }
      }
    });
  }

  /**
   * Run a task on a specific worker.
   * @param worker - Worker to use
   * @param task - Task to execute
   * @param resolve - Promise resolve function
   * @param reject - Promise reject function
   * @param signal - Optional AbortSignal
   * @param transfer - Optional Transferable objects for zero-copy transfer
   */
  private runTask<T>(
    worker: Worker,
    task: WorkerTask,
    resolve: (value: T) => void,
    reject: (error: Error) => void,
    signal?: AbortSignal,
    transfer?: Transferable[]
  ): void {
    // Check if aborted before starting
    if (signal?.aborted) {
      reject(new DOMException('Task aborted', 'AbortError'));
      this.processQueue();
      return;
    }

    this.activeWorkers.add(worker);
    let isCompleted = false;

    // Set up one-time message handler for this task
    const handler = (e: MessageEvent<WorkerResponse>) => {
      // Check if this response matches our task
      if (e.data.id !== task.id) return;

      isCompleted = true;

      // Clean up
      worker.removeEventListener('message', handler);
      this.activeWorkers.delete(worker);

      // Check if aborted while running (result is discarded)
      if (signal?.aborted) {
        // Don't resolve/reject - already handled by abort listener
        this.processQueue();
        return;
      }

      // Handle response
      if (e.data.type === 'SUCCESS') {
        resolve(e.data.data as T);
      } else if (e.data.type === 'ERROR') {
        reject(new TokenGeneratorError(e.data.error || 'Worker task failed'));
      }

      // Process next queued task if available
      this.processQueue();
    };

    // Set up abort handler for in-flight tasks
    const onAbort = () => {
      if (!isCompleted) {
        worker.removeEventListener('message', handler);
        this.activeWorkers.delete(worker);
        reject(new DOMException('Task aborted', 'AbortError'));
        this.processQueue();
      }
    };

    if (signal) {
      signal.addEventListener('abort', onAbort, { once: true });
    }

    worker.addEventListener('message', handler);

    // Send task to worker (with optional transferables for zero-copy)
    try {
      if (transfer && transfer.length > 0) {
        worker.postMessage(task, transfer);
      } else {
        worker.postMessage(task);
      }
    } catch (error) {
      isCompleted = true;
      worker.removeEventListener('message', handler);
      signal?.removeEventListener('abort', onAbort);
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

    // Find available and ready worker
    const availableManaged = this.managedWorkers.find(
      (m) => m.isReady && !this.activeWorkers.has(m.worker)
    );
    if (!availableManaged) return;

    const queued = this.queue.shift();
    if (queued) {
      // Skip if already aborted
      if (queued.signal?.aborted) {
        queued.reject(new DOMException('Task aborted', 'AbortError'));
        // Process next task
        this.processQueue();
        return;
      }
      this.runTask(
        availableManaged.worker,
        queued.task,
        queued.resolve,
        queued.reject,
        queued.signal,
        queued.transfer
      );
    }
  }

  /**
   * Get current pool statistics.
   * @returns Pool stats
   */
  getStats() {
    const readyWorkers = this.managedWorkers.filter((m) => m.isReady).length;
    return {
      workerCount: this.workers.length,
      readyWorkers,
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
      queued.reject(new TokenGeneratorError('Worker pool terminated'));
    }
    this.queue = [];

    // Terminate all workers
    for (const worker of this.workers) {
      worker.terminate();
    }
    this.workers = [];
    this.managedWorkers = [];
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
          reject(new TokenGeneratorError('Worker pool idle timeout'));
          return;
        }

        setTimeout(checkIdle, 100);
      };

      checkIdle();
    });
  }
}
