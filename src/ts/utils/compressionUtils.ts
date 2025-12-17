/**
 * Compression Utilities - Handles data compression/decompression using browser APIs
 *
 * Uses the CompressionStream API (gzip) when available, with fallback to uncompressed storage.
 * Primarily used for compressing large project.stateJson data to reduce IndexedDB storage.
 *
 * Browser Support:
 * - Chrome/Edge: 80+ (full support)
 * - Safari: 16.4+ (full support)
 * - Firefox: 113+ (full support)
 * - Fallback: Stores uncompressed for older browsers
 *
 * @module utils/compressionUtils
 */

import { logger } from './logger.js';

/**
 * Check if CompressionStream API is available
 * @returns True if compression is supported
 */
export function isCompressionSupported(): boolean {
  return typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';
}

/**
 * Compress a string using gzip compression
 *
 * @param str - String to compress
 * @returns Compressed blob, or null if compression not supported
 *
 * @example
 * ```typescript
 * const projectJson = JSON.stringify(largeProject);
 * const compressed = await compressString(projectJson);
 * if (compressed) {
 *   // Store compressed blob in IndexedDB
 *   await db.projects.put({ ...project, stateBlob: compressed });
 * }
 * ```
 */
export async function compressString(str: string): Promise<Blob | null> {
  if (!isCompressionSupported()) {
    logger.warn('compressionUtils', 'CompressionStream not supported, skipping compression');
    return null;
  }

  try {
    // Convert string to stream
    const stream = new Response(str).body;
    if (!stream) {
      throw new Error('Failed to create stream from string');
    }

    // Pipe through gzip compression
    const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));

    // Convert back to blob
    const blob = await new Response(compressedStream).blob();
    return blob;
  } catch (error) {
    logger.error('compressionUtils', 'Compression failed', error);
    return null;
  }
}

/**
 * Decompress a blob back to a string
 *
 * @param blob - Compressed blob
 * @returns Decompressed string
 *
 * @example
 * ```typescript
 * const project = await db.projects.get(projectId);
 * if (project.stateBlob) {
 *   const stateJson = await decompressBlob(project.stateBlob);
 *   const state = JSON.parse(stateJson);
 * }
 * ```
 */
export async function decompressBlob(blob: Blob): Promise<string> {
  if (!isCompressionSupported()) {
    throw new Error('DecompressionStream not supported in this browser');
  }

  try {
    // Get stream from blob
    const stream = blob.stream();

    // Pipe through gzip decompression
    const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'));

    // Convert back to string
    const text = await new Response(decompressedStream).text();
    return text;
  } catch (error) {
    logger.error('compressionUtils', 'Decompression failed', error);
    throw error;
  }
}

/**
 * Compress a JSON object to a blob
 *
 * Convenience method that combines JSON.stringify + compression
 *
 * @param obj - Object to compress
 * @returns Compressed blob, or null if compression not supported
 *
 * @example
 * ```typescript
 * const compressed = await compressJSON(projectState);
 * if (compressed) {
 *   await db.projects.put({ ...project, stateBlob: compressed });
 * } else {
 *   // Fallback to JSON string
 *   await db.projects.put({ ...project, stateJson: JSON.stringify(projectState) });
 * }
 * ```
 */
export async function compressJSON<T = unknown>(obj: T): Promise<Blob | null> {
  const json = JSON.stringify(obj);
  return compressString(json);
}

/**
 * Decompress a blob and parse as JSON
 *
 * Convenience method that combines decompression + JSON.parse
 *
 * @param blob - Compressed blob
 * @returns Parsed object
 *
 * @example
 * ```typescript
 * const project = await db.projects.get(projectId);
 * const state = await decompressJSON<ProjectState>(project.stateBlob);
 * ```
 */
export async function decompressJSON<T = unknown>(blob: Blob): Promise<T> {
  const text = await decompressBlob(blob);
  return JSON.parse(text);
}

/**
 * Calculate compression ratio for informational purposes
 *
 * @param original - Original string
 * @param compressed - Compressed blob
 * @returns Compression ratio (e.g., 0.3 means compressed to 30% of original)
 */
export function getCompressionRatio(original: string, compressed: Blob): number {
  const originalSize = new Blob([original]).size;
  const compressedSize = compressed.size;
  return compressedSize / originalSize;
}

/**
 * Format compression stats for logging/display
 *
 * @param original - Original string
 * @param compressed - Compressed blob
 * @returns Human-readable stats
 *
 * @example
 * ```typescript
 * const stats = getCompressionStats(jsonString, compressedBlob);
 * console.log(stats); // "Compressed 250 KB → 75 KB (30% of original, 70% savings)"
 * ```
 */
export function getCompressionStats(original: string, compressed: Blob): string {
  const originalSize = new Blob([original]).size;
  const compressedSize = compressed.size;
  const ratio = compressedSize / originalSize;
  const savings = 1 - ratio;

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return `Compressed ${formatBytes(originalSize)} → ${formatBytes(compressedSize)} (${(ratio * 100).toFixed(0)}% of original, ${(savings * 100).toFixed(0)}% savings)`;
}
