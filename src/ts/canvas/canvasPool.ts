/**
 * Blood on the Clocktower Token Generator
 * Canvas Pooling System - Reuse canvas elements for better memory management
 */

/**
 * Canvas pool for efficient canvas reuse
 * Reduces memory pressure when generating many tokens
 */
export class CanvasPool {
  private available: HTMLCanvasElement[] = [];
  private inUse = new Set<HTMLCanvasElement>();
  private maxPoolSize: number;

  /**
   * Create a new canvas pool
   * @param maxPoolSize - Maximum number of canvases to keep in pool (default: 50)
   */
  constructor(maxPoolSize: number = 50) {
    this.maxPoolSize = maxPoolSize;
  }

  /**
   * Acquire a canvas from the pool or create a new one
   * @param width - Canvas width in pixels
   * @param height - Canvas height in pixels
   * @returns Canvas element ready for use
   */
  acquire(width: number, height: number): HTMLCanvasElement {
    // Look for a canvas in the pool that's large enough
    let canvas: HTMLCanvasElement | undefined;

    for (let i = 0; i < this.available.length; i++) {
      const poolCanvas = this.available[i];
      if (poolCanvas.width >= width && poolCanvas.height >= height) {
        canvas = poolCanvas;
        this.available.splice(i, 1);
        break;
      }
    }

    // If no suitable canvas found, create a new one
    if (!canvas) {
      canvas = document.createElement('canvas');
    }

    // Resize if needed
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    // Clear the canvas
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, width, height);
      // Reset transform
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    this.inUse.add(canvas);
    return canvas;
  }

  /**
   * Release a canvas back to the pool
   * @param canvas - Canvas to release
   */
  release(canvas: HTMLCanvasElement): void {
    if (!this.inUse.has(canvas)) {
      return; // Canvas not from this pool
    }

    this.inUse.delete(canvas);

    // Only add to pool if we haven't exceeded max size
    if (this.available.length < this.maxPoolSize) {
      this.available.push(canvas);
    }
    // Otherwise, let it be garbage collected
  }

  /**
   * Release all canvases currently in use
   * Useful when batch generation is complete
   */
  releaseAll(): void {
    for (const canvas of this.inUse) {
      if (this.available.length < this.maxPoolSize) {
        this.available.push(canvas);
      }
    }
    this.inUse.clear();
  }

  /**
   * Clear the pool and release all canvases
   */
  clear(): void {
    this.available = [];
    this.inUse.clear();
  }

  /**
   * Get pool statistics
   */
  getStats(): { available: number; inUse: number; total: number } {
    return {
      available: this.available.length,
      inUse: this.inUse.size,
      total: this.available.length + this.inUse.size,
    };
  }
}

// Global canvas pool instance for token generation
export const globalCanvasPool = new CanvasPool();

// Studio-specific canvas pool with larger capacity for layer management
// Studio typically maintains multiple layers simultaneously
export const studioCanvasPool = new CanvasPool(20);

export default { CanvasPool, globalCanvasPool, studioCanvasPool };
