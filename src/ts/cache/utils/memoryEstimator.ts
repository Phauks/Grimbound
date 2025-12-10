/**
 * Memory estimation utilities for cache entries.
 * Provides rough estimates of memory usage for different value types.
 */

/**
 * Estimate the memory size of a value in bytes.
 * This is a rough estimate used for cache memory management.
 *
 * @param value - Value to estimate size for
 * @returns Estimated size in bytes
 */
export function estimateSize(value: any): number {
  // Handle null/undefined
  if (value == null) {
    return 0
  }

  // Strings: UTF-16 encoding = 2 bytes per character
  if (typeof value === 'string') {
    return value.length * 2
  }

  // Numbers: 8 bytes (64-bit float)
  if (typeof value === 'number') {
    return 8
  }

  // Booleans: 4 bytes
  if (typeof value === 'boolean') {
    return 4
  }

  // HTMLCanvasElement: width × height × 4 (RGBA bytes per pixel)
  if (value instanceof HTMLCanvasElement) {
    return value.width * value.height * 4
  }

  // HTMLImageElement: naturalWidth × naturalHeight × 4
  if (value instanceof HTMLImageElement) {
    return value.naturalWidth * value.naturalHeight * 4
  }

  // Arrays: sum of element sizes + overhead
  if (Array.isArray(value)) {
    const elementSizes = value.reduce((sum, item) => sum + estimateSize(item), 0)
    return elementSizes + (value.length * 8)  // 8 bytes overhead per element
  }

  // Objects: estimate via JSON serialization (with fallback)
  if (typeof value === 'object') {
    try {
      const jsonString = JSON.stringify(value)
      return jsonString.length * 2  // UTF-16
    } catch (error) {
      // Circular reference or non-serializable object
      // Use rough estimate: 1KB default
      return 1024
    }
  }

  // Functions: estimate small size
  if (typeof value === 'function') {
    return 100
  }

  // Default fallback
  return 1024
}

/**
 * Estimate the total memory usage of a Map of cache entries.
 *
 * @param entries - Map of cache entries
 * @returns Total estimated memory in bytes
 */
export function estimateMapMemory<V>(entries: Map<string, V>): number {
  let total = 0

  for (const [key, value] of entries) {
    // Key size (string)
    total += key.length * 2
    // Value size
    total += estimateSize(value)
    // Map overhead (approximately 32 bytes per entry)
    total += 32
  }

  return total
}

/**
 * Format bytes into human-readable string.
 *
 * @param bytes - Number of bytes
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string (e.g., "1.5 MB")
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}
