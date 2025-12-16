/**
 * History Manager
 *
 * Manages undo/redo history for Studio with efficient memory management.
 * Uses serialized layer snapshots with configurable history depth.
 */

import type { Layer, ToolSettings } from '../types/index';
import { logger } from '../utils/logger.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Serialized layer data for history storage
 */
interface SerializedLayer {
  id: string;
  type: Layer['type'];
  name: string;
  visible: boolean;
  opacity: number;
  blendMode: Layer['blendMode'];
  zIndex: number;
  position: { x: number; y: number };
  rotation: number;
  scale: { x: number; y: number };
  data?: Layer['data'];
  // Canvas data as compressed data URL
  canvasData: string;
}

/**
 * History entry containing a snapshot of the entire studio state
 */
export interface HistoryEntry {
  /** Timestamp when this state was created */
  timestamp: number;
  /** Description of the action that created this state */
  action: string;
  /** Serialized layer data */
  layers: SerializedLayer[];
  /** Canvas size at this point */
  canvasSize: { width: number; height: number };
  /** Tool settings at this point (optional) */
  toolSettings?: ToolSettings;
  /** Background color */
  backgroundColor: string;
}

/**
 * History manager configuration
 */
export interface HistoryConfig {
  /** Maximum number of history entries to keep */
  maxSize: number;
  /** Compression quality for canvas snapshots (0-1) */
  compressionQuality: number;
  /** Enable debug logging */
  debug: boolean;
}

// ============================================================================
// HistoryManager
// ============================================================================

/**
 * Manages undo/redo history for Studio operations
 */
export class HistoryManager {
  private history: HistoryEntry[] = [];
  private currentIndex: number = -1;
  private config: HistoryConfig;

  constructor(config: Partial<HistoryConfig> = {}) {
    this.config = {
      maxSize: config.maxSize ?? 50,
      compressionQuality: config.compressionQuality ?? 0.8,
      debug: config.debug ?? false,
    };
  }

  // ==========================================================================
  // State Management
  // ==========================================================================

  /**
   * Push a new state to history.
   * Removes any redo history after current index.
   *
   * @param action - Description of the action
   * @param layers - Current layer state
   * @param canvasSize - Current canvas size
   * @param backgroundColor - Current background color
   * @param toolSettings - Current tool settings (optional)
   */
  async pushState(
    action: string,
    layers: Layer[],
    canvasSize: { width: number; height: number },
    backgroundColor: string,
    toolSettings?: ToolSettings
  ): Promise<void> {
    // Remove any redo history after current index
    this.history = this.history.slice(0, this.currentIndex + 1);

    // Serialize layers
    const serializedLayers = await this.serializeLayers(layers);

    // Create history entry
    const entry: HistoryEntry = {
      timestamp: Date.now(),
      action,
      layers: serializedLayers,
      canvasSize: { ...canvasSize },
      backgroundColor,
      toolSettings: toolSettings ? this.cloneToolSettings(toolSettings) : undefined,
    };

    this.history.push(entry);
    this.currentIndex++;

    // Trim old history if exceeds max size
    if (this.history.length > this.config.maxSize) {
      const removeCount = this.history.length - this.config.maxSize;
      this.history.splice(0, removeCount);
      this.currentIndex -= removeCount;
    }

    if (this.config.debug) {
      logger.debug('HistoryManager',
        `[HistoryManager] Pushed state: ${action} (${this.currentIndex + 1}/${this.history.length})`
      );
    }
  }

  /**
   * Undo to previous state
   *
   * @returns Previous state or null if can't undo
   */
  undo(): HistoryEntry | null {
    if (!this.canUndo()) {
      if (this.config.debug) {
        logger.debug('HistoryManager','[HistoryManager] Cannot undo - at oldest state');
      }
      return null;
    }

    this.currentIndex--;
    const entry = this.history[this.currentIndex];

    if (this.config.debug) {
      logger.debug('HistoryManager',
        `[HistoryManager] Undo: ${entry.action} (${this.currentIndex + 1}/${this.history.length})`
      );
    }

    return entry;
  }

  /**
   * Redo to next state
   *
   * @returns Next state or null if can't redo
   */
  redo(): HistoryEntry | null {
    if (!this.canRedo()) {
      if (this.config.debug) {
        logger.debug('HistoryManager','[HistoryManager] Cannot redo - at newest state');
      }
      return null;
    }

    this.currentIndex++;
    const entry = this.history[this.currentIndex];

    if (this.config.debug) {
      logger.debug('HistoryManager',
        `[HistoryManager] Redo: ${entry.action} (${this.currentIndex + 1}/${this.history.length})`
      );
    }

    return entry;
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.currentIndex > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  /**
   * Get current state description
   */
  getCurrentAction(): string | null {
    if (this.currentIndex < 0 || this.currentIndex >= this.history.length) {
      return null;
    }
    return this.history[this.currentIndex].action;
  }

  /**
   * Get undo action description
   */
  getUndoAction(): string | null {
    if (!this.canUndo()) return null;
    return this.history[this.currentIndex - 1].action;
  }

  /**
   * Get redo action description
   */
  getRedoAction(): string | null {
    if (!this.canRedo()) return null;
    return this.history[this.currentIndex + 1].action;
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.history = [];
    this.currentIndex = -1;

    if (this.config.debug) {
      logger.debug('HistoryManager','[HistoryManager] History cleared');
    }
  }

  /**
   * Get history statistics
   */
  getStats(): {
    totalEntries: number;
    currentIndex: number;
    canUndo: boolean;
    canRedo: boolean;
    estimatedMemoryKB: number;
  } {
    // Estimate memory usage (rough approximation)
    const estimatedMemoryKB = this.history.reduce((total, entry) => {
      // Each canvas data URL is roughly the size of the compressed image
      const layerMemory = entry.layers.reduce((sum, layer) => {
        return sum + layer.canvasData.length / 1024; // Convert to KB
      }, 0);
      return total + layerMemory;
    }, 0);

    return {
      totalEntries: this.history.length,
      currentIndex: this.currentIndex,
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      estimatedMemoryKB: Math.round(estimatedMemoryKB),
    };
  }

  // ==========================================================================
  // Serialization
  // ==========================================================================

  /**
   * Serialize layers to compact format
   */
  private async serializeLayers(layers: Layer[]): Promise<SerializedLayer[]> {
    const serialized: SerializedLayer[] = [];

    for (const layer of layers) {
      // Convert canvas to compressed data URL
      const canvasData = await this.canvasToDataUrl(layer.canvas);

      serialized.push({
        id: layer.id,
        type: layer.type,
        name: layer.name,
        visible: layer.visible,
        opacity: layer.opacity,
        blendMode: layer.blendMode,
        zIndex: layer.zIndex,
        position: { ...layer.position },
        rotation: layer.rotation,
        scale: { ...layer.scale },
        data: layer.data ? this.cloneLayerData(layer.data) : undefined,
        canvasData,
      });
    }

    return serialized;
  }

  /**
   * Deserialize layers from history entry
   */
  async deserializeLayers(serialized: SerializedLayer[]): Promise<Layer[]> {
    const layers: Layer[] = [];

    for (const s of serialized) {
      // Restore canvas from data URL
      const canvas = await this.dataUrlToCanvas(s.canvasData);

      layers.push({
        id: s.id,
        type: s.type,
        name: s.name,
        visible: s.visible,
        opacity: s.opacity,
        blendMode: s.blendMode,
        zIndex: s.zIndex,
        canvas,
        version: 0,
        position: { ...s.position },
        rotation: s.rotation,
        scale: { ...s.scale },
        data: s.data ? this.cloneLayerData(s.data) : undefined,
      });
    }

    return layers;
  }

  /**
   * Convert canvas to compressed data URL
   */
  private canvasToDataUrl(canvas: HTMLCanvasElement): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        // Use JPEG for better compression on non-transparent images
        // Fall back to PNG if canvas has transparency
        const ctx = canvas.getContext('2d');
        const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
        const hasTransparency = this.checkTransparency(imageData);

        const format = hasTransparency ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(format, this.config.compressionQuality);
        resolve(dataUrl);
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Convert data URL back to canvas
   */
  private dataUrlToCanvas(dataUrl: string): Promise<HTMLCanvasElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0);
        resolve(canvas);
      };
      img.onerror = () => reject(new Error('Failed to load image from data URL'));
      img.src = dataUrl;
    });
  }

  /**
   * Check if image data has transparency
   */
  private checkTransparency(imageData: ImageData | undefined): boolean {
    if (!imageData) return false;

    const data = imageData.data;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) {
        return true; // Found a non-opaque pixel
      }
    }
    return false;
  }

  /**
   * Deep clone layer data
   */
  private cloneLayerData(data: any): any {
    return JSON.parse(JSON.stringify(data));
  }

  /**
   * Deep clone tool settings
   */
  private cloneToolSettings(settings: ToolSettings): ToolSettings {
    return JSON.parse(JSON.stringify(settings));
  }
}

// ============================================================================
// Debounced History Push
// ============================================================================

/**
 * Create a debounced version of history push for continuous operations
 * (e.g., brush strokes, slider adjustments)
 *
 * @param historyManager - History manager instance
 * @param delay - Debounce delay in milliseconds
 * @returns Debounced push function
 */
export function createDebouncedPush(
  historyManager: HistoryManager,
  delay: number = 500
): (
  action: string,
  layers: Layer[],
  canvasSize: { width: number; height: number },
  backgroundColor: string,
  toolSettings?: ToolSettings
) => void {
  let timeoutId: number | null = null;

  return (action, layers, canvasSize, backgroundColor, toolSettings) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = window.setTimeout(() => {
      historyManager.pushState(action, layers, canvasSize, backgroundColor, toolSettings);
      timeoutId = null;
    }, delay);
  };
}
