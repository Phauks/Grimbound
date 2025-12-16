/**
 * Tokens tab pre-rendering strategy.
 * Pre-renders first N tokens as data URLs for instant tokens view display.
 */

import type {
  IPreRenderStrategy,
  PreRenderContext,
  PreRenderResult,
  ICacheStrategy
} from '../core/index.js'
import { WorkerPool } from '../utils/WorkerPool.js'
import type { EncodeCanvasTask } from '../../workers/prerender-worker.js'
import { globalImageCache } from '../../utils/imageCache.js'
import { logger } from '../../utils/logger.js'

/**
 * Configuration options for tokens pre-rendering.
 */
export interface TokensStrategyOptions {
  /** Maximum number of tokens to pre-render (default: 20) */
  maxTokens: number
  /** Maximum concurrent encoding operations (default: 5) */
  maxConcurrent: number
  /** Use Web Workers for off-thread encoding (default: true if OffscreenCanvas supported) */
  useWorkers: boolean
  /** Use requestIdleCallback for non-blocking encoding (default: true) */
  useIdleCallback: boolean
  /** PNG encoding quality 0.0-1.0 (default: 0.92) */
  encodingQuality: number
}

/**
 * Domain Service: Tokens pre-rendering strategy.
 * Pre-renders first N tokens as data URLs for instant display in tokens view.
 */
export class TokensPreRenderStrategy implements IPreRenderStrategy {
  readonly name = 'tokens'
  readonly priority = 1
  private workerPool?: WorkerPool

  constructor(
    private cache: ICacheStrategy<string, string>,  // Key: filename, Value: dataURL
    private options: TokensStrategyOptions = {
      maxTokens: 20,
      maxConcurrent: 5,
      useWorkers: typeof OffscreenCanvas !== 'undefined',  // Auto-detect support
      useIdleCallback: true,
      encodingQuality: 0.92
    }
  ) {
    // Initialize worker pool if workers are enabled
    if (this.options.useWorkers && typeof OffscreenCanvas !== 'undefined') {
      this.workerPool = new WorkerPool({
        workerCount: this.options.maxConcurrent
      })
    }
  }

  shouldTrigger(context: PreRenderContext): boolean {
    return (
      context.type === 'tokens-hover' &&
      context.tokens.length > 0
    )
  }

  async preRender(context: PreRenderContext): Promise<PreRenderResult> {
    const { tokens } = context
    const tokensToRender = tokens.slice(0, this.options.maxTokens)
    let rendered = 0
    let skipped = 0

    // Filter out already cached and invalid tokens
    const tokensToProcess = tokensToRender.filter(token => {
      if (this.cache.has(token.filename)) {
        skipped++
        return false
      }
      if (!token.canvas) {
        skipped++
        return false
      }
      return true
    })

    // Choose encoding method based on configuration
    if (this.workerPool && this.options.useWorkers) {
      // Worker-based encoding (off main thread)
      rendered = await this.encodeWithWorkers(tokensToProcess)
    } else {
      // Main thread encoding (with optional batching)
      const batches = this.chunk(tokensToProcess, this.options.maxConcurrent)

      for (const batch of batches) {
        // Encode batch concurrently using Promise.all
        const results = await Promise.allSettled(
          batch.map(async token => {
            const dataUrl = await this.encodeCanvas(token.canvas!)
            await this.cache.set(token.filename, dataUrl)
            return token.filename
          })
        )

        // Count successes and failures
        for (const result of results) {
          if (result.status === 'fulfilled') {
            rendered++
          } else {
            logger.error('TokensPreRenderStrategy', 'Failed to pre-render token', new Error(result.reason))
            skipped++
          }
        }
      }
    }

    return {
      success: true,
      rendered,
      skipped,
      metadata: {
        strategy: this.name,
        tokensProcessed: tokensToRender.length,
        totalTokens: tokens.length,
        useWorkers: this.options.useWorkers && !!this.workerPool,
        concurrency: this.options.maxConcurrent,
        cacheStats: this.cache.getStats()
      }
    }
  }

  /**
   * Encode tokens using Web Workers (off main thread).
   * Extracts ImageData and sends to workers for OffscreenCanvas encoding.
   *
   * @param tokens - Tokens to encode
   * @returns Number of successfully encoded tokens
   */
  private async encodeWithWorkers(tokens: Array<{ canvas: HTMLCanvasElement; filename: string }>): Promise<number> {
    if (!this.workerPool) return 0

    let rendered = 0

    // Process all tokens concurrently (workers handle the parallelism)
    const results = await Promise.allSettled(
      tokens.map(async token => {
        // Extract ImageData from canvas (on main thread)
        const ctx = token.canvas.getContext('2d')
        if (!ctx) {
          throw new Error('Failed to get 2d context')
        }

        const imageData = ctx.getImageData(0, 0, token.canvas.width, token.canvas.height)

        // Send to worker for encoding
        const task: EncodeCanvasTask = {
          imageData,
          width: token.canvas.width,
          height: token.canvas.height,
          quality: this.options.encodingQuality
        }

        const response = await this.workerPool!.execute<{ dataUrl: string }>({
          type: 'ENCODE_CANVAS',
          data: task
        })

        // Cache result
        await this.cache.set(token.filename, response.dataUrl)
        return token.filename
      })
    )

    // Count successes
    for (const result of results) {
      if (result.status === 'fulfilled') {
        rendered++
      } else {
        logger.error('TokensPreRenderStrategy', 'Worker encoding failed', new Error(result.reason))
      }
    }

    return rendered
  }

  /**
   * Split array into chunks of specified size.
   * @param arr - Array to chunk
   * @param size - Chunk size
   * @returns Array of chunks
   */
  private chunk<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size))
    }
    return chunks
  }

  /**
   * Preload images for tokens in gallery view during idle time.
   * Uses requestIdleCallback to avoid blocking user interactions.
   *
   * @param context - Pre-render context with tokens
   * @param onProgress - Optional progress callback (loaded, total)
   * @returns Promise that resolves when preloading completes
   */
  async preloadImages(
    context: PreRenderContext,
    onProgress?: (loaded: number, total: number) => void
  ): Promise<void> {
    const { tokens, characters } = context
    const tokensToPreload = tokens.slice(0, this.options.maxTokens)

    // Extract image URLs from tokens and characters
    const imageUrls = new Set<string>()

    // Add character images
    if (characters) {
      for (const character of characters.slice(0, this.options.maxTokens)) {
        if (character.image) {
          if (Array.isArray(character.image)) {
            character.image.forEach(url => imageUrls.add(url))
          } else {
            imageUrls.add(character.image)
          }
        }
      }
    }

    // Add background images from generation options
    if (context.generationOptions) {
      const { characterBackground, reminderBackground, logoUrl } = context.generationOptions
      if (characterBackground) imageUrls.add(characterBackground)
      if (reminderBackground) imageUrls.add(reminderBackground)
      if (logoUrl) imageUrls.add(logoUrl)
    }

    // Filter out already cached images
    const urlsToLoad = Array.from(imageUrls).filter(url => !globalImageCache.has(url))

    if (urlsToLoad.length === 0) {
      // All images already cached
      onProgress?.(0, 0)
      return
    }

    // Preload images using idle callback for non-blocking behavior
    return new Promise((resolve) => {
      const preload = async () => {
        await globalImageCache.preloadMany(urlsToLoad, false, onProgress)
        resolve()
      }

      if (this.options.useIdleCallback && 'requestIdleCallback' in window) {
        (window as any).requestIdleCallback(preload, { timeout: 2000 })
      } else {
        // Fallback: use setTimeout for non-blocking behavior
        setTimeout(preload, 0)
      }
    })
  }

  /**
   * Terminate worker pool (call when strategy is no longer needed).
   */
  destroy(): void {
    if (this.workerPool) {
      this.workerPool.terminate()
      this.workerPool = undefined
    }
  }

  /**
   * Encode canvas to data URL, optionally using idle callback.
   * @param canvas - Canvas to encode
   * @returns Data URL string
   */
  private encodeCanvas(canvas: HTMLCanvasElement): Promise<string> {
    return new Promise((resolve, reject) => {
      const encode = () => {
        try {
          const dataUrl = canvas.toDataURL('image/png', this.options.encodingQuality)
          resolve(dataUrl)
        } catch (error) {
          reject(error)
        }
      }

      if (this.options.useIdleCallback && 'requestIdleCallback' in window) {
        (window as any).requestIdleCallback(encode, { timeout: 100 })
      } else {
        setTimeout(encode, 0)
      }
    })
  }
}
