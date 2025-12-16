/**
 * Layer Manager
 *
 * Utility class for managing layer operations (create, duplicate, merge, reorder)
 */

import type {
  BlendMode,
  ImageLayerData,
  Layer,
  LayerType,
  ShapeLayerData,
  TextLayerData,
} from '../types/index.js';
import { cloneCanvas } from './canvasOperations.js';

/**
 * Layer Manager class for advanced layer operations
 */
export class LayerManager {
  /**
   * Create a new layer with default properties
   */
  createLayer(
    type: LayerType,
    name: string,
    canvas: HTMLCanvasElement,
    options: Partial<Layer> = {}
  ): Layer {
    return {
      id: this.generateLayerId(),
      type,
      name,
      visible: true,
      opacity: 1,
      blendMode: 'normal' as BlendMode,
      zIndex: 0,
      canvas,
      version: 0,
      position: { x: 0, y: 0 },
      rotation: 0,
      scale: { x: 1, y: 1 },
      ...options,
    };
  }

  /**
   * Duplicate a layer with a new ID and cloned canvas
   */
  duplicateLayer(layer: Layer): Layer {
    // Clone the canvas
    const clonedCanvas = cloneCanvas(layer.canvas);

    // Deep clone the layer data based on type
    let clonedData: ImageLayerData | TextLayerData | ShapeLayerData | undefined;

    if (layer.type === 'image' && layer.data) {
      const imageData = layer.data as ImageLayerData;
      clonedData = {
        originalUrl: imageData.originalUrl,
        originalBlob: imageData.originalBlob,
        filters: [...imageData.filters],
      } as ImageLayerData;
    } else if (layer.type === 'text' && layer.data) {
      clonedData = { ...layer.data } as TextLayerData;
    } else if (layer.type === 'shape' && layer.data) {
      clonedData = { ...layer.data } as ShapeLayerData;
    }

    return {
      ...layer,
      id: this.generateLayerId(),
      name: `${layer.name} copy`,
      canvas: clonedCanvas,
      data: clonedData,
    };
  }

  /**
   * Merge a layer down into the layer below it
   * Returns the new merged layer and updated layers array
   */
  mergeLayersDown(
    targetLayerId: string,
    layers: Layer[]
  ): { mergedLayer: Layer; updatedLayers: Layer[] } {
    const targetIndex = layers.findIndex((l) => l.id === targetLayerId);

    if (targetIndex === -1) {
      throw new Error('Target layer not found');
    }

    if (targetIndex === 0) {
      throw new Error('Cannot merge down bottom layer');
    }

    const upperLayer = layers[targetIndex];
    const lowerLayer = layers[targetIndex - 1];

    // Create merged canvas
    const mergedCanvas = this.compositeTwoLayers(lowerLayer, upperLayer);

    // Create merged layer (inherits properties from lower layer)
    const mergedLayer: Layer = {
      ...lowerLayer,
      id: this.generateLayerId(),
      name: `${lowerLayer.name} + ${upperLayer.name}`,
      canvas: mergedCanvas,
    };

    // Remove both layers and insert merged layer
    const updatedLayers = [
      ...layers.slice(0, targetIndex - 1),
      mergedLayer,
      ...layers.slice(targetIndex + 1),
    ];

    return { mergedLayer, updatedLayers };
  }

  /**
   * Flatten all layers into a single layer
   */
  flattenAllLayers(layers: Layer[]): Layer {
    if (layers.length === 0) {
      throw new Error('No layers to flatten');
    }

    if (layers.length === 1) {
      return layers[0];
    }

    // Sort layers by zIndex
    const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex);

    // Get canvas size from first layer
    const canvasWidth = sortedLayers[0].canvas.width;
    const canvasHeight = sortedLayers[0].canvas.height;

    // Create composite canvas
    const flatCanvas = document.createElement('canvas');
    flatCanvas.width = canvasWidth;
    flatCanvas.height = canvasHeight;
    const ctx = flatCanvas.getContext('2d')!;

    // Composite all layers
    for (const layer of sortedLayers) {
      if (!layer.visible) continue;

      ctx.save();
      ctx.globalAlpha = layer.opacity;
      ctx.globalCompositeOperation = this.blendModeToCompositeOp(layer.blendMode);

      // Apply transformations
      ctx.translate(layer.position.x, layer.position.y);
      ctx.rotate((layer.rotation * Math.PI) / 180);
      ctx.scale(layer.scale.x, layer.scale.y);

      ctx.drawImage(layer.canvas, 0, 0);
      ctx.restore();
    }

    return this.createLayer('image', 'Flattened', flatCanvas);
  }

  /**
   * Move layer up one position in z-index
   */
  moveLayerUp(layerId: string, layers: Layer[]): Layer[] {
    const index = layers.findIndex((l) => l.id === layerId);

    if (index === -1 || index === layers.length - 1) {
      return layers; // Already at top or not found
    }

    return this.swapLayers(layers, index, index + 1);
  }

  /**
   * Move layer down one position in z-index
   */
  moveLayerDown(layerId: string, layers: Layer[]): Layer[] {
    const index = layers.findIndex((l) => l.id === layerId);

    if (index === -1 || index === 0) {
      return layers; // Already at bottom or not found
    }

    return this.swapLayers(layers, index, index - 1);
  }

  /**
   * Move layer to top of stack
   */
  moveLayerToTop(layerId: string, layers: Layer[]): Layer[] {
    const index = layers.findIndex((l) => l.id === layerId);

    if (index === -1 || index === layers.length - 1) {
      return layers;
    }

    const layer = layers[index];
    return [...layers.slice(0, index), ...layers.slice(index + 1), layer];
  }

  /**
   * Move layer to bottom of stack
   */
  moveLayerToBottom(layerId: string, layers: Layer[]): Layer[] {
    const index = layers.findIndex((l) => l.id === layerId);

    if (index === -1 || index === 0) {
      return layers;
    }

    const layer = layers[index];
    return [layer, ...layers.slice(0, index), ...layers.slice(index + 1)];
  }

  /**
   * Reorder layers array (for drag-and-drop)
   */
  reorderLayers(layers: Layer[], fromIndex: number, toIndex: number): Layer[] {
    if (fromIndex === toIndex) {
      return layers;
    }

    const result = [...layers];
    const [removed] = result.splice(fromIndex, 1);
    result.splice(toIndex, 0, removed);

    // Update z-indices to match new order
    return result.map((layer, index) => ({
      ...layer,
      zIndex: index,
    }));
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Generate a unique layer ID
   */
  private generateLayerId(): string {
    return `layer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Swap two layers in the array
   */
  private swapLayers(layers: Layer[], indexA: number, indexB: number): Layer[] {
    const result = [...layers];
    [result[indexA], result[indexB]] = [result[indexB], result[indexA]];

    // Update z-indices
    return result.map((layer, index) => ({
      ...layer,
      zIndex: index,
    }));
  }

  /**
   * Composite two layers (used for merge down)
   */
  private compositeTwoLayers(lowerLayer: Layer, upperLayer: Layer): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = lowerLayer.canvas.width;
    canvas.height = lowerLayer.canvas.height;
    const ctx = canvas.getContext('2d')!;

    // Draw lower layer
    ctx.save();
    ctx.globalAlpha = lowerLayer.opacity;
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(lowerLayer.canvas, 0, 0);
    ctx.restore();

    // Draw upper layer with blend mode
    ctx.save();
    ctx.globalAlpha = upperLayer.opacity;
    ctx.globalCompositeOperation = this.blendModeToCompositeOp(upperLayer.blendMode);
    ctx.drawImage(upperLayer.canvas, 0, 0);
    ctx.restore();

    return canvas;
  }

  /**
   * Convert BlendMode to Canvas globalCompositeOperation
   */
  private blendModeToCompositeOp(blendMode: BlendMode): GlobalCompositeOperation {
    const mapping: Record<BlendMode, GlobalCompositeOperation> = {
      normal: 'source-over',
      multiply: 'multiply',
      screen: 'screen',
      overlay: 'overlay',
      darken: 'darken',
      lighten: 'lighten',
    };

    return mapping[blendMode] || 'source-over';
  }
}

/**
 * Singleton instance for convenience
 */
export const layerManager = new LayerManager();
